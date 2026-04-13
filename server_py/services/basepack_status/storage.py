import uuid
from datetime import datetime, timezone
from typing import Optional, List

from server_py.db import SessionLocal, BasepakStatusOverrideModel


def _row_to_dict(row: BasepakStatusOverrideModel) -> dict:
    return {
        "id": str(row.id),
        "bpId": row.bp_id,
        "srId": row.sr_id,
        "status": row.status,
        "previousStatus": row.previous_status,
        "appliedBy": row.applied_by,
        "appliedAt": row.applied_at.isoformat() if row.applied_at else None,
        "isActive": row.is_active,
    }


class BasepakStatusStorage:
    def get_all_active(self) -> dict:
        """Returns dict of bpId -> status for all active overrides."""
        db = SessionLocal()
        try:
            rows = db.query(BasepakStatusOverrideModel).filter(
                BasepakStatusOverrideModel.is_active == True
            ).all()
            return {r.bp_id: r.status for r in rows}
        finally:
            db.close()

    def get_by_bp_id(self, bp_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(BasepakStatusOverrideModel).filter(
                BasepakStatusOverrideModel.bp_id == bp_id,
                BasepakStatusOverrideModel.is_active == True,
            ).first()
            return _row_to_dict(row) if row else None
        finally:
            db.close()

    def upsert(self, data: dict) -> dict:
        """Apply a status override for a basepack; deactivates any previous override."""
        db = SessionLocal()
        try:
            existing = db.query(BasepakStatusOverrideModel).filter(
                BasepakStatusOverrideModel.bp_id == data["bpId"],
                BasepakStatusOverrideModel.is_active == True,
            ).first()
            previous_status = existing.status if existing else None
            if existing:
                existing.is_active = False

            now = datetime.now(timezone.utc)
            row = BasepakStatusOverrideModel(
                id=uuid.uuid4(),
                bp_id=data["bpId"],
                sr_id=data.get("srId"),
                status=data["status"],
                previous_status=data.get("previousStatus") or previous_status,
                applied_by=data.get("appliedBy"),
                applied_at=now,
                is_active=True,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return _row_to_dict(row)
        finally:
            db.close()

    def deactivate(self, bp_id: str) -> bool:
        """Remove (deactivate) the active override for a basepack (compensation)."""
        db = SessionLocal()
        try:
            rows = db.query(BasepakStatusOverrideModel).filter(
                BasepakStatusOverrideModel.bp_id == bp_id,
                BasepakStatusOverrideModel.is_active == True,
            ).all()
            if not rows:
                return False
            for row in rows:
                row.is_active = False
            db.commit()
            return True
        finally:
            db.close()
