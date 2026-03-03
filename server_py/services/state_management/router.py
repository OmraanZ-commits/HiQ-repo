from fastapi import APIRouter, HTTPException
from server_py.models import STATUS_FLOW
from server_py.services.state_management.service import StateManagementService
from server_py.services.state_management.storage import StateStorage
from server_py.services.list_master.storage import ListMasterStorage

router = APIRouter()
_service: StateManagementService | None = None
state_storage = StateStorage()


def get_state_storage() -> StateStorage:
    return state_storage


def get_service() -> StateManagementService | None:
    return _service


def set_list_storage(ls: ListMasterStorage):
    global _service
    _service = StateManagementService(state_storage, ls)


@router.get("/flow")
async def get_flow():
    return {
        "service": "state-management",
        "statuses": STATUS_FLOW,
        "totalSteps": len(STATUS_FLOW),
    }


@router.get("/{entry_id}")
async def get_status(entry_id: str):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    info = _service.get_status_info(entry_id)
    if not info:
        raise HTTPException(status_code=404, detail={"service": "state-management", "message": "No status found for this entry"})
    return {"service": "state-management", **info}


@router.get("/{entry_id}/history")
async def get_history(entry_id: str):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    history = _service.get_history(entry_id)
    return {
        "service": "state-management",
        "entryId": entry_id,
        "transitions": history,
    }
