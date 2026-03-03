from fastapi import APIRouter, HTTPException
from server_py.models import STATUS_FLOW, TransitionRequest, UpdateNetworkEntry
from server_py.services.state_management.storage import StateStorage
from server_py.services.list_master.storage import ListMasterStorage

router = APIRouter()
state_storage = StateStorage()
_list_storage: ListMasterStorage | None = None


def get_state_storage() -> StateStorage:
    return state_storage


def set_list_storage(ls: ListMasterStorage):
    global _list_storage
    _list_storage = ls


@router.get("/flow")
async def get_flow():
    return {
        "service": "state-management",
        "statuses": STATUS_FLOW,
        "totalSteps": len(STATUS_FLOW),
    }


@router.get("/{entry_id}")
async def get_status(entry_id: str):
    status = state_storage.get_status(entry_id)
    if not status:
        raise HTTPException(status_code=404, detail={"service": "state-management", "message": "No status found for this entry"})
    current_index = STATUS_FLOW.index(status) if status in STATUS_FLOW else -1
    return {
        "service": "state-management",
        "entryId": entry_id,
        "currentStatus": status,
        "currentStep": current_index + 1,
        "totalSteps": len(STATUS_FLOW),
        "canAdvance": current_index < len(STATUS_FLOW) - 1,
        "nextStatus": STATUS_FLOW[current_index + 1] if current_index < len(STATUS_FLOW) - 1 else None,
    }


@router.get("/{entry_id}/history")
async def get_history(entry_id: str):
    history = state_storage.get_history(entry_id)
    return {
        "service": "state-management",
        "entryId": entry_id,
        "transitions": history,
    }


@router.post("/{entry_id}/transition")
async def transition_status(entry_id: str, req: TransitionRequest):
    if req.toStatus not in STATUS_FLOW:
        raise HTTPException(
            status_code=400,
            detail={
                "service": "state-management",
                "message": f"Invalid status: {req.toStatus}. Valid statuses: {', '.join(STATUS_FLOW)}",
            },
        )

    current_status = state_storage.get_status(entry_id)
    if not current_status:
        raise HTTPException(status_code=404, detail={"service": "state-management", "message": "No status found for this entry"})

    current_index = STATUS_FLOW.index(current_status) if current_status in STATUS_FLOW else -1
    target_index = STATUS_FLOW.index(req.toStatus)

    if target_index <= current_index:
        raise HTTPException(
            status_code=400,
            detail={
                "service": "state-management",
                "message": f'Cannot transition from "{current_status}" to "{req.toStatus}". Status can only move forward.',
                "currentStep": current_index + 1,
                "targetStep": target_index + 1,
            },
        )

    if req.toStatus == "Active" and _list_storage:
        entry = _list_storage.get_by_id(entry_id)
        if entry:
            errors = []
            if not entry.get("networkChangeDate"):
                errors.append("Network Change Date is required")
            if not entry.get("startDate"):
                errors.append("Start Date is required")
            if not entry.get("endDate"):
                errors.append("End Date is required")
            if entry.get("startDate") and entry.get("networkChangeDate") and entry["startDate"] < entry["networkChangeDate"]:
                errors.append("Start Date must be on or after Network Change Date")
            if entry.get("startDate") and entry.get("endDate") and entry["endDate"] < entry["startDate"]:
                errors.append("End Date must be on or after Start Date")
            geo = entry.get("geography") or []
            dep = entry.get("depot") or []
            ch = [c for c in (entry.get("channel") or []) if c != "MT"]
            if len(geo) == 0:
                errors.append("At least one cluster must be selected")
            if len(dep) == 0:
                errors.append("At least one depot must be selected")
            if len(ch) == 0:
                errors.append("At least one channel must be selected")
            if errors:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "service": "state-management",
                        "message": "Validation failed for activation",
                        "errors": errors,
                    },
                )

    transition = state_storage.add_transition(
        entry_id=entry_id,
        from_status=current_status,
        to_status=req.toStatus,
        triggered_by=req.triggeredBy,
        metadata=req.metadata,
    )

    if _list_storage:
        _list_storage.update(entry_id, UpdateNetworkEntry(networkStatus=req.toStatus))

    return {
        "service": "state-management",
        "transition": transition,
        "currentStatus": req.toStatus,
        "previousStatus": current_status,
    }
