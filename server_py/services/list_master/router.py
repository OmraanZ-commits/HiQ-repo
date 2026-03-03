from fastapi import APIRouter, HTTPException
from server_py.models import InsertNetworkEntry, UpdateNetworkEntry
from server_py.services.list_master.storage import ListMasterStorage

router = APIRouter()
storage = ListMasterStorage()


def get_storage() -> ListMasterStorage:
    return storage


@router.get("")
@router.get("/")
async def get_all_entries():
    return storage.get_all()


@router.get("/{entry_id}")
async def get_entry(entry_id: str):
    entry = storage.get_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail={"service": "list-master", "message": "Entry not found"})
    return entry


@router.post("")
@router.post("/")
async def create_entry(data: InsertNetworkEntry):
    return storage.create(data)


@router.patch("/{entry_id}")
async def update_entry(entry_id: str, data: UpdateNetworkEntry):
    entry = storage.update(entry_id, data)
    if not entry:
        raise HTTPException(status_code=404, detail={"service": "list-master", "message": "Entry not found"})
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(entry_id: str):
    success = storage.delete(entry_id)
    if not success:
        raise HTTPException(status_code=404, detail={"service": "list-master", "message": "Entry not found"})
