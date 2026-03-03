from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from server_py.db import SessionLocal, SagaLogModel
from server_py.saga.transition_saga import build_transition_saga
from server_py.services.state_management.service import StateManagementService
from server_py.services.list_master.service import ListMasterService
from server_py.services.lifecycle.service import LifecycleService

router = APIRouter()

_state_service: StateManagementService | None = None
_list_service: ListMasterService | None = None
_lifecycle_service: LifecycleService | None = None


def init_saga_services(
    state_service: StateManagementService,
    list_service: ListMasterService,
    lifecycle_service: LifecycleService,
):
    global _state_service, _list_service, _lifecycle_service
    _state_service = state_service
    _list_service = list_service
    _lifecycle_service = lifecycle_service


class TransitionSagaRequest(BaseModel):
    toStatus: str
    triggeredBy: Optional[str] = None
    metadata: Optional[dict] = None


@router.post("/transition/{entry_id}")
async def execute_transition_saga(entry_id: str, req: TransitionSagaRequest):
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
