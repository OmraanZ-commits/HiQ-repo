import uuid
from datetime import datetime, timezone
from typing import Optional, List

from server_py.db import SessionLocal, ServiceRequestModel


def _row_to_dict(row: ServiceRequestModel) -> dict:
    bp_code = row.basepack_code
    return {
        "id": str(row.id),
        "srType": row.sr_type,
        "status": row.status,
        "raisedBy": row.raised_by,
        "businessGroup": row.business_group,
        "brand": row.brand,
        # canonical names (camelCase without typo)
        "basepackCode": bp_code,
        "basepackName": row.basepack_name,
        # legacy names kept for backward compatibility
        "basepakCode": bp_code,
        "basepakName": row.basepack_name,
        "targetStatus": getattr(row, "target_status", None),
        "businessJustification": row.business_justification,
        "materials": row.materials or [],
        "approvers": row.approvers or [],
        "rejectionReason": row.rejection_reason,
        "criteriaMetAtRaise": row.criteria_met_at_raise,
        "mstnCoverageAtRaise": row.mstn_coverage_at_raise,
        "cbuId": row.cbu_id,
        "cbuCode": row.cbu_code,
        "cbuDescription": row.cbu_description,
        "currentValue": row.current_value,
        "requestedValue": row.requested_value,
        "addedGeos": row.added_geos or [],
        "addedDepots": row.added_depots or [],
        "addedChannels": row.added_channels or [],
        "removedGeos": getattr(row, "removed_geos", None) or [],
        "removedDepots": getattr(row, "removed_depots", None) or [],
        "sourcingMode": row.sourcing_mode,
        "centralizedGeo": row.centralized_geo or [],
        "centralizedDepots": row.centralized_depots or [],
        "addedChains": getattr(row, "added_chains", None) or [],
        "removedChains": getattr(row, "removed_chains", None) or [],
        "requestedCustomerMapping": getattr(row, "requested_customer_mapping", None) or {},
        "requestedDate": getattr(row, "requested_date", None),
        "effectiveDate": getattr(row, "effective_date", None),
        "validationSummary": getattr(row, "validation_summary", None),
        "pricingComplete": getattr(row, "pricing_complete", None),
        "sourcingComplete": getattr(row, "sourcing_complete", None),
        "depotDecisions": getattr(row, "depot_decisions", None) or [],
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


class ServiceRequestStorage:
    def get_all(self, sr_type: Optional[str] = None, status: Optional[str] = None,
                business_group: Optional[str] = None) -> List[dict]:
        db = SessionLocal()
        try:
            q = db.query(ServiceRequestModel)
            if sr_type:
                q = q.filter(ServiceRequestModel.sr_type == sr_type)
            if status:
                q = q.filter(ServiceRequestModel.status == status)
            if business_group:
                q = q.filter(ServiceRequestModel.business_group == business_group)
            rows = q.order_by(ServiceRequestModel.created_at.desc()).all()
            return [_row_to_dict(r) for r in rows]
        finally:
            db.close()

    def get_by_id(self, sr_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(ServiceRequestModel).filter(
                ServiceRequestModel.id == uuid.UUID(sr_id)
            ).first()
            return _row_to_dict(row) if row else None
        finally:
            db.close()

    def create(self, data: dict) -> dict:
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            bp_code = data.get("basepackCode") or data.get("basepakCode")
            bp_name = data.get("basepackName") or data.get("basepakName")
            row = ServiceRequestModel(
                id=uuid.uuid4(),
                sr_type=data["srType"],
                status="pending",
                raised_by=data["raisedBy"],
                business_group=data.get("businessGroup"),
                brand=data.get("brand"),
                basepack_code=bp_code,
                basepack_name=bp_name,
                business_justification=data.get("businessJustification"),
                materials=data.get("materials", []),
                approvers=data.get("approvers", []),
                criteria_met_at_raise=data.get("criteriaMetAtRaise"),
                mstn_coverage_at_raise=data.get("mstnCoverageAtRaise"),
                cbu_id=data.get("cbuId"),
                cbu_code=data.get("cbuCode"),
                cbu_description=data.get("cbuDescription"),
                current_value=data.get("currentValue"),
                requested_value=data.get("requestedValue"),
                added_geos=data.get("addedGeos", []),
                added_depots=data.get("addedDepots", []),
                added_channels=data.get("addedChannels", []),
                removed_geos=data.get("removedGeos", []),
                removed_depots=data.get("removedDepots", []),
                sourcing_mode=data.get("sourcingMode"),
                centralized_geo=data.get("centralizedGeo", []),
                centralized_depots=data.get("centralizedDepots", []),
                target_status=data.get("targetStatus"),
                added_chains=data.get("addedChains", []),
                removed_chains=data.get("removedChains", []),
                requested_customer_mapping=data.get("requestedCustomerMapping"),
                requested_date=data.get("requestedDate"),
                effective_date=data.get("effectiveDate"),
                validation_summary=data.get("validationSummary"),
                pricing_complete=data.get("pricingComplete"),
                sourcing_complete=data.get("sourcingComplete"),
                depot_decisions=data.get("depotDecisions"),
                created_at=now,
                updated_at=now,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return _row_to_dict(row)
        finally:
            db.close()

    def seed_requests(self, seeds: list) -> None:
        """Idempotent: insert seed SRs by their pre-assigned string id."""
        db = SessionLocal()
        try:
            for seed in seeds:
                seed_id = seed.get("id")
                if not seed_id:
                    continue
                try:
                    existing = db.query(ServiceRequestModel).filter(
                        ServiceRequestModel.id == uuid.UUID(seed_id) if "-" in seed_id else True
                    ).first()
                except Exception:
                    existing = None

                if existing:
                    continue

                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                bp_code = seed.get("basepackCode") or seed.get("basepakCode")
                bp_name = seed.get("basepackName") or seed.get("basepakName")

                id_val = seed_id
                try:
                    id_val = uuid.UUID(seed_id)
                except Exception:
                    id_val = uuid.uuid5(uuid.NAMESPACE_DNS, seed_id)

                row = ServiceRequestModel(
                    id=id_val,
                    sr_type=seed["srType"],
                    status=seed.get("status", "pending"),
                    raised_by=seed["raisedBy"],
                    business_group=seed.get("businessGroup"),
                    brand=seed.get("brand"),
                    basepack_code=bp_code,
                    basepack_name=bp_name,
                    business_justification=seed.get("businessJustification"),
                    materials=seed.get("materials", []),
                    approvers=seed.get("approvers", []),
                    rejection_reason=seed.get("rejectionReason"),
                    criteria_met_at_raise=seed.get("criteriaMetAtRaise"),
                    mstn_coverage_at_raise=seed.get("mstnCoverageAtRaise"),
                    cbu_id=seed.get("cbuId"),
                    cbu_code=seed.get("cbuCode"),
                    cbu_description=seed.get("cbuDescription"),
                    current_value=seed.get("currentValue"),
                    requested_value=seed.get("requestedValue"),
                    added_geos=seed.get("addedGeos", []),
                    added_depots=seed.get("addedDepots", []),
                    added_channels=seed.get("addedChannels", []),
                    removed_geos=seed.get("removedGeos", []),
                    removed_depots=seed.get("removedDepots", []),
                    sourcing_mode=seed.get("sourcingMode"),
                    centralized_geo=seed.get("centralizedGeo", []),
                    centralized_depots=seed.get("centralizedDepots", []),
                    target_status=seed.get("targetStatus"),
                    effective_date=seed.get("effectiveDate"),
                    validation_summary=seed.get("validationSummary"),
                    pricing_complete=seed.get("pricingComplete"),
                    sourcing_complete=seed.get("sourcingComplete"),
                    created_at=now,
                    updated_at=now,
                )
                try:
                    db.add(row)
                    db.commit()
                except Exception:
                    db.rollback()
        finally:
            db.close()

    def update_approvers(self, sr_id: str, approvers: list, status: str,
                         rejection_reason: Optional[str] = None,
                         effective_date: Optional[str] = None,
                         depot_decisions: Optional[list] = None) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(ServiceRequestModel).filter(
                ServiceRequestModel.id == uuid.UUID(sr_id)
            ).first()
            if not row:
                return None
            row.approvers = approvers
            row.status = status
            if rejection_reason is not None:
                row.rejection_reason = rejection_reason
            if effective_date is not None:
                row.effective_date = effective_date
            if depot_decisions is not None:
                row.depot_decisions = depot_decisions
            row.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(row)
            return _row_to_dict(row)
        finally:
            db.close()
