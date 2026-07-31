from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Any, List

from server_py.services.ccr.service import CcrService
from server_py.db import SessionLocal, CcrCustomerMasterModel, ServiceRequestModel


async def _get_session_user() -> dict:
    """
    Derive the 'logged-in' user server-side.
    In production this would read identity from a JWT or session cookie.
    For the demo the session is treated as an admin/supervisor (no CSE restriction)
    so the client-side "My Items / All Items" toggle fully controls scope.
    When the client passes a cse_id query param the server honours it to scope
    to that CSE's chains; when absent (All Items) all line items are returned.
    Returns {"cseId": None, "isAdmin": True, "customerChains": []}.
    """
    return {"cseId": None, "isAdmin": True, "customerChains": []}


def _assert_item_access(item: dict, session_user: dict) -> None:
    """
    Raise HTTP 403 if the session user is not an admin and the item's
    customer_chain is not in their assigned chains.
    Admins (no CSE assignment) pass unrestricted.
    """
    if session_user["isAdmin"]:
        return
    chain = item.get("customerChain") or item.get("customer_chain")
    if chain not in session_user["customerChains"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied: this line item does not belong to your portfolio",
        )

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




@router.get("/mt-listing")
async def get_mt_listing(cbu_code: str = Query(...)):
    """
    MT listing view for a relaunch/extension CBU where the existing CIC is reused
    (BRD §10.5 Case 1 / §10.6). Shows predecessor and successor rows with
    listing-based vs non-listing scenario classification.
    """
    return _svc().get_mt_listing(cbu_code)


@router.get("/customers")
async def get_customers():
    return _svc().get_all_customers()


@router.get("/customers/{customer_chain}/code-mapping")
async def get_code_mapping(customer_chain: str):
    return _svc().get_code_mappings_for_chain(customer_chain)


@router.get("/cic-mappings/summary")
async def get_cic_mapping_summary():
    """
    Returns per-CBU posting status: {[cbuCode]: "Pending" | "Saved" | "Posted"}.
    Absent keys = Pending (no CIC rows exist yet for that CBU).
    """
    return _svc().get_cic_mapping_summary()


@router.get("/cic-mappings/depot-change-summary")
async def get_chain_completion_summary():
    """
    Returns per-CBU chain-completion status for new-launch CBUs whose
    customer_mapping contains at least one CCR-chain code.

    Response shape:
      { [cbuCode]: { applicable: string[], saved: string[], status: "complete"|"partial"|"none" } }

    status meanings:
      complete — every applicable chain has ≥1 saved CIC row
      partial  — some (but not all) applicable chains have a saved CIC row
      none     — no applicable chain has a saved CIC row yet
    Absent keys = customer_mapping is null or contains no CCR-chain codes → CBU Overview.
    """
    return _svc().get_chain_completion_summary()


@router.get("/cic-mappings")
async def get_cic_mappings(
    cbu_code: Optional[str] = Query(None),
    customer_chain: Optional[str] = Query(None),
):
    return _svc().get_cic_mappings(cbu_code=cbu_code, customer_chain=customer_chain)


@router.put("/cic-mappings")
async def upsert_cic_mappings(req: UpsertCicMappingsRequest):
    return _svc().upsert_cic_mappings(req.mappings)


@router.get("/ncsm-depot-decisions/{cbu_code}")
async def get_ncsm_depot_decisions(cbu_code: str):
    """
    Return the most-recent NCSM decision for every depot that has ever been
    included in an activation SR for this CBU.

    Response shape:  { "<DEPOT_CODE>": "approved" | "rejected" | "pending" }
    """
    db = SessionLocal()
    try:
        srs = (
            db.query(ServiceRequestModel)
            .filter(ServiceRequestModel.depot_decisions.isnot(None))
            .order_by(ServiceRequestModel.created_at.asc())   # asc so later rows overwrite earlier
            .all()
        )
        result: dict = {}
        for sr in srs:
            decisions = sr.depot_decisions or []
            for d in decisions:
                if d.get("cbuCode") == cbu_code:
                    depot = d.get("depotCode")
                    decision = d.get("ncsmDecision", "pending")
                    if depot:
                        result[depot] = decision
        return result
    finally:
        db.close()


class PostCbusRequest(BaseModel):
    cbu_codes: List[str]
    posted_by: str = "system"


@router.post("/post-cbus")
async def post_cbus(req: PostCbusRequest):
    """
    Submit a list of CBUs into the SAP update workflow (sap_status = "Requested").
    Idempotent: already-submitted CBUs are reset to "Requested".
    """
    if not req.cbu_codes:
        raise HTTPException(status_code=400, detail="cbu_codes must not be empty")
    return _svc().post_cbus(cbu_codes=req.cbu_codes, posted_by=req.posted_by)


class UpdateSapStatusRequest(BaseModel):
    cbu_codes: List[str]
    status: str  # "Requested" | "Validated" | "Error"
    updated_by: str = "system"


@router.post("/update-sap-status")
async def update_sap_status(req: UpdateSapStatusRequest):
    """
    Update the SAP status of CBUs already in the SAP workflow.
    Valid statuses: Requested | Validated | Error
    """
    if not req.cbu_codes:
        raise HTTPException(status_code=400, detail="cbu_codes must not be empty")
    if req.status not in {"Requested", "Validated", "Error"}:
        raise HTTPException(status_code=400, detail=f"Invalid status '{req.status}'")
    return _svc().update_sap_status(
        cbu_codes=req.cbu_codes, status=req.status, updated_by=req.updated_by
    )


@router.get("/ruleset")
async def get_ruleset():
    return _svc().get_ruleset()


@router.get("/mapping-initiated")
async def get_mapping_initiated():
    """Completed CCR line items with a new CIC assigned — feeds Master Maintenance tab."""
    return _svc().get_mapping_initiated()


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
async def get_line_item(
    item_id: str,
    session_user: dict = Depends(_get_session_user),
):
    item = _svc().get_line_item_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    _assert_item_access(item, session_user)
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
    overrides: List[Any] = []   # structured: [{field, originalValue, overrideValue, timestamp}]
    cicCode: Optional[str] = None
    executionType: str = "Manual"
    justification: Optional[str] = None
    # NOTE: 'actor' is intentionally not accepted from the client.
    # Actor identity is always derived server-side via _get_session_user.


class DelistingResponseRequest(BaseModel):
    action: str            # "accept" | "reject"
    justification: Optional[str] = None


@router.post("/line-items/{item_id}/execute")
async def execute_line_item(
    item_id: str,
    req: ExecuteLineItemRequest,
    session_user: dict = Depends(_get_session_user),
):
    """
    Execute CCR for a line item: applies MT listing logic to CIC mappings
    (including National Non-Listing DOH/CLOT gating), writes audit log,
    and marks the item Completed.
    Actor identity is derived server-side — never accepted from the client.
    """
    # Access check before executing — IDOR prevention
    item_check = _svc().get_line_item_by_id(item_id)
    if not item_check:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    _assert_item_access(item_check, session_user)
    payload = req.model_dump()
    # Inject server-derived actor so storage.execute_line_item cannot be spoofed
    payload["_serverActor"] = session_user.get("cseId") or "system"
    result = _svc().execute_line_item(item_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return result


@router.get("/line-items/{item_id}/recommendation")
async def get_recommendation(
    item_id: str,
    session_user: dict = Depends(_get_session_user),
):
    """
    Auto-CCR recommendation engine: returns Scenario A/B/C with rationale
    derived from network entry DOH (ATP proxy).
    """
    # Access check: verify item belongs to this CSE before returning recommendation
    item_check = _svc().get_line_item_by_id(item_id)
    if not item_check:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    _assert_item_access(item_check, session_user)
    result = _svc().get_recommendation(item_id)
    if not result:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return result


@router.get("/line-items/{item_id}/export")
async def get_export_data(
    item_id: str,
    session_user: dict = Depends(_get_session_user),
):
    """
    Return BRD-specified CIC mapping columns for download
    (Customer Code, Customer Chain, CIC, Material Code, Depot,
     Mapping Status, Sourcing Depot, Pricing Status).
    """
    # Access check before exporting data
    item_check = _svc().get_line_item_by_id(item_id)
    if not item_check:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    _assert_item_access(item_check, session_user)
    data = _svc().get_export_data(item_id)
    if data is None:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return data


@router.post("/line-items/{item_id}/delisting-response")
async def delisting_response(
    item_id: str,
    req: DelistingResponseRequest,
    session_user: dict = Depends(_get_session_user),
):
    """
    Handle Accept/Reject for a Paid Bible delisting intimation.
    Reject requires a non-empty justification (enforced server-side).
    """
    if req.action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'reject'")
    if req.action == "reject" and not (req.justification or "").strip():
        raise HTTPException(
            status_code=422,
            detail="Justification is required when rejecting a delisting intimation",
        )
    # Access check before mutating
    item_check = _svc().get_line_item_by_id(item_id)
    if not item_check:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    _assert_item_access(item_check, session_user)
    result = _svc().delisting_response(item_id, req.action, req.justification)
    if not result:
        raise HTTPException(status_code=404, detail="CCR line item not found")
    return result
