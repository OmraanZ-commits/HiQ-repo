from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Any, List

from server_py.services.ccr.service import CcrService
from server_py.db import SessionLocal, CcrCustomerMasterModel


async def _get_session_user() -> dict:
    """
    Derive the 'logged-in' user server-side using the same logic as GET /api/me.
    In production this would read identity from a JWT or session cookie.
    For the demo it queries the first CSE in the customer master — same deterministic
    source used by /api/me — so the result is always consistent.
    Returns {"cseId": str | None, "isAdmin": bool}.
    """
    db = SessionLocal()
    try:
        row = (
            db.query(CcrCustomerMasterModel)
            .filter(CcrCustomerMasterModel.cse_id.isnot(None))
            .order_by(CcrCustomerMasterModel.cse_id)
            .first()
        )
        cse_id = row.cse_id if row else None
    finally:
        db.close()
    return {"cseId": cse_id, "isAdmin": cse_id is None}

router = APIRouter()
_service: CcrService | None = None


def set_service(service: CcrService):
    global _service
    _service = service


def _svc() -> CcrService:
    if not _service:
        raise HTTPException(status_code=503, detail="CCR service not initialized")
    return _service


class UpsertCicMappingsRequest(BaseModel):
    mappings: list[Any]


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


@router.put("/cic-mappings")
async def upsert_cic_mappings(req: UpsertCicMappingsRequest):
    return _svc().upsert_cic_mappings(req.mappings)


@router.get("/ruleset")
async def get_ruleset():
    return _svc().get_ruleset()


@router.get("/line-items")
async def get_line_items(
    cse_id: Optional[str] = Query(None),
    ccr_status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session_user: dict = Depends(_get_session_user),
):
    """
    Return CCR line items.  CSE scope is ALWAYS enforced server-side.
    - Non-admin sessions: client-supplied cse_id is ignored; items are always
      filtered to the session user's own cse_id (IDOR prevention).
    - Admin sessions (no CSE assignment in customer master): client-supplied
      cse_id is honoured so admins can inspect any CSE's workspace.
    """
    if not session_user["isAdmin"]:
        # Override client input — scope strictly to the server-derived CSE identity
        cse_id = session_user["cseId"]
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


@router.post("/trigger-engine/evaluate")
async def trigger_engine_evaluate():
    """
    Evaluate CCR trigger stages against current network entry state.
    Network entries are fetched server-side — no client input is accepted.
    """
    result = _svc().evaluate_triggers()
    return {"ok": True, **result}


# ── Execution Engine ─────────────────────────────────────────────────────────

class ExecuteLineItemRequest(BaseModel):
    rulesetValues: dict = {}
    overrides: List[str] = []
    cicCode: Optional[str] = None
    executionType: str = "Manual"
    justification: Optional[str] = None
    actor: Optional[str] = "system"


class DelistingResponseRequest(BaseModel):
    action: str            # "accept" | "reject"
    justification: Optional[str] = None


@router.post("/line-items/{item_id}/execute")
async def execute_line_item(item_id: str, req: ExecuteLineItemRequest):
    """
    Execute CCR for a line item: applies MT listing logic to CIC mappings,
    writes audit log, and marks the item Completed.
    """
    result = _svc().execute_line_item(item_id, req.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return result


@router.get("/line-items/{item_id}/recommendation")
async def get_recommendation(item_id: str):
    """
    Auto-CCR recommendation engine: returns Scenario A/B/C with rationale
    derived from network entry DOH (ATP proxy).
    """
    result = _svc().get_recommendation(item_id)
    if not result:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return result


@router.get("/line-items/{item_id}/export")
async def get_export_data(item_id: str):
    """
    Return BRD-specified CIC mapping columns for download
    (Customer Code, Customer Chain, CIC, Material Code, Depot,
     Mapping Status, Sourcing Depot, Pricing Status).
    """
    data = _svc().get_export_data(item_id)
    if data is None:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return data


@router.post("/line-items/{item_id}/delisting-response")
async def delisting_response(item_id: str, req: DelistingResponseRequest):
    """
    Handle Accept/Reject for a Paid Bible delisting intimation.
    """
    if req.action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'reject'")
    result = _svc().delisting_response(item_id, req.action, req.justification)
    if not result:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return result
