import uuid
from datetime import datetime, date, timezone
from typing import Optional, List

from server_py.db import SessionLocal, DohSnapshotModel, MstnAlertModel


def _doh_row_to_dict(row: DohSnapshotModel) -> dict:
    return {
        "id": str(row.id),
        "materialCode": row.material_code,
        "dohValue": row.doh_value,
        "snapshotDate": row.snapshot_date.isoformat() if row.snapshot_date else None,
        "sourceType": row.source_type,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _alert_row_to_dict(row: MstnAlertModel) -> dict:
    return {
        "id": str(row.id),
        "entryId": row.entry_id,
        "cbuCode": row.cbu_code,
        "basepakCode": row.basepack_code,
        "bg": row.bg,
        "mstnPct": row.mstn_pct,
        "networkStatus": row.network_status,
        "alertType": row.alert_type,
        "checkMonth": row.check_month,
        "isResolved": row.is_resolved,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


class MstnDohStorage:
    def ingest_doh(self, snapshot_date: date, items: List[dict]) -> int:
        """Upsert DOH values for the given snapshot date. Returns count inserted."""
        db = SessionLocal()
        try:
            for item in items:
                existing = db.query(DohSnapshotModel).filter(
                    DohSnapshotModel.material_code == item["materialCode"],
                    DohSnapshotModel.snapshot_date == snapshot_date,
                    DohSnapshotModel.source_type == item.get("sourceType"),
                ).first()
                if existing:
                    existing.doh_value = item["dohValue"]
                else:
                    db.add(DohSnapshotModel(
                        id=uuid.uuid4(),
                        material_code=item["materialCode"],
                        doh_value=item["dohValue"],
                        snapshot_date=snapshot_date,
                        source_type=item.get("sourceType"),
                        created_at=datetime.now(timezone.utc),
                    ))
            db.commit()
            return len(items)
        finally:
            db.close()

    def get_latest_doh(self, material_code: str) -> Optional[dict]:
        """Get the most recent DOH snapshot for a material code."""
        db = SessionLocal()
        try:
            row = db.query(DohSnapshotModel).filter(
                DohSnapshotModel.material_code == material_code,
            ).order_by(DohSnapshotModel.snapshot_date.desc()).first()
            return _doh_row_to_dict(row) if row else None
        finally:
            db.close()

    def get_doh_map(self, snapshot_date: Optional[date] = None) -> dict:
        """Returns dict of materialCode -> dohValue for latest or specific date."""
        db = SessionLocal()
        try:
            q = db.query(DohSnapshotModel).order_by(
                DohSnapshotModel.material_code,
                DohSnapshotModel.source_type,
                DohSnapshotModel.snapshot_date.desc(),
            )
            if snapshot_date:
                q = q.filter(DohSnapshotModel.snapshot_date == snapshot_date)
            rows = q.all()
            # Pick the most recent row per material_code (first occurrence after desc sort)
            seen: set = set()
            result: dict = {}
            for r in rows:
                key = (r.material_code, r.source_type)
                if key not in seen:
                    seen.add(key)
                    result[r.material_code] = r.doh_value
            return result
        finally:
            db.close()

    def create_alerts(self, alerts: List[dict]) -> int:
        """Persist MSTN/SLOB alerts for a check run."""
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            for a in alerts:
                db.add(MstnAlertModel(
                    id=uuid.uuid4(),
                    entry_id=a["entryId"],
                    cbu_code=a.get("cbuCode"),
                    basepack_code=a.get("basepakCode"),
                    bg=a.get("bg"),
                    mstn_pct=a.get("mstnPct"),
                    network_status=a.get("networkStatus"),
                    alert_type=a["alertType"],
                    check_month=a.get("checkMonth"),
                    is_resolved=False,
                    created_at=now,
                ))
            db.commit()
            return len(alerts)
        finally:
            db.close()

    def get_active_alerts(self, check_month: Optional[str] = None,
                          alert_type: Optional[str] = None) -> List[dict]:
        db = SessionLocal()
        try:
            q = db.query(MstnAlertModel).filter(MstnAlertModel.is_resolved == False)
            if check_month:
                q = q.filter(MstnAlertModel.check_month == check_month)
            if alert_type:
                q = q.filter(MstnAlertModel.alert_type == alert_type)
            rows = q.order_by(MstnAlertModel.created_at.desc()).all()
            return [_alert_row_to_dict(r) for r in rows]
        finally:
            db.close()

    def resolve_alert(self, alert_id: str) -> bool:
        db = SessionLocal()
        try:
            row = db.query(MstnAlertModel).filter(
                MstnAlertModel.id == uuid.UUID(alert_id)
            ).first()
            if not row:
                return False
            row.is_resolved = True
            db.commit()
            return True
        finally:
            db.close()
