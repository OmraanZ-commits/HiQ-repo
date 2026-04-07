import uuid
from datetime import datetime, timezone
from typing import Optional, List

from server_py.db import SessionLocal, UserModel


def _row_to_dict(row: UserModel) -> dict:
    return {
        "id": str(row.id),
        "name": row.name,
        "email": row.email,
        "role": row.role,
        "businessGroup": row.business_group or "",
        "isBgLead": row.is_bg_lead,
        "isActive": row.is_active,
        "createdAt": row.created_at.date().isoformat() if row.created_at else None,
    }


def _demote_existing_lead(db, business_group: str, exclude_id: Optional[str]):
    """Set is_bg_lead=False for any current BG Lead in the given BG (excluding one user)."""
    q = db.query(UserModel).filter(
        UserModel.business_group == business_group,
        UserModel.is_bg_lead == True,
    )
    if exclude_id:
        q = q.filter(UserModel.id != uuid.UUID(exclude_id))
    for row in q.all():
        row.is_bg_lead = False


class UsersStorage:
    def get_all(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(UserModel).order_by(UserModel.created_at).all()
            return [_row_to_dict(r) for r in rows]
        finally:
            db.close()

    def get_by_id(self, user_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(UserModel).filter(UserModel.id == uuid.UUID(user_id)).first()
            return _row_to_dict(row) if row else None
        finally:
            db.close()

    def create(self, data: dict) -> dict:
        db = SessionLocal()
        try:
            if data.get("isBgLead") and data.get("businessGroup"):
                _demote_existing_lead(db, data["businessGroup"], exclude_id=None)
            row = UserModel(
                id=uuid.uuid4(),
                name=data["name"],
                email=data["email"],
                role=data["role"],
                business_group=data.get("businessGroup") or None,
                is_bg_lead=data.get("isBgLead", False),
                is_active=data.get("isActive", True),
                created_at=datetime.now(timezone.utc),
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return _row_to_dict(row)
        finally:
            db.close()

    def update(self, user_id: str, data: dict) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(UserModel).filter(UserModel.id == uuid.UUID(user_id)).first()
            if not row:
                return None

            if "name" in data:
                row.name = data["name"]
            if "email" in data:
                row.email = data["email"]
            if "role" in data:
                row.role = data["role"]
                if data["role"] != "Network Planner":
                    row.is_bg_lead = False
            if "businessGroup" in data:
                row.business_group = data["businessGroup"] or None
                row.is_bg_lead = False
            if "isBgLead" in data:
                if data["isBgLead"] and row.business_group:
                    _demote_existing_lead(db, row.business_group, exclude_id=user_id)
                row.is_bg_lead = data["isBgLead"]
            if "isActive" in data:
                row.is_active = data["isActive"]

            db.commit()
            db.refresh(row)
            return _row_to_dict(row)
        finally:
            db.close()

    def seed_users(self, seeds: List[dict]):
        db = SessionLocal()
        try:
            existing_emails = {u.email for u in db.query(UserModel.email).all()}
            added = False
            for s in seeds:
                if s["email"] in existing_emails:
                    continue
                row = UserModel(
                    id=uuid.uuid4(),
                    name=s["name"],
                    email=s["email"],
                    role=s["role"],
                    business_group=s.get("businessGroup") or None,
                    is_bg_lead=s.get("isBgLead", False),
                    is_active=s.get("isActive", True),
                    created_at=datetime.fromisoformat(s["createdAt"] + "T00:00:00+00:00"),
                )
                db.add(row)
                added = True
            if added:
                db.commit()
        finally:
            db.close()
