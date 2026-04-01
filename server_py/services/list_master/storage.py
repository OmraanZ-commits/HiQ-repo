import uuid
from datetime import datetime, timezone
from typing import Optional

from server_py.db import (
    SessionLocal,
    NetworkEntryModel,
    db_row_to_api,
    api_data_to_db,
)
from server_py.models import NetworkEntry, InsertNetworkEntry, UpdateNetworkEntry


class ListMasterStorage:
    def seed_entries(self, seeds: list[InsertNetworkEntry]):
        db = SessionLocal()
        try:
            existing_cbus = {
                row.cbu_code
                for row in db.query(NetworkEntryModel.cbu_code).all()
            }
            new_entries = [s for s in seeds if s.cbuCode not in existing_cbus]
            for seed in new_entries:
                data = api_data_to_db(seed.model_dump())
                entry = NetworkEntryModel(
                    id=uuid.uuid4(),
                    created_at=datetime.now(timezone.utc),
                    **data,
                )
                db.add(entry)
            if new_entries:
                db.commit()
        finally:
            db.close()

    def get_all(self) -> list[dict]:
        db = SessionLocal()
        try:
            rows = db.query(NetworkEntryModel).order_by(NetworkEntryModel.created_at.desc()).all()
            return [db_row_to_api(r) for r in rows]
        finally:
            db.close()

    def get_by_id(self, entry_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(NetworkEntryModel).filter(
                NetworkEntryModel.id == entry_id
            ).first()
            if not row:
                return None
            return db_row_to_api(row)
        finally:
            db.close()

    def create(self, data: InsertNetworkEntry) -> dict:
        db = SessionLocal()
        try:
            db_data = api_data_to_db(data.model_dump())
            entry = NetworkEntryModel(
                id=uuid.uuid4(),
                created_at=datetime.now(timezone.utc),
                **db_data,
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return db_row_to_api(entry)
        finally:
            db.close()

    def update(self, entry_id: str, data: UpdateNetworkEntry) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(NetworkEntryModel).filter(
                NetworkEntryModel.id == entry_id
            ).first()
            if not row:
                return None
            update_fields = data.model_dump(exclude_unset=True)
            db_fields = api_data_to_db(update_fields)

            now = datetime.now(timezone.utc)

            # Auto-stamp case_config_updated_at when case_config changes
            if "case_config" in db_fields and db_fields["case_config"] != row.case_config:
                db_fields["case_config_updated_at"] = now

            # Auto-stamp price_updated_at when status transitions to "Pricing Updated"
            if db_fields.get("network_status") == "Pricing Updated" and row.network_status != "Pricing Updated":
                db_fields["price_updated_at"] = now

            for key, value in db_fields.items():
                setattr(row, key, value)
            db.commit()
            db.refresh(row)
            return db_row_to_api(row)
        finally:
            db.close()

    def delete(self, entry_id: str) -> bool:
        db = SessionLocal()
        try:
            row = db.query(NetworkEntryModel).filter(
                NetworkEntryModel.id == entry_id
            ).first()
            if not row:
                return False
            db.delete(row)
            db.commit()
            return True
        finally:
            db.close()
