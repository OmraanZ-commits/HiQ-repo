from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from server_py.db import SessionLocal, SagaLogModel
from server_py.saga.transition_saga import build_transition_saga
from server_py.saga.reference_data_saga import build_reference_data_saga
from server_py.saga.sr_approval_saga import build_sr_approval_saga
from server_py.services.state_management.service import StateManagementService
from server_py.services.list_master.service import ListMasterService
from server_py.services.lifecycle.service import LifecycleService
from server_py.services.reference_data.service import ReferenceDataService
from server_py.services.service_requests.service import ServiceRequestService
from server_py.services.basepack_status.service import BasepakStatusService

router = APIRouter()

_state_service: StateManagementService | None = None
_list_service: ListMasterService | None = None
_lifecycle_service: LifecycleService | None = None
_ref_service: ReferenceDataService | None = None
_sr_service: ServiceRequestService | None = None
_bp_status_service: BasepakStatusService | None = None
_paid_bible_service = None
_ccr_service = None   # injected after CCR setup; used to re-evaluate on status change


def init_saga_services(
    state_service: StateManagementService,
    list_service: ListMasterService,
    lifecycle_service: LifecycleService,
    ref_service: ReferenceDataService | None = None,
    sr_service: ServiceRequestService | None = None,
    bp_status_service: BasepakStatusService | None = None,
    paid_bible_service=None,
):
    global _state_service, _list_service, _lifecycle_service, _ref_service
    global _sr_service, _bp_status_service, _paid_bible_service
    _state_service = state_service
    _list_service = list_service
    _lifecycle_service = lifecycle_service
    _ref_service = ref_service
    _sr_service = sr_service
    _bp_status_service = bp_status_service
    _paid_bible_service = paid_bible_service


def set_saga_ccr_service(ccr_service) -> None:
    """Inject the CcrService into the saga router for post-transition trigger evaluation."""
    global _ccr_service
    _ccr_service = ccr_service


class TransitionSagaRequest(BaseModel):
    toStatus: str
    triggeredBy: Optional[str] = None
    metadata: Optional[dict] = None


@router.post("/transition/{entry_id}")
async def execute_transition_saga(entry_id: str, req: TransitionSagaRequest):
    import asyncio
    import logging

    if not _state_service or not _list_service or not _lifecycle_service:
        raise HTTPException(status_code=503, detail="Saga services not initialized")

    saga = build_transition_saga(
        entry_id=entry_id,
        to_status=req.toStatus,
        triggered_by=req.triggeredBy,
        metadata=req.metadata,
        state_service=_state_service,
        list_service=_list_service,
        lifecycle_service=_lifecycle_service,
    )

    result = saga.execute(context={})

    status_code = 200 if result["status"] == "completed" else 400
    if result["status"] != "completed":
        raise HTTPException(status_code=status_code, detail=result)

    # Re-evaluate CCR triggers immediately after a successful status transition.
    # Fired as a background task so it does not block the saga response.
    if _ccr_service is not None:
        async def _run_ccr_eval():
            try:
                eval_result = _ccr_service.evaluate_triggers()
                logging.info(
                    "[CCR trigger engine] post-transition eval: "
                    f"updated={eval_result['updated']} escalated={eval_result['escalated']}"
                )
            except Exception as exc:
                logging.warning(f"[CCR trigger engine] post-transition eval error: {exc}")

        asyncio.create_task(_run_ccr_eval())

    return result


@router.get("/{saga_id}")
async def get_saga(saga_id: str):
    db = SessionLocal()
    try:
        row = db.query(SagaLogModel).filter(SagaLogModel.id == saga_id).first()
        if not row:
            raise HTTPException(status_code=404, detail={"service": "saga", "message": "Saga not found"})
        return {
            "sagaId": row.id,
            "sagaType": row.saga_type,
            "entryId": row.entry_id,
            "status": row.status,
            "steps": row.steps,
            "startedAt": row.started_at.isoformat() if row.started_at else None,
            "completedAt": row.completed_at.isoformat() if row.completed_at else None,
            "error": row.error,
        }
    finally:
        db.close()


@router.get("/entry/{entry_id}")
async def get_sagas_for_entry(entry_id: str):
    db = SessionLocal()
    try:
        rows = db.query(SagaLogModel).filter(
            SagaLogModel.entry_id == entry_id
        ).order_by(SagaLogModel.started_at.desc()).all()
        return [
            {
                "sagaId": row.id,
                "sagaType": row.saga_type,
                "entryId": row.entry_id,
                "status": row.status,
                "steps": row.steps,
                "startedAt": row.started_at.isoformat() if row.started_at else None,
                "completedAt": row.completed_at.isoformat() if row.completed_at else None,
                "error": row.error,
            }
            for row in rows
        ]
    finally:
        db.close()


# ── Reference-Data Fetch Saga ───────────────────────────────────

@router.post("/reference-data")
async def execute_reference_data_saga():
    """
    Execute a saga that fetches all reference data (channels, clusters, depots,
    network change types) in coordinated steps with full saga logging.
    """
    if not _ref_service:
        raise HTTPException(status_code=503, detail="Reference-data service not initialized")

    saga = build_reference_data_saga(ref_service=_ref_service)
    result = saga.execute(context={})

    if result["status"] != "completed":
        raise HTTPException(status_code=400, detail=result)

    # Extract the fetched data from step results
    channels = []
    clusters = []
    depots = []
    network_change_types = []
    for step in result.get("steps", []):
        res = step.get("result") or {}
        if step["name"] == "fetch_channels":
            channels = res.get("channels", [])
        elif step["name"] == "fetch_clusters":
            clusters = res.get("clusters", [])
        elif step["name"] == "fetch_depots":
            depots = res.get("depots", [])
        elif step["name"] == "fetch_network_change_types":
            network_change_types = res.get("networkChangeTypes", [])

    return {
        "sagaId": result["sagaId"],
        "status": result["status"],
        "data": {
            "channels": channels,
            "clusters": clusters,
            "depots": depots,
            "networkChangeTypes": network_change_types,
        },
        "steps": result["steps"],
    }


# ── SR Approval Saga ─────────────────────────────────────────────


class SrApproveRequest(BaseModel):
    stepIndex: int
    actionedBy: str
    comments: Optional[str] = None
    effectiveDate: Optional[str] = None


class SrRejectRequest(BaseModel):
    stepIndex: int
    actionedBy: str
    reason: str


@router.post("/sr-approve/{sr_id}")
async def execute_sr_approve(sr_id: str, req: SrApproveRequest):
    """
    Advance one approval step on a Service Request via the saga layer.
    If this is the final step on a 'basepack-status-change' SR, also applies
    the basepack status override atomically with compensation on failure.
    """
    if not _sr_service or not _bp_status_service:
        raise HTTPException(status_code=503, detail="SR saga services not initialized")

    saga = build_sr_approval_saga(
        sr_id=sr_id,
        sr_service=_sr_service,
        bp_status_service=_bp_status_service,
        list_master_service=_list_service,
        paid_bible_service=_paid_bible_service,
    )
    result = saga.approve(
        step_index=req.stepIndex,
        actioned_by=req.actionedBy,
        comments=req.comments,
        effective_date=req.effectiveDate,
    )

    if result["status"] not in ("completed",):
        raise HTTPException(status_code=400, detail=result)
    return result


@router.post("/sr-reject/{sr_id}")
async def execute_sr_reject(sr_id: str, req: SrRejectRequest):
    """Reject a step on a Service Request via the saga layer."""
    if not _sr_service or not _bp_status_service:
        raise HTTPException(status_code=503, detail="SR saga services not initialized")

    saga = build_sr_approval_saga(
        sr_id=sr_id,
        sr_service=_sr_service,
        bp_status_service=_bp_status_service,
        list_master_service=_list_service,
        paid_bible_service=_paid_bible_service,
    )
    result = saga.reject(
        step_index=req.stepIndex,
        actioned_by=req.actionedBy,
        reason=req.reason,
    )

    if result["status"] == "failed":
        raise HTTPException(status_code=400, detail=result)
    return result

