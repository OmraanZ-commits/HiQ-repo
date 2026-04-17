import uuid
from datetime import datetime, timezone
from typing import Optional, List

from server_py.db import SessionLocal, ServiceRequestModel


def _row_to_dict(row: ServiceRequestModel) -> dict:
    return {
        "id": str(row.id),
        "srType": row.sr_type,
        "status": row.status,
        "raisedBy": row.raised_by,
        "businessGroup": row.business_group,
        "basepakCode": row.basepack_code,
        "basepakName": row.basepack_name,
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
        "sourcingMode": row.sourcing_mode,
        "centralizedGeo": row.centralized_geo or [],
        "centralizedDepots": row.centralized_depots or [],
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
            row = ServiceRequestModel(
                id=uuid.uuid4(),
                sr_type=data["srType"],
                status="pending",
                raised_by=data["raisedBy"],
                business_group=data.get("businessGroup"),
                basepack_code=data.get("basepakCode"),
                basepack_name=data.get("basepakName"),
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
                sourcing_mode=data.get("sourcingMode"),
                centralized_geo=data.get("centralizedGeo", []),
                centralized_depots=data.get("centralizedDepots", []),
                created_at=now,
                updated_at=now,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return _row_to_dict(row)
        finally:
            db.close()

    def update_approvers(self, sr_id: str, approvers: list, status: str,
                         rejection_reason: Optional[str] = None) -> Optional[dict]:
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
            row.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(row)
            return _row_to_dict(row)
        finally:
            db.close()
