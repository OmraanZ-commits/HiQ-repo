"""
Paid Bible Storage
Handles DB queries for the Paid Bible module:
- Aggregated basepack views (from network_entries + overrides + lifecycle dates)
- Basepack lifecycle dates CRUD
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from server_py.db import (
    SessionLocal,
    NetworkEntryModel,
    BasepakStatusOverrideModel,
    BasepakLifecycleDateModel,
    db_row_to_api,
)


MSTN_CHECK_STATUSES = {
    "Stock Movement Initiated",
    "Network transition complete",
}

ACTIVE_NETWORK_STATUSES = {
    "Active",
    "FTR Approved",
    "Production Started",
    "Stock Movement Initiated",
    "Network transition complete",
}


def _derive_bp_status(cbus: list) -> str:
    """
    Replicates the deriveBpStatus() logic from paid-bible.tsx:
    Maps network entry statuses → a single Paid Bible basepack status string.
    """
    statuses = {c.get("networkStatus") for c in cbus if c.get("networkStatus")}
    if not statuses:
        return "Draft"

    if "Network transition complete" in statuses:
        return "Active Pack"
    if "Stock Movement Initiated" in statuses:
        return "Active Pack"
    if "FTR Approved" in statuses:
        return "Active Pack"
    if "Active" in statuses:
        return "Active Pack"
    if "Production Started" in statuses:
        return "Active Pack"
    return "Draft"


def _lifecycle_row_to_dict(row: BasepakLifecycleDateModel) -> dict:
    return {
        "bpCode": row.bp_code,
        "activationDate": row.activation_date,
        "inactiveDate": row.inactive_date,
        "delistDate": row.delist_date,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


class PaidBibleStorage:
    # ── Basepacks ─────────────────────────────────────────────────────────────

    def get_all_entries(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(NetworkEntryModel).order_by(NetworkEntryModel.basepack).all()
            return [db_row_to_api(r) for r in rows]
        finally:
            db.close()

    def get_bp_status_overrides(self) -> dict:
        """Returns {bp_id: status} for all active overrides."""
        db = SessionLocal()
        try:
            rows = db.query(BasepakStatusOverrideModel).filter(
                BasepakStatusOverrideModel.is_active == True
            ).all()
            return {r.bp_id: r.status for r in rows}
        finally:
            db.close()

    def get_all_lifecycle_dates(self) -> List[dict]:
        """Return all lifecycle date records as a dict keyed by bp_code."""
        db = SessionLocal()
        try:
            rows = db.query(BasepakLifecycleDateModel).all()
            return [_lifecycle_row_to_dict(r) for r in rows]
        finally:
            db.close()

    def get_lifecycle_dates_map(self) -> dict:
        """Returns {bp_code: {activationDate, inactiveDate, delistDate}}."""
        db = SessionLocal()
        try:
            rows = db.query(BasepakLifecycleDateModel).all()
            return {
                r.bp_code: {
                    "activationDate": r.activation_date,
                    "inactiveDate": r.inactive_date,
                    "delistDate": r.delist_date,
                }
                for r in rows
            }
        finally:
            db.close()

    def get_lifecycle_date(self, bp_code: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(BasepakLifecycleDateModel).filter(
                BasepakLifecycleDateModel.bp_code == bp_code
            ).first()
            return _lifecycle_row_to_dict(row) if row else None
        finally:
            db.close()

    def upsert_lifecycle_date(self, bp_code: str, activation_date: Optional[str],
                              inactive_date: Optional[str], delist_date: Optional[str]) -> dict:
        db = SessionLocal()
        try:
            row = db.query(BasepakLifecycleDateModel).filter(
                BasepakLifecycleDateModel.bp_code == bp_code
            ).first()
            now = datetime.now(timezone.utc)
            if row:
                if activation_date is not None:
                    row.activation_date = activation_date
                if inactive_date is not None:
                    row.inactive_date = inactive_date
                if delist_date is not None:
                    row.delist_date = delist_date
                row.updated_at = now
            else:
                row = BasepakLifecycleDateModel(
                    bp_code=bp_code,
                    activation_date=activation_date,
                    inactive_date=inactive_date,
                    delist_date=delist_date,
                    updated_at=now,
                )
                db.add(row)
            db.commit()
            db.refresh(row)
            return _lifecycle_row_to_dict(row)
        finally:
            db.close()
