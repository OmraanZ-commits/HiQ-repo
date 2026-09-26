from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from server_py.services.transition_risk.service import TransitionRiskService


router = APIRouter()
_service: TransitionRiskService | None = None


def set_service(service: TransitionRiskService):
    global _service
    _service = service


def _require_service() -> TransitionRiskService:
    if not _service:
        raise HTTPException(status_code=503, detail="Transition Risk service not initialized")
    return _service


class ActivationRequest(BaseModel):
    basepackCode: str
    effectiveDate: str


class SourcingAmendmentRequest(BaseModel):
    cbuCode: str
    depotCode: str
    effectiveDate: str
    sourcingMode: str
    sourcingDepotCode: Optional[str] = None


@router.get("/depot-stock")
async def get_depot_stock():
    return _require_service().get_depot_stock()


@router.post("/activation-requests")
async def request_activation(data: ActivationRequest):
    try:
        return _require_service().request_activation(data.basepackCode, data.effectiveDate)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/sourcing-amendments")
async def request_sourcing_amendment(data: SourcingAmendmentRequest):
    try:
        return _require_service().request_sourcing_amendment(
            cbu_code=data.cbuCode,
            depot_code=data.depotCode,
            effective_date=data.effectiveDate,
            sourcing_mode=data.sourcingMode,
            sourcing_depot_code=data.sourcingDepotCode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))