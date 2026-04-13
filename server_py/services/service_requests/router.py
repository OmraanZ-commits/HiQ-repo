from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from server_py.models import InsertServiceRequest, ApproveStepRequest, RejectStepRequest
from server_py.services.service_requests.service import ServiceRequestService

router = APIRouter()
_service: ServiceRequestService | None = None


def set_service(service: ServiceRequestService):
    global _service
    _service = service


def _require_service() -> ServiceRequestService:
    if not _service:
        raise HTTPException(status_code=503, detail="Service Requests service not initialized")
    return _service


@router.get("")
@router.get("/")
async def list_service_requests(
    srType: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    businessGroup: Optional[str] = Query(None),
):
    svc = _require_service()
    return svc.get_all(sr_type=srType, status=status, business_group=businessGroup)


@router.get("/{sr_id}")
async def get_service_request(sr_id: str):
    svc = _require_service()
    sr = svc.get_by_id(sr_id)
    if not sr:
        raise HTTPException(status_code=404, detail={"service": "service-requests", "message": "SR not found"})
    return sr


@router.post("", status_code=201)
@router.post("/", status_code=201)
async def raise_service_request(data: InsertServiceRequest):
    svc = _require_service()
    try:
        return svc.raise_sr(data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/{sr_id}/approve")
async def approve_step(sr_id: str, req: ApproveStepRequest):
    svc = _require_service()
    try:
        return svc.approve_step(sr_id, req)
    except LookupError as e:
        raise HTTPException(status_code=404, detail={"service": "service-requests", "message": str(e)})
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/{sr_id}/reject")
async def reject_step(sr_id: str, req: RejectStepRequest):
    svc = _require_service()
    try:
        return svc.reject_step(sr_id, req)
    except LookupError as e:
        raise HTTPException(status_code=404, detail={"service": "service-requests", "message": str(e)})
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
