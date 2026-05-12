"""
Paid Bible Service
Business logic for the Paid Bible module:
- Aggregates network entries into basepack-level views with derived statuses
- Computes Price Inactive and SLOB Risk triggers
- Manages basepack lifecycle dates
- Provides per-basepack profile + immutable status history
"""
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional, List

from server_py.services.paid_bible.storage import PaidBibleStorage, _derive_bp_status

MSTN_CHECK_STATUSES = {
    "Stock Movement Initiated",
    "Network transition complete",
}

MSTN_THRESHOLD = 80
DOH_SLOB_THRESHOLD = 5  # days


class PaidBibleService:
    def __init__(self, storage: PaidBibleStorage, sr_service=None):
        self.storage = storage
        self._sr_service = sr_service

    def set_sr_service(self, sr_service):
        self._sr_service = sr_service

    def get_service_requests(self, sr_type=None, status=None) -> list:
        """Delegates to the ServiceRequestService for Paid Bible scoped SR listing."""
        if not self._sr_service:
            return []
        return self._sr_service.get_all(sr_type=sr_type, status=status)

    # ── Basepacks (list) ──────────────────────────────────────────────────────

    def get_basepacks(self) -> List[dict]:
        """
        Aggregate all network entries into basepack-level records.
        Each basepack contains:
        - Derived status (from CBU statuses + bp_status_overrides)
        - MSTN coverage (avg of qualifying CBUs)
        - SLOB risk flag (any CBU flagged)
        - Price inactive trigger
        - Associated CBU records
        - Lifecycle key dates
        """
        entries = self.storage.get_all_entries()
        overrides = self.storage.get_bp_status_overrides()
        dates_map = self.storage.get_lifecycle_dates_map()

        bp_groups: dict = defaultdict(list)
        for entry in entries:
            bp_code = entry.get("basepack") or entry.get("id")
            bp_groups[bp_code].append(entry)

        basepacks = []
        for bp_code, cbus in bp_groups.items():
            first = cbus[0]
            derived = _derive_bp_status(cbus)
            effective_status = overrides.get(bp_code, derived)

            qualifying = [c for c in cbus if c.get("networkStatus") in MSTN_CHECK_STATUSES]
            if qualifying:
                pcts = [c.get("mstnPercentage") or 0 for c in qualifying]
                mstn_coverage = round(sum(pcts) / len(pcts))
            else:
                mstn_coverage = None

            slob_risk = any(c.get("slobRisk") for c in cbus)
            price_inactive_trigger = any(
                c.get("networkStatus") in MSTN_CHECK_STATUSES
                and (c.get("mstnPercentage") or 0) >= MSTN_THRESHOLD
                and not c.get("priceActive")
                for c in cbus
            )

            lifecycle = dates_map.get(bp_code, {})

            basepacks.append({
                "id": bp_code,
                "basepackCode": bp_code,
                "basepackName": first.get("basepackDescription") or bp_code,
                "brand": first.get("brand"),
                "bg": first.get("bg"),
                "salesCategory": first.get("salesCategory"),
                "format": first.get("format"),
                "derivedStatus": derived,
                "effectiveStatus": effective_status,
                "hasOverride": bp_code in overrides,
                "mstnCoverage": mstn_coverage,
                "slobRisk": slob_risk,
                "priceInactiveTrigger": price_inactive_trigger,
                "activationDate": lifecycle.get("activationDate"),
                "inactiveDate": lifecycle.get("inactiveDate"),
                "delistDate": lifecycle.get("delistDate"),
                "cbuCount": len(cbus),
                "cbus": cbus,
            })

        def sort_key(b):
            order = {"Active Pack": 0, "Seasonal Pack": 1, "Draft": 2}
            return (order.get(b["effectiveStatus"], 3), b["basepackCode"])

        basepacks.sort(key=sort_key)
        return basepacks

    # ── Basepack Profile (single) ─────────────────────────────────────────────

    def get_basepack_profile(self, bp_code: str) -> Optional[dict]:
        """
        Returns a full profile for a single basepack:
        - Metadata, derived + effective status, lifecycle dates
        - All CBU records
        - All SRs ever raised against this basepack
        - Status history
        """
        cbus = self.storage.get_entries_by_bp_code(bp_code)
        if not cbus:
            return None

        overrides = self.storage.get_bp_status_overrides()
        lifecycle = self.storage.get_lifecycle_date(bp_code) or {}
        first = cbus[0]

        derived = _derive_bp_status(cbus)
        effective_status = overrides.get(bp_code, derived)

        qualifying = [c for c in cbus if c.get("networkStatus") in MSTN_CHECK_STATUSES]
        mstn_coverage = None
        if qualifying:
            pcts = [c.get("mstnPercentage") or 0 for c in qualifying]
            mstn_coverage = round(sum(pcts) / len(pcts))

        slob_risk = any(c.get("slobRisk") for c in cbus)
        price_inactive_trigger = any(
            c.get("networkStatus") in MSTN_CHECK_STATUSES
            and (c.get("mstnPercentage") or 0) >= MSTN_THRESHOLD
            and not c.get("priceActive")
            for c in cbus
        )

        # Linked SRs
        linked_srs: list = []
        if self._sr_service:
            all_srs = self._sr_service.get_all()
            linked_srs = [
                sr for sr in all_srs
                if (sr.get("basepackCode") or sr.get("basepakCode") or "") == bp_code
            ]

        return {
            "basepackCode": bp_code,
            "basepackName": first.get("basepackDescription") or bp_code,
            "brand": first.get("brand"),
            "bg": first.get("bg"),
            "salesCategory": first.get("salesCategory"),
            "format": first.get("format"),
            "networkPlanner": first.get("assignedPerson"),
            "derivedStatus": derived,
            "effectiveStatus": effective_status,
            "hasOverride": bp_code in overrides,
            "mstnCoverage": mstn_coverage,
            "slobRisk": slob_risk,
            "priceInactiveTrigger": price_inactive_trigger,
            "activationDate": lifecycle.get("activationDate"),
            "inactiveDate": lifecycle.get("inactiveDate"),
            "delistDate": lifecycle.get("delistDate"),
            "cbuCount": len(cbus),
            "cbus": cbus,
            "linkedSrs": linked_srs,
        }

    # ── Triggers ──────────────────────────────────────────────────────────────

    def get_triggers(self) -> dict:
        entries = self.storage.get_all_entries()
        price_inactive = []
        slob_risk = []

        for entry in entries:
            ns = entry.get("networkStatus")
            if ns in MSTN_CHECK_STATUSES:
                mstn = entry.get("mstnPercentage") or 0
                if mstn >= MSTN_THRESHOLD and not entry.get("priceActive"):
                    price_inactive.append({
                        "cbuId": entry.get("id"),
                        "cbuCode": entry.get("cbuCode"),
                        "materialDescription": entry.get("materialDescription"),
                        "basepackCode": entry.get("basepack"),
                        "basepackName": entry.get("basepackDescription"),
                        "brand": entry.get("brand"),
                        "bg": entry.get("bg"),
                        "networkStatus": ns,
                        "mstnPercentage": mstn,
                        "priceActive": entry.get("priceActive"),
                    })
                if entry.get("slobRisk"):
                    slob_risk.append({
                        "cbuId": entry.get("id"),
                        "cbuCode": entry.get("cbuCode"),
                        "materialDescription": entry.get("materialDescription"),
                        "basepackCode": entry.get("basepack"),
                        "basepackName": entry.get("basepackDescription"),
                        "brand": entry.get("brand"),
                        "bg": entry.get("bg"),
                        "networkStatus": ns,
                        "predecessorDoh": entry.get("predecessorDoh"),
                        "successorDoh": entry.get("successorDoh"),
                        "slobRisk": True,
                    })

        return {
            "priceInactive": price_inactive,
            "slobRisk": slob_risk,
            "priceInactiveCount": len(price_inactive),
            "slobRiskCount": len(slob_risk),
        }

    # ── MOC ───────────────────────────────────────────────────────────────────

    def get_moc(self) -> dict:
        now = datetime.now(timezone.utc)
        window_start = 1
        window_end = 7
        current_day = now.day
        check_month = now.strftime("%Y-%m")
        is_open = window_start <= current_day <= window_end

        return {
            "checkMonth": check_month,
            "isOpen": is_open,
            "windowStart": window_start,
            "windowEnd": window_end,
            "currentDay": current_day,
            "displayMonth": now.strftime("%b %Y"),
        }

    # ── Lifecycle Dates ───────────────────────────────────────────────────────

    def get_all_lifecycle_dates(self) -> List[dict]:
        return self.storage.get_all_lifecycle_dates()

    def get_lifecycle_date(self, bp_code: str) -> Optional[dict]:
        return self.storage.get_lifecycle_date(bp_code)

    def upsert_lifecycle_date(self, bp_code: str, activation_date: Optional[str] = None,
                              inactive_date: Optional[str] = None,
                              delist_date: Optional[str] = None) -> dict:
        return self.storage.upsert_lifecycle_date(
            bp_code=bp_code,
            activation_date=activation_date,
            inactive_date=inactive_date,
            delist_date=delist_date,
        )

    def apply_status_change_dates(self, bp_code: str, target_status: str, effective_date: str) -> dict:
        if target_status == "Active Pack":
            # Always overwrite — every re-activation must stamp the new date.
            return self.storage.overwrite_activation_date(bp_code, effective_date)

        inactive_date = None
        delist_date = None
        if target_status == "Inactive Pack":
            inactive_date = effective_date
        elif target_status in ("Delisted Packs", "Stock Base Delisted"):
            delist_date = effective_date

        return self.upsert_lifecycle_date(bp_code, None, inactive_date, delist_date)

    # ── Status History ────────────────────────────────────────────────────────

    def get_status_history(self, bp_code: str) -> List[dict]:
        return self.storage.get_status_history(bp_code)

    def add_status_history_entry(
        self,
        bp_code: str,
        from_status: str,
        to_status: str,
        effective_date: Optional[str] = None,
        sr_id: Optional[str] = None,
        actioned_by: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> dict:
        return self.storage.add_status_history_entry(
            bp_code=bp_code,
            from_status=from_status,
            to_status=to_status,
            effective_date=effective_date,
            sr_id=sr_id,
            actioned_by=actioned_by,
            notes=notes,
        )
