from fastapi import APIRouter, HTTPException
from server_py.services.lifecycle.engine import compute_lifecycle
from server_py.services.list_master.storage import ListMasterStorage

router = APIRouter()
_list_storage: ListMasterStorage | None = None


def set_list_storage(ls: ListMasterStorage):
    global _list_storage
    _list_storage = ls


@router.get("")
@router.get("/")
async def get_all_lifecycle():
    if not _list_storage:
        raise HTTPException(status_code=503, detail="Service not initialized")
    entries = _list_storage.get_all()
    result = {}
    for entry in entries:
        lifecycle = compute_lifecycle(entry)
        result[entry["id"]] = lifecycle
    return {
        "service": "lifecycle",
        "data": result,
    }


@router.get("/{entry_id}")
async def get_entry_lifecycle(entry_id: str):
    if not _list_storage:
        raise HTTPException(status_code=503, detail="Service not initialized")
    entry = _list_storage.get_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail={"service": "lifecycle", "message": "Entry not found"})
    return {
        "service": "lifecycle",
        **compute_lifecycle(entry),
    }
