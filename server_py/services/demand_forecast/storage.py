import uuid
from datetime import datetime, timezone
from typing import List, Optional

from server_py.db import SessionLocal, DemandForecastEntryModel


def _row_to_dict(row: DemandForecastEntryModel) -> dict:
    return {
        "id": str(row.id),
        "basepack": row.basepack,
        "depot": row.depot,
        "mocMonth": row.moc_month,
        "channelType": row.channel_type,
        "forecastChannel": row.forecast_channel,
        "subChannel": row.sub_channel,
        "qtyCases": row.qty_cases,
        "qtyRpm": row.qty_rpm,
        "qtyUnits": row.qty_units,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


class DemandForecastStorage:
    def get_by_basepack(self, basepack: str) -> List[dict]:
        db = SessionLocal()
        try:
            rows = (
                db.query(DemandForecastEntryModel)
                .filter(DemandForecastEntryModel.basepack == basepack)
                .order_by(
                    DemandForecastEntryModel.moc_month,
                    DemandForecastEntryModel.depot,
                    DemandForecastEntryModel.channel_type,
                )
                .all()
            )
            return [_row_to_dict(r) for r in rows]
        finally:
            db.close()

    def bulk_insert(self, entries: List[dict]) -> int:
        if not entries:
            return 0
        db = SessionLocal()
        try:
            count = 0
            for e in entries:
                row = DemandForecastEntryModel(
                    id=uuid.uuid4(),
                    basepack=e["basepack"],
                    depot=e["depot"],
                    moc_month=e["mocMonth"],
                    channel_type=e["channelType"],
                    forecast_channel=e.get("forecastChannel"),
                    sub_channel=e.get("subChannel"),
                    qty_cases=e.get("qtyCases", 0),
                    qty_rpm=e.get("qtyRpm", 0),
                    qty_units=e.get("qtyUnits", 0),
                    created_at=datetime.now(timezone.utc),
                )
                db.add(row)
                count += 1
            db.commit()
            return count
        finally:
            db.close()

    def has_any_data(self) -> bool:
        db = SessionLocal()
        try:
            return db.query(DemandForecastEntryModel.id).first() is not None
        finally:
            db.close()

    def delete_all(self) -> None:
        db = SessionLocal()
        try:
            db.query(DemandForecastEntryModel).delete()
            db.commit()
        finally:
            db.close()
