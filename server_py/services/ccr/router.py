from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Any

from server_py.services.ccr.service import CcrService

router = APIRouter()
_service: CcrService | None = None


def set_service(service: CcrService):
    global _service
    _service = service


def _svc() -> CcrService:
    if not _service:
        raise HTTPException(status_code=503, detail="CCR service not initialized")
    return _service


class UpdateLineItemStatusRequest(BaseModel):
    ccrStatus: Optional[str] = None
    triggerStage: Optional[str] = None
    urgencyColor: Optional[str] = None
    executionType: Optional[str] = None
    rulesetOutcome: Optional[Any] = None
    overrides: Optional[Any] = None
    escalationDueAt: Optional[str] = None
    escalatedAt: Optional[str] = None


class AppendAuditLogRequest(BaseModel):
    eventType: str
    actor: str
    payload: Optional[Any] = None


@router.get("/customers")
async def get_customers():
    return _svc().get_all_customers()


@router.get("/customers/{customer_chain}/code-mapping")
async def get_code_mapping(customer_chain: str):
    return _svc().get_code_mappings_for_chain(customer_chain)


@router.get("/cic-mappings")
async def get_cic_mappings(
    cbu_code: Optional[str] = Query(None),
    customer_chain: Optional[str] = Query(None),
):
    return _svc().get_cic_mappings(cbu_code=cbu_code, customer_chain=customer_chain)


@router.get("/ruleset")
async def get_ruleset():
    return _svc().get_ruleset()


@router.get("/line-items")
async def get_line_items(
    cse_id: Optional[str] = Query(None),
    ccr_status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return _svc().get_line_items(cse_id=cse_id, ccr_status=ccr_status, limit=limit, offset=offset)


@router.get("/line-items/{item_id}")
async def get_line_item(item_id: str):
    item = _svc().get_line_item_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return item


@router.put("/line-items/{item_id}/status")
async def update_line_item_status(item_id: str, req: UpdateLineItemStatusRequest):
    updated = _svc().update_line_item_status(item_id, req.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return updated


@router.post("/line-items/{item_id}/audit")
async def append_audit_log(item_id: str, req: AppendAuditLogRequest):
    item = _svc().get_line_item_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return _svc().append_audit_log(item_id, req.model_dump())
