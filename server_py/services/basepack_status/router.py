from fastapi import APIRouter, HTTPException

from server_py.models import InsertBasepakStatusOverride
from server_py.services.basepack_status.service import BasepakStatusService

router = APIRouter()
_service: BasepakStatusService | None = None


def set_service(service: BasepakStatusService):
    global _service
    _service = service


def _require_service() -> BasepakStatusService:
    if not _service:
        raise HTTPException(status_code=503, detail="Basepack Status service not initialized")
    return _service


@router.get("")
@router.get("/")
async def get_all_overrides():
    """Returns a dict of basepakId -> status for all active overrides."""
    svc = _require_service()
    return svc.get_all_active()


@router.get("/{bp_id}")
async def get_override(bp_id: str):
    svc = _require_service()
    override = svc.get_override(bp_id)
    if not override:
        raise HTTPException(status_code=404, detail={"service": "basepack-status", "message": "No active override found"})
    return override


@router.put("/{bp_id}")
async def apply_override(bp_id: str, data: InsertBasepakStatusOverride):
    svc = _require_service()
    if data.bpId != bp_id:
        raise HTTPException(status_code=422, detail="bpId in body must match path parameter")
    return svc.apply_override(data)


@router.delete("/{bp_id}", status_code=204)
async def revert_override(bp_id: str):
    svc = _require_service()
    success = svc.revert_override(bp_id)
    if not success:
        raise HTTPException(status_code=404, detail={"service": "basepack-status", "message": "No active override found"})
