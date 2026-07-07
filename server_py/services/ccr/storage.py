import uuid
from datetime import datetime, timezone
from typing import Optional, List

from server_py.db import (
    SessionLocal,
    CcrCustomerMasterModel,
    CcrCustomerCodeMappingModel,
    CcrCicMappingModel,
    CcrRulesetModel,
    CcrLineItemModel,
    CcrAuditLogModel,
)


def _parse_dt(value) -> Optional[datetime]:
    """Safely parse an ISO datetime string or return None."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _customer_to_dict(row: CcrCustomerMasterModel) -> dict:
    return {
        "id": str(row.id),
        "customerChain": row.customer_chain,
        "coverageType": row.coverage_type,
        "behaviourType": row.behaviour_type,
        "cseId": row.cse_id,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _code_mapping_to_dict(row: CcrCustomerCodeMappingModel) -> dict:
    return {
        "id": str(row.id),
        "customerChain": row.customer_chain,
        "customerCode": row.customer_code,
        "depot": row.depot,
        "subChannel": row.sub_channel,
        "channel": row.channel,
    }


def _cic_mapping_to_dict(row: CcrCicMappingModel) -> dict:
    return {
        "id": str(row.id),
        "cbuCode": row.cbu_code,
        "basepack": row.basepack,
        "customerChain": row.customer_chain,
        "customerCode": row.customer_code,
        "cic": row.cic,
        "salesOrg": row.sales_org,
        "channel": row.channel,
        "depot": row.depot,
        "status": row.status,
        "sourcingDepot": row.sourcing_depot,
        "sourcingType": row.sourcing_type,
        "pricingStatus": row.pricing_status,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


def _ruleset_to_dict(row: CcrRulesetModel) -> dict:
    return {
        "id": str(row.id),
        "networkChangeType": row.network_change_type,
        "newCicRequired": row.new_cic_required,
        "contentUpdateRequired": row.content_update_required,
        "rundownRequired": row.rundown_required,
        "autoCcr": row.auto_ccr,
        "notes": row.notes,
    }


def _line_item_to_dict(row: CcrLineItemModel) -> dict:
    return {
        "id": str(row.id),
        "predecessorCbuCode": row.predecessor_cbu_code,
        "successorCbuCode": row.successor_cbu_code,
        "customerChain": row.customer_chain,
        "customerCode": row.customer_code,
        "cic": row.cic,
        "triggerStage": row.trigger_stage,
        "urgencyColor": row.urgency_color,
        "ccrStatus": row.ccr_status,
        "executionType": row.execution_type,
        "rulesetOutcome": row.ruleset_outcome,
        "overrides": row.overrides,
        "escalationDueAt": row.escalation_due_at.isoformat() if row.escalation_due_at else None,
        "escalatedAt": row.escalated_at.isoformat() if row.escalated_at else None,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


def _audit_log_to_dict(row: CcrAuditLogModel) -> dict:
    return {
        "id": str(row.id),
        "ccrLineItemId": str(row.ccr_line_item_id),
        "eventType": row.event_type,
        "actor": row.actor,
        "payload": row.payload,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


class CcrStorage:

    # ── Customer Master ─────────────────────────────────────────

    def get_all_customers(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(CcrCustomerMasterModel).order_by(CcrCustomerMasterModel.customer_chain).all()
            return [_customer_to_dict(r) for r in rows]
        finally:
            db.close()

    def get_customer_by_chain(self, customer_chain: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrCustomerMasterModel).filter(
                CcrCustomerMasterModel.customer_chain == customer_chain
            ).first()
            return _customer_to_dict(row) if row else None
        finally:
            db.close()

    # ── Customer Code Mapping ───────────────────────────────────

    def get_code_mappings_for_chain(self, customer_chain: str) -> List[dict]:
        db = SessionLocal()
        try:
            rows = (
                db.query(CcrCustomerCodeMappingModel)
                .filter(CcrCustomerCodeMappingModel.customer_chain == customer_chain)
                .order_by(CcrCustomerCodeMappingModel.customer_code)
                .all()
            )
            return [_code_mapping_to_dict(r) for r in rows]
        finally:
            db.close()

    # ── CIC Mapping ─────────────────────────────────────────────

    def get_cic_mappings(self, cbu_code: Optional[str] = None, customer_chain: Optional[str] = None) -> List[dict]:
        db = SessionLocal()
        try:
            q = db.query(CcrCicMappingModel)
            if cbu_code:
                q = q.filter(CcrCicMappingModel.cbu_code == cbu_code)
            if customer_chain:
                q = q.filter(CcrCicMappingModel.customer_chain == customer_chain)
            rows = q.order_by(CcrCicMappingModel.customer_chain, CcrCicMappingModel.customer_code).all()
            return [_cic_mapping_to_dict(r) for r in rows]
        finally:
            db.close()

    # ── Ruleset ─────────────────────────────────────────────────

    def get_all_ruleset(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(CcrRulesetModel).order_by(CcrRulesetModel.network_change_type).all()
            return [_ruleset_to_dict(r) for r in rows]
        finally:
            db.close()

    # ── Line Items ──────────────────────────────────────────────

    def get_line_items(
        self,
        cse_id: Optional[str] = None,
        ccr_status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        db = SessionLocal()
        try:
            q = db.query(CcrLineItemModel)
            if cse_id:
                customer_chains = (
                    db.query(CcrCustomerMasterModel.customer_chain)
                    .filter(CcrCustomerMasterModel.cse_id == cse_id)
                    .subquery()
                )
                q = q.filter(CcrLineItemModel.customer_chain.in_(customer_chains))
            if ccr_status:
                q = q.filter(CcrLineItemModel.ccr_status == ccr_status)
            total = q.count()
            rows = q.order_by(CcrLineItemModel.created_at.desc()).offset(offset).limit(limit).all()
            return {
                "total": total,
                "items": [_line_item_to_dict(r) for r in rows],
            }
        finally:
            db.close()

    def get_line_item_by_id(self, item_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrLineItemModel).filter(CcrLineItemModel.id == uuid.UUID(item_id)).first()
            if not row:
                return None
            item = _line_item_to_dict(row)
            logs = (
                db.query(CcrAuditLogModel)
                .filter(CcrAuditLogModel.ccr_line_item_id == uuid.UUID(item_id))
                .order_by(CcrAuditLogModel.created_at.asc())
                .all()
            )
            item["auditLog"] = [_audit_log_to_dict(l) for l in logs]
            return item
        finally:
            db.close()

    def update_line_item_status(self, item_id: str, data: dict) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrLineItemModel).filter(CcrLineItemModel.id == uuid.UUID(item_id)).first()
            if not row:
                return None
            if "ccrStatus" in data:
                row.ccr_status = data["ccrStatus"]
            if "triggerStage" in data:
                row.trigger_stage = data["triggerStage"]
            if "urgencyColor" in data:
                row.urgency_color = data["urgencyColor"]
            if "executionType" in data:
                row.execution_type = data["executionType"]
            if "rulesetOutcome" in data:
                row.ruleset_outcome = data["rulesetOutcome"]
            if "overrides" in data:
                row.overrides = data["overrides"]
            if "escalationDueAt" in data:
                row.escalation_due_at = _parse_dt(data["escalationDueAt"])
            if "escalatedAt" in data:
                row.escalated_at = _parse_dt(data["escalatedAt"])
            row.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(row)
            return _line_item_to_dict(row)
        finally:
            db.close()

    # ── Audit Log ───────────────────────────────────────────────

    def append_audit_log(self, item_id: str, data: dict) -> dict:
        db = SessionLocal()
        try:
            log = CcrAuditLogModel(
                id=uuid.uuid4(),
                ccr_line_item_id=uuid.UUID(item_id),
                event_type=data.get("eventType", "note"),
                actor=data.get("actor", "system"),
                payload=data.get("payload", {}),
                created_at=datetime.now(timezone.utc),
            )
            db.add(log)
            db.commit()
            return _audit_log_to_dict(log)
        finally:
            db.close()

    # ── Seed helpers ────────────────────────────────────────────

    def seed_customers(self, seeds: List[dict]) -> None:
        db = SessionLocal()
        try:
            existing = {r.customer_chain for r in db.query(CcrCustomerMasterModel.customer_chain).all()}
            for s in seeds:
                if s["customer_chain"] not in existing:
                    db.add(CcrCustomerMasterModel(
                        id=uuid.uuid4(),
                        customer_chain=s["customer_chain"],
                        coverage_type=s["coverage_type"],
                        behaviour_type=s["behaviour_type"],
                        cse_id=s.get("cse_id"),
                        created_at=datetime.now(timezone.utc),
                    ))
            db.commit()
        finally:
            db.close()

    def seed_code_mappings(self, seeds: List[dict]) -> None:
        db = SessionLocal()
        try:
            existing = {
                (r.customer_chain, r.customer_code, r.depot)
                for r in db.query(
                    CcrCustomerCodeMappingModel.customer_chain,
                    CcrCustomerCodeMappingModel.customer_code,
                    CcrCustomerCodeMappingModel.depot,
                ).all()
            }
            for s in seeds:
                key = (s["customer_chain"], s["customer_code"], s["depot"])
                if key not in existing:
                    db.add(CcrCustomerCodeMappingModel(
                        id=uuid.uuid4(),
                        customer_chain=s["customer_chain"],
                        customer_code=s["customer_code"],
                        depot=s["depot"],
                        sub_channel=s.get("sub_channel"),
                        channel=s.get("channel", "MT"),
                    ))
            db.commit()
        finally:
            db.close()

    def seed_cic_mappings(self, seeds: List[dict]) -> None:
        db = SessionLocal()
        try:
            existing = {
                (r.cbu_code, r.customer_chain, r.customer_code)
                for r in db.query(
                    CcrCicMappingModel.cbu_code,
                    CcrCicMappingModel.customer_chain,
                    CcrCicMappingModel.customer_code,
                ).all()
            }
            now = datetime.now(timezone.utc)
            for s in seeds:
                key = (s["cbu_code"], s["customer_chain"], s["customer_code"])
                if key not in existing:
                    db.add(CcrCicMappingModel(
                        id=uuid.uuid4(),
                        cbu_code=s["cbu_code"],
                        basepack=s.get("basepack"),
                        customer_chain=s["customer_chain"],
                        customer_code=s["customer_code"],
                        cic=s.get("cic"),
                        sales_org=s.get("sales_org", "1000"),
                        channel=s.get("channel", "MT"),
                        depot=s.get("depot"),
                        status=s.get("status", "Mapped"),
                        sourcing_depot=s.get("sourcing_depot"),
                        sourcing_type=s.get("sourcing_type", "Decentralized"),
                        pricing_status=s.get("pricing_status", "Available"),
                        created_at=now,
                        updated_at=now,
                    ))
            db.commit()
        finally:
            db.close()

    def seed_ruleset(self, seeds: List[dict]) -> None:
        db = SessionLocal()
        try:
            existing = {r.network_change_type for r in db.query(CcrRulesetModel.network_change_type).all()}
            for s in seeds:
                if s["network_change_type"] not in existing:
                    db.add(CcrRulesetModel(
                        id=uuid.uuid4(),
                        network_change_type=s["network_change_type"],
                        new_cic_required=s.get("new_cic_required", False),
                        content_update_required=s.get("content_update_required", False),
                        rundown_required=s.get("rundown_required", False),
                        auto_ccr=s.get("auto_ccr", False),
                        notes=s.get("notes"),
                    ))
            db.commit()
        finally:
            db.close()

    def upsert_cic_mappings(self, mappings: List[dict]) -> List[dict]:
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            results = []
            for m in mappings:
                row = (
                    db.query(CcrCicMappingModel)
                    .filter(
                        CcrCicMappingModel.cbu_code == m["cbuCode"],
                        CcrCicMappingModel.customer_chain == m["customerChain"],
                        CcrCicMappingModel.customer_code == m["customerCode"],
                    )
                    .first()
                )
                if row:
                    row.basepack = m.get("basepack", row.basepack)
                    row.cic = m.get("cic", row.cic)
                    row.sales_org = m.get("salesOrg", row.sales_org)
                    row.channel = m.get("channel", row.channel)
                    row.depot = m.get("depot", row.depot)
                    row.status = m.get("status", row.status)
                    row.sourcing_depot = m.get("sourcingDepot", row.sourcing_depot)
                    row.sourcing_type = m.get("sourcingType", row.sourcing_type)
                    row.pricing_status = m.get("pricingStatus", row.pricing_status)
                    row.updated_at = now
                else:
                    row = CcrCicMappingModel(
                        id=uuid.uuid4(),
                        cbu_code=m["cbuCode"],
                        basepack=m.get("basepack"),
                        customer_chain=m["customerChain"],
                        customer_code=m["customerCode"],
                        cic=m.get("cic"),
                        sales_org=m.get("salesOrg", "1000"),
                        channel=m.get("channel", "MT"),
                        depot=m.get("depot"),
                        status=m.get("status", "Mapped"),
                        sourcing_depot=m.get("sourcingDepot"),
                        sourcing_type=m.get("sourcingType", "Decentralized"),
                        pricing_status=m.get("pricingStatus", "Available"),
                        created_at=now,
                        updated_at=now,
                    )
                    db.add(row)
                db.flush()
                results.append(_cic_mapping_to_dict(row))
            db.commit()
            return results
        finally:
            db.close()

    def seed_line_items(self, seeds: List[dict]) -> None:
        db = SessionLocal()
        try:
            existing = {
                (r.predecessor_cbu_code, r.successor_cbu_code, r.customer_chain, r.customer_code)
                for r in db.query(
                    CcrLineItemModel.predecessor_cbu_code,
                    CcrLineItemModel.successor_cbu_code,
                    CcrLineItemModel.customer_chain,
                    CcrLineItemModel.customer_code,
                ).all()
            }
            now = datetime.now(timezone.utc)
            for s in seeds:
                key = (s["predecessor_cbu_code"], s["successor_cbu_code"], s["customer_chain"], s["customer_code"])
                if key not in existing:
                    db.add(CcrLineItemModel(
                        id=uuid.uuid4(),
                        predecessor_cbu_code=s["predecessor_cbu_code"],
                        successor_cbu_code=s["successor_cbu_code"],
                        customer_chain=s["customer_chain"],
                        customer_code=s["customer_code"],
                        cic=s.get("cic"),
                        trigger_stage=s.get("trigger_stage", "None"),
                        urgency_color=s.get("urgency_color", "None"),
                        ccr_status=s.get("ccr_status", "Upcoming"),
                        execution_type=s.get("execution_type", "Manual"),
                        ruleset_outcome=s.get("ruleset_outcome"),
                        overrides=s.get("overrides"),
                        escalation_due_at=None,
                        escalated_at=None,
                        created_at=now,
                        updated_at=now,
                    ))
            db.commit()
        finally:
            db.close()
