from datetime import datetime, timezone
from typing import Optional, List

from server_py.models import (
    InsertServiceRequest,
    ApproveStepRequest,
    RejectStepRequest,
    APPROVER_CHAIN_TEMPLATE,
    SR_TYPES,
)
from server_py.services.service_requests.storage import ServiceRequestStorage


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_approvers(assigned_users: Optional[dict] = None) -> list:
    """
    Build the initial 4-step approver chain.
    assigned_users: dict of role -> user name (looked up from users service at raise time).
    First step is "pending", rest are "waiting".
    """
    assigned_users = assigned_users or {}
    chain = []
    for i, step in enumerate(APPROVER_CHAIN_TEMPLATE):
        chain.append({
            "label": step["label"],
            "assignedTo": assigned_users.get(step["role"], step["role"]),
            "subLabel": step["subLabel"],
            "status": "pending" if i == 0 else "waiting",
            "actionedAt": None,
            "rejectionReason": None,
        })
    return chain


class ServiceRequestService:
    def __init__(self, storage: ServiceRequestStorage):
        self.storage = storage

    def get_all(self, sr_type: Optional[str] = None, status: Optional[str] = None,
                business_group: Optional[str] = None) -> List[dict]:
        return self.storage.get_all(sr_type=sr_type, status=status, business_group=business_group)

    def get_by_id(self, sr_id: str) -> Optional[dict]:
        return self.storage.get_by_id(sr_id)

    def raise_sr(self, data: InsertServiceRequest, assigned_users: Optional[dict] = None) -> dict:
        if data.srType not in SR_TYPES:
            raise ValueError(f"Invalid SR type: {data.srType}")

        approvers = _build_approvers(assigned_users)
        payload = data.model_dump()
        payload["approvers"] = approvers
        return self.storage.create(payload)

    def approve_step(self, sr_id: str, req: ApproveStepRequest) -> dict:
        sr = self.storage.get_by_id(sr_id)
        if not sr:
            raise LookupError(f"SR {sr_id} not found")
        if sr["status"] != "pending":
            raise ValueError(f"SR is already {sr['status']}")

        approvers = list(sr["approvers"])
        step_index = req.stepIndex

        if step_index < 0 or step_index >= len(approvers):
            raise ValueError(f"Invalid step index {step_index}")
        if approvers[step_index]["status"] != "pending":
            raise ValueError(f"Step {step_index} is not pending")

        approvers[step_index]["status"] = "approved"
        approvers[step_index]["actionedAt"] = _now_iso()

        is_last = step_index == len(approvers) - 1
        if is_last:
            overall_status = "approved"
        else:
            approvers[step_index + 1]["status"] = "pending"
            overall_status = "pending"

        return self.storage.update_approvers(sr_id, approvers, overall_status)

    def seed_requests(self, seeds: list) -> None:
        """Insert seed SRs if they don't already exist (idempotent by id)."""
        self.storage.seed_requests(seeds)

    def reject_step(self, sr_id: str, req: RejectStepRequest) -> dict:
        sr = self.storage.get_by_id(sr_id)
        if not sr:
            raise LookupError(f"SR {sr_id} not found")
        if sr["status"] != "pending":
            raise ValueError(f"SR is already {sr['status']}")

        approvers = list(sr["approvers"])
        step_index = req.stepIndex

        if step_index < 0 or step_index >= len(approvers):
            raise ValueError(f"Invalid step index {step_index}")
        if approvers[step_index]["status"] != "pending":
            raise ValueError(f"Step {step_index} is not pending")

        approvers[step_index]["status"] = "rejected"
        approvers[step_index]["actionedAt"] = _now_iso()
        approvers[step_index]["rejectionReason"] = req.reason

        return self.storage.update_approvers(
            sr_id, approvers, "rejected", rejection_reason=req.reason
        )
