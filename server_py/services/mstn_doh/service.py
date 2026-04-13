from datetime import date, datetime, timezone
from typing import Optional, List

from server_py.models import (
    DohIngestRequest,
    MstnCheckRequest,
    MSTN_CHECK_STATUSES,
    SLOB_RISK_THRESHOLD_DAYS,
)
from server_py.services.mstn_doh.storage import MstnDohStorage


_MSTN_THRESHOLD = 80
_WINDOW_START_DAY = 8
_WINDOW_END_DAY = 11


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
        if self._list_storage:
            doh_map = self.storage.get_doh_map()
            entries = self._list_storage.get_all()
            for entry in entries:
                pred_code = entry.get("predecessorCode")
                succ_code = entry.get("successorCode")
                if pred_code and succ_code:
                    pred_doh = doh_map.get(pred_code)
                    succ_doh = doh_map.get(succ_code)
                    if pred_doh is not None and succ_doh is not None:
                        slob_risk = pred_doh > (succ_doh + SLOB_RISK_THRESHOLD_DAYS)
                        from server_py.models import UpdateNetworkEntry
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
