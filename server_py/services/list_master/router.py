from fastapi import APIRouter, HTTPException
from server_py.models import InsertNetworkEntry, UpdateNetworkEntry
from server_py.services.list_master.service import ListMasterService
from server_py.services.list_master.storage import ListMasterStorage

router = APIRouter()
_service: ListMasterService | None = None


def get_storage() -> ListMasterStorage:
    if _service:
        return _service.storage
    return ListMasterStorage()


def set_service(service: ListMasterService):
    global _service
    _service = service


def get_service() -> ListMasterService | None:
    return _service


@router.get("")
@router.get("/")
async def get_all_entries():
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return _service.get_all()


@router.get("/{entry_id}")
async def get_entry(entry_id: str):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    entry = _service.get_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail={"service": "list-master", "message": "Entry not found"})
    return entry


@router.post("")
@router.post("/")
async def create_entry(data: InsertNetworkEntry):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return _service.create(data)


@router.patch("/{entry_id}")
async def update_entry(entry_id: str, data: UpdateNetworkEntry):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    entry = _service.update(entry_id, data)
    if not entry:
        raise HTTPException(status_code=404, detail={"service": "list-master", "message": "Entry not found"})
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(entry_id: str):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    success = _service.delete(entry_id)
    if not success:
        raise HTTPException(status_code=404, detail={"service": "list-master", "message": "Entry not found"})
