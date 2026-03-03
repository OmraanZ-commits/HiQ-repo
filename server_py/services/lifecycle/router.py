from fastapi import APIRouter, HTTPException
from server_py.services.lifecycle.service import LifecycleService
from server_py.services.list_master.storage import ListMasterStorage

router = APIRouter()
_service: LifecycleService | None = None


def set_list_storage(ls: ListMasterStorage):
    global _service
    _service = LifecycleService(ls)


def get_service() -> LifecycleService | None:
    return _service


@router.get("")
@router.get("/")
async def get_all_lifecycle():
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return {
        "service": "lifecycle",
        "data": _service.recompute_all(),
    }


@router.get("/{entry_id}")
async def get_entry_lifecycle(entry_id: str):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    result = _service.recompute_entry(entry_id)
    if not result:
        raise HTTPException(status_code=404, detail={"service": "lifecycle", "message": "Entry not found"})
    return {
        "service": "lifecycle",
        **result,
    }
