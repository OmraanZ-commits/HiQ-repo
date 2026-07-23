from datetime import date, datetime, timezone
from typing import Optional, List

from server_py.models import (
    DohIngestRequest,
    MstnCheckRequest,
    ClearanceCheckRequest,
    MSTN_CHECK_STATUSES,
    SLOB_RISK_THRESHOLD_DAYS,
)
from server_py.services.mstn_doh.storage import MstnDohStorage


_MSTN_THRESHOLD = 80
_WINDOW_START_DAY = 8
_WINDOW_END_DAY = 11


# ── MOC helpers ──────────────────────────────────────────────────────────────
# MOC X = end-month X (1-based).  Runs from day 21 of month X-1 to day 20 of X.
# MOC 1 = Dec 21 – Jan 20,  MOC 2 = Jan 21 – Feb 20, …  MOC 12 = Nov 21 – Dec 20.

def _get_moc_for_date(d: date) -> tuple[int, date]:
    """Return (moc_number, moc_start_date) for the given date."""
    if d.day >= 21:
        # Starts this month's 21st, ends next month's 20th
        next_month_0 = d.month % 12          # 0-based index of next month
        moc = next_month_0 + 1               # 1-based MOC number
        start = date(d.year, d.month, 21)
    else:
        # Started prev month's 21st, ends this month's 20th
        moc = d.month
        if d.month == 1:
            start = date(d.year - 1, 12, 21)
        else:
            start = date(d.year, d.month - 1, 21)
    return moc, start


def _prev_moc_start(moc_start: date) -> date:
    """Return the start date of the MOC immediately before the given MOC start."""
    if moc_start.month == 1:
        return date(moc_start.year - 1, 12, 21)
    return date(moc_start.year, moc_start.month - 1, 21)


def _current_month_str() -> str:
    today = datetime.now(timezone.utc).date()
    return today.strftime("%Y-%m")


def _is_window_open() -> tuple[bool, int]:
    today = datetime.now(timezone.utc).date()
    is_open = _WINDOW_START_DAY <= today.day <= _WINDOW_END_DAY
    return is_open, today.day


class MstnDohService:
    def __init__(self, storage: MstnDohStorage):
        self.storage = storage
        self._list_storage = None  # injected after startup

    def set_list_storage(self, list_storage):
        self._list_storage = list_storage

    # ── DOH ─────────────────────────────────────────────────────

    def ingest_doh(self, req: DohIngestRequest) -> dict:
        try:
            snapshot_date = date.fromisoformat(req.snapshotDate)
        except ValueError:
            raise ValueError(f"Invalid snapshotDate: {req.snapshotDate}. Expected ISO format YYYY-MM-DD.")

        items = [item.model_dump() for item in req.items]
        count = self.storage.ingest_doh(snapshot_date, items)

        # After ingestion, recompute slob_risk for all network entries that have
        # predecessor/successor codes in this snapshot.
        # SLOB risk is only applicable once the CBU has reached
        # "Network transition complete" status; for all other statuses the flag
        # is explicitly cleared so stale values don't persist.
        if self._list_storage:
            doh_map = self.storage.get_doh_map()
            entries = self._list_storage.get_all()
            from server_py.models import UpdateNetworkEntry
            for entry in entries:
                pred_code = entry.get("predecessorCode")
                succ_code = entry.get("successorCode")
                if not (pred_code and succ_code):
                    continue
                network_status = entry.get("networkStatus") or ""
                if network_status != "Network transition complete":
                    # Clear any previously set SLOB risk flag
                    self._list_storage.update(
                        entry["id"],
                        UpdateNetworkEntry(slobRisk=False),
                    )
                    continue
                pred_doh = doh_map.get(pred_code)
                succ_doh = doh_map.get(succ_code)
                if pred_doh is not None and succ_doh is not None:
                    slob_risk = pred_doh > (succ_doh + SLOB_RISK_THRESHOLD_DAYS)
                    self._list_storage.update(
                        entry["id"],
                        UpdateNetworkEntry(
                            predecessorDoh=pred_doh,
                            successorDoh=succ_doh,
                            dohSnapshotDate=req.snapshotDate,
                            slobRisk=slob_risk,
                        ),
                    )

        return {"ingested": count, "snapshotDate": req.snapshotDate}

    def get_doh(self, material_code: str) -> Optional[dict]:
        return self.storage.get_latest_doh(material_code)

    # ── MSTN Check ──────────────────────────────────────────────

    def run_mstn_check(self, req: MstnCheckRequest) -> dict:
        """
        Run MSTN level check across all materials in MSTN_CHECK_STATUSES.
        Creates alert records for any material with mstnPercentage < threshold.
        """
        check_month = req.checkMonth or _current_month_str()

        if not self._list_storage:
            raise RuntimeError("List storage not injected into MstnDohService")

        entries = self._list_storage.get_all()
        alerts = []

        for entry in entries:
            ns = entry.get("networkStatus") or ""
            if ns not in MSTN_CHECK_STATUSES:
                continue

            mstn_pct = entry.get("mstnPercentage")
            if mstn_pct is None:
                continue

            if mstn_pct < _MSTN_THRESHOLD:
                alerts.append({
                    "entryId": entry["id"],
                    "cbuCode": entry.get("cbuCode"),
                    "basepakCode": entry.get("basepack"),
                    "bg": entry.get("bg"),
                    "mstnPct": mstn_pct,
                    "networkStatus": ns,
                    "alertType": "mstn-below-threshold",
                    "checkMonth": check_month,
                })

        count = self.storage.create_alerts(alerts) if alerts else 0
        return {
            "checkMonth": check_month,
            "entriesChecked": len([e for e in entries if (e.get("networkStatus") or "") in MSTN_CHECK_STATUSES]),
            "alertsCreated": count,
        }

    def get_alerts(self, check_month: Optional[str] = None,
                   alert_type: Optional[str] = None) -> List[dict]:
        return self.storage.get_active_alerts(check_month=check_month, alert_type=alert_type)

    def resolve_alert(self, alert_id: str) -> bool:
        return self.storage.resolve_alert(alert_id)

    def window_status(self) -> dict:
        is_open, current_day = _is_window_open()
        check_month = _current_month_str()
        return {
            "isOpen": is_open,
            "windowStart": _WINDOW_START_DAY,
            "windowEnd": _WINDOW_END_DAY,
            "currentDay": current_day,
            "checkMonth": check_month,
        }

    # ── Clearance Check ─────────────────────────────────────────────────────

    def clearance_check(self, req: ClearanceCheckRequest) -> dict:
        """
        Evaluate MSTN clearance for a basepack's materials.
        Returns mstnCoverage (%), criteriaMet, per-material breakdown, and
        the MOC label in which the check was initiated (new-launch CBUs only).
        """
        mats = req.materials
        total = len(mats) or 1

        def is_cleared(m) -> bool:
            return m.mstnPct is not None and m.mstnPct >= _MSTN_THRESHOLD

        cleared = sum(1 for m in mats if is_cleared(m))
        mstn_coverage = round((cleared / total) * 100)
        criteria_met = mstn_coverage >= 100

        # MOC in which the check is initiated = MOC before the network-change-date MOC
        check_moc_label = None
        first_ncd = next(
            (m.networkChangeDate for m in mats
             if m.networkChangeDate and m.typeOfNetworkCode == "NEW_LAUNCH"),
            None,
        )
        if first_ncd:
            try:
                ncd_date = date.fromisoformat(first_ncd)
                _, ncd_moc_start = _get_moc_for_date(ncd_date)
                p_start = _prev_moc_start(ncd_moc_start)
                p_moc, _ = _get_moc_for_date(p_start)
                check_moc_label = f"MOC {p_moc}"
            except (ValueError, TypeError):
                pass

        materials_out = []
        for m in mats:
            last_updated = (m.priceStart if m.priceStart and m.priceStart != "-" else "—") or "—"
            materials_out.append({
                "code": m.code,
                "description": m.description or "",
                "mstnCleared": is_cleared(m),
                "lastUpdated": last_updated,
                "mstnByDepot": m.mstnByDepot or {},
                "networkChangeDate": m.networkChangeDate,
            })

        return {
            "mstnCoverage": mstn_coverage,
            "criteriaMet": criteria_met,
            "checkMocLabel": check_moc_label,
            "materials": materials_out,
        }

    # ── Daily depot-score refresh ────────────────────────────────────────────

    def refresh_depot_scores(self) -> dict:
        """
        Trigger a daily MSTN depot-score refresh.  Delegates to storage which
        updates mstn_by_depot with a day-varying fluctuation and then additively
        merges any newly-≥80% depots into mstn_green_lock in the same transaction.
        """
        return self.storage.refresh_depot_scores()

    # ── MOC Info ────────────────────────────────────────────────────────────

    def moc_info(self, date_str: str) -> dict:
        """Return MOC number, start date, previous MOC number and its start date."""
        d = date.fromisoformat(date_str)
        moc, start = _get_moc_for_date(d)
        p_start = _prev_moc_start(start)
        p_moc, _ = _get_moc_for_date(p_start)
        return {
            "moc": moc,
            "startDate": start.isoformat(),
            "prevMoc": p_moc,
            "prevMocStart": p_start.isoformat(),
        }
