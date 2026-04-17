from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from server_py.models import InsertNetworkEntry, UpdateNetworkEntry
from server_py.services.list_master.service import ListMasterService

router = APIRouter()
_service: ListMasterService | None = None


def set_service(service: ListMasterService):
    global _service
    _service = service


@router.get("")
@router.get("/")
async def get_all_entries(launchType: Optional[str] = Query(None)):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    entries = _service.get_all()
    if launchType:
        entries = [e for e in entries if e.get("launchType") == launchType]
    return entries


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


class GeoExtensionRequest(BaseModel):
    addedGeos: List[str] = []
    addedDepots: List[str] = []


@router.post("/{entry_id}/geo-extension")
async def apply_geo_extension(entry_id: str, data: GeoExtensionRequest):
    if not _service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    entry = _service.merge_geo_depots(entry_id, data.addedGeos, data.addedDepots)
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
