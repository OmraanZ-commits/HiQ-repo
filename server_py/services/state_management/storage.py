import uuid
from datetime import datetime, timezone
from typing import Optional

from server_py.db import SessionLocal, EntryStatusModel, StateTransitionModel
from server_py.models import StateTransition


class StateStorage:
    def seed_statuses(self, entries: list[dict]):
        db = SessionLocal()
        try:
            count = db.query(EntryStatusModel).count()
            if count > 0:
                return
            for entry in entries:
                status_row = EntryStatusModel(
                    entry_id=entry["id"],
                    current_status=entry["status"],
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(status_row)
            db.commit()
        finally:
            db.close()

    def get_status(self, entry_id: str) -> Optional[str]:
        db = SessionLocal()
        try:
            row = db.query(EntryStatusModel).filter(
                EntryStatusModel.entry_id == entry_id
            ).first()
            if not row:
                return None
            return row.current_status
        finally:
            db.close()

    def set_status(self, entry_id: str, status: str):
        db = SessionLocal()
        try:
            row = db.query(EntryStatusModel).filter(
                EntryStatusModel.entry_id == entry_id
            ).first()
            if row:
                row.current_status = status
                row.updated_at = datetime.now(timezone.utc)
            else:
                row = EntryStatusModel(
                    entry_id=entry_id,
                    current_status=status,
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(row)
            db.commit()
        finally:
            db.close()

    def get_all_statuses(self) -> dict[str, str]:
        db = SessionLocal()
        try:
            rows = db.query(EntryStatusModel).all()
            return {str(r.entry_id): r.current_status for r in rows}
        finally:
            db.close()

    def get_history(self, entry_id: str) -> list[StateTransition]:
        db = SessionLocal()
        try:
            rows = db.query(StateTransitionModel).filter(
                StateTransitionModel.entry_id == entry_id
            ).order_by(StateTransitionModel.created_at.desc()).all()
            return [
                StateTransition(
                    id=str(r.id),
                    entryId=str(r.entry_id),
                    fromStatus=r.from_status,
                    toStatus=r.to_status,
                    transitionDate=r.transition_date or "",
                    triggeredBy=r.triggered_by,
                    metadata=r.metadata_,
                    createdAt=r.created_at.isoformat() if r.created_at else "",
                )
                for r in rows
            ]
        finally:
            db.close()

    def add_transition(
        self,
        entry_id: str,
        from_status: str,
        to_status: str,
        triggered_by: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> StateTransition:
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            transition = StateTransitionModel(
                id=uuid.uuid4(),
                entry_id=entry_id,
                from_status=from_status,
                to_status=to_status,
                transition_date=now.strftime("%Y-%m-%d"),
                triggered_by=triggered_by,
                metadata_=metadata,
                created_at=now,
            )
            db.add(transition)

            status_row = db.query(EntryStatusModel).filter(
                EntryStatusModel.entry_id == entry_id
            ).first()
            if status_row:
                status_row.current_status = to_status
                status_row.updated_at = now
            else:
                db.add(EntryStatusModel(
                    entry_id=entry_id,
                    current_status=to_status,
                    updated_at=now,
                ))

            db.commit()
            db.refresh(transition)

            return StateTransition(
                id=str(transition.id),
                entryId=str(transition.entry_id),
                fromStatus=transition.from_status,
                toStatus=transition.to_status,
                transitionDate=transition.transition_date or "",
                triggeredBy=transition.triggered_by,
                metadata=transition.metadata_,
                createdAt=transition.created_at.isoformat() if transition.created_at else "",
            )
        finally:
            db.close()
