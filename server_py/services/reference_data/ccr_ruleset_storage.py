import uuid
from datetime import datetime, timezone
from typing import Optional, List

from server_py.db import SessionLocal, CcrAccountModel, CcrRuleModel


def _account_to_api(row: CcrAccountModel) -> dict:
    return {
        "id": str(row.id),
        "accountName": row.account_name,
        "ccrAction": row.ccr_action,
        "sbmListingBased": row.sbm_listing_based,
        "pixelRequired": row.pixel_required,
        "contentRequired": row.content_required,
        "customerUpdateTimeline": row.customer_update_timeline,
        "isActive": row.is_active,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _rule_to_api(row: CcrRuleModel) -> dict:
    return {
        "id": str(row.id),
        "accountId": str(row.account_id),
        "changeType": row.change_type,
        "eanScenario": row.ean_scenario,
        "newCicRequired": row.new_cic_required,
        "contentUpdateRequired": row.content_update_required,
        "rundown": row.rundown,
        "newPoRequired": row.new_po_required,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


class CcrRulesetStorage:

    # ── Accounts ─────────────────────────────────────────────────

    def get_all_accounts(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(CcrAccountModel).order_by(CcrAccountModel.account_name).all()
            return [_account_to_api(r) for r in rows]
        finally:
            db.close()

    def get_account_by_id(self, account_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrAccountModel).filter(CcrAccountModel.id == account_id).first()
            return _account_to_api(row) if row else None
        finally:
            db.close()

    def create_account(self, data: dict) -> dict:
        db = SessionLocal()
        try:
            entry = CcrAccountModel(
                id=uuid.uuid4(),
                account_name=data["accountName"],
                ccr_action=data["ccrAction"],
                sbm_listing_based=data["sbmListingBased"],
                pixel_required=data.get("pixelRequired", "N"),
                content_required=data.get("contentRequired", "N"),
                customer_update_timeline=data.get("customerUpdateTimeline"),
                is_active=data.get("isActive", True),
                created_at=datetime.now(timezone.utc),
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return _account_to_api(entry)
        finally:
            db.close()

    def update_account(self, account_id: str, data: dict) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrAccountModel).filter(CcrAccountModel.id == account_id).first()
            if not row:
                return None
            field_map = {
                "accountName": "account_name",
                "ccrAction": "ccr_action",
                "sbmListingBased": "sbm_listing_based",
                "pixelRequired": "pixel_required",
                "contentRequired": "content_required",
                "customerUpdateTimeline": "customer_update_timeline",
                "isActive": "is_active",
            }
            for api_key, db_col in field_map.items():
                if api_key in data and data[api_key] is not None:
                    setattr(row, db_col, data[api_key])
            db.commit()
            db.refresh(row)
            return _account_to_api(row)
        finally:
            db.close()

    def update_account_status(self, account_id: str, new_is_active: bool) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrAccountModel).filter(CcrAccountModel.id == account_id).first()
            if not row:
                return None
            row.is_active = new_is_active
            db.commit()
            db.refresh(row)
            return _account_to_api(row)
        finally:
            db.close()

    def seed_accounts(self, seeds: List[dict]) -> dict:
        """Seed accounts; returns {name: id} mapping for rule seeding."""
        db = SessionLocal()
        try:
            existing = {r.account_name: str(r.id) for r in db.query(CcrAccountModel).all()}
            if existing:
                return existing
            result = {}
            for s in seeds:
                entry = CcrAccountModel(
                    id=uuid.uuid4(),
                    account_name=s["accountName"],
                    ccr_action=s["ccrAction"],
                    sbm_listing_based=s["sbmListingBased"],
                    pixel_required=s.get("pixelRequired", "N"),
                    content_required=s.get("contentRequired", "N"),
                    customer_update_timeline=s.get("customerUpdateTimeline"),
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(entry)
                db.flush()
                result[s["accountName"]] = str(entry.id)
            db.commit()
            return result
        finally:
            db.close()

    # ── Rules ────────────────────────────────────────────────────

    def get_all_rules(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(CcrRuleModel).order_by(
                CcrRuleModel.account_id, CcrRuleModel.change_type, CcrRuleModel.ean_scenario
            ).all()
            return [_rule_to_api(r) for r in rows]
        finally:
            db.close()

    def get_rules_for_account(self, account_id: str) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(CcrRuleModel).filter(CcrRuleModel.account_id == account_id).all()
            return [_rule_to_api(r) for r in rows]
        finally:
            db.close()

    def get_rule_by_id(self, rule_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrRuleModel).filter(CcrRuleModel.id == rule_id).first()
            return _rule_to_api(row) if row else None
        finally:
            db.close()

    def create_rule(self, data: dict) -> dict:
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            entry = CcrRuleModel(
                id=uuid.uuid4(),
                account_id=data["accountId"],
                change_type=data["changeType"],
                ean_scenario=data["eanScenario"],
                new_cic_required=data.get("newCicRequired", "N"),
                content_update_required=data.get("contentUpdateRequired", "N"),
                rundown=data.get("rundown", "N"),
                new_po_required=data.get("newPoRequired"),
                created_at=now,
                updated_at=now,
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return _rule_to_api(entry)
        finally:
            db.close()

    def update_rule(self, rule_id: str, data: dict) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrRuleModel).filter(CcrRuleModel.id == rule_id).first()
            if not row:
                return None
            field_map = {
                "newCicRequired": "new_cic_required",
                "contentUpdateRequired": "content_update_required",
                "rundown": "rundown",
                "newPoRequired": "new_po_required",
            }
            for api_key, db_col in field_map.items():
                if api_key in data:
                    setattr(row, db_col, data[api_key])
            row.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(row)
            return _rule_to_api(row)
        finally:
            db.close()

    def seed_rules(self, seeds: List[dict]):
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            # Build lookup: (account_id, change_type, ean_scenario) → existing row
            existing: dict = {}
            for row in db.query(CcrRuleModel).all():
                key = (str(row.account_id), row.change_type, row.ean_scenario)
                existing[key] = row
            for s in seeds:
                key = (s["accountId"], s["changeType"], s["eanScenario"])
                if key in existing:
                    # Upsert: update value fields with latest seed data
                    row = existing[key]
                    row.new_cic_required = s.get("newCicRequired", "N")
                    row.content_update_required = s.get("contentUpdateRequired", "N")
                    row.rundown = s.get("rundown", "N")
                    row.new_po_required = s.get("newPoRequired")
                    row.updated_at = now
                else:
                    db.add(CcrRuleModel(
                        id=uuid.uuid4(),
                        account_id=s["accountId"],
                        change_type=s["changeType"],
                        ean_scenario=s["eanScenario"],
                        new_cic_required=s.get("newCicRequired", "N"),
                        content_update_required=s.get("contentUpdateRequired", "N"),
                        rundown=s.get("rundown", "N"),
                        new_po_required=s.get("newPoRequired"),
                        created_at=now,
                        updated_at=now,
                    ))
            db.commit()
        finally:
            db.close()
