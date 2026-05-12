from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from server_py.models import DohIngestRequest, MstnCheckRequest, ClearanceCheckRequest
from server_py.services.mstn_doh.service import MstnDohService

router = APIRouter()
_service: MstnDohService | None = None


def set_service(service: MstnDohService):
    global _service
    _service = service


def _require_service() -> MstnDohService:
    if not _service:
        raise HTTPException(status_code=503, detail="MSTN & DOH service not initialized")
    return _service


@router.get("/window-status")
async def get_window_status():
    """Returns whether the MSTN check window (8th–11th) is currently open."""
    svc = _require_service()
    return svc.window_status()


@router.post("/ingest")
async def ingest_doh(req: DohIngestRequest):
    """Ingest daily DOH file from the source system. Updates predecessor DOH and slob risk flags."""
    svc = _require_service()
    try:
        return svc.ingest_doh(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/doh/{material_code}")
async def get_doh(material_code: str):
    """Get latest DOH snapshot for a specific material code."""
    svc = _require_service()
    result = svc.get_doh(material_code)
    if not result:
        raise HTTPException(status_code=404, detail={"service": "mstn-doh", "message": f"No DOH data for {material_code}"})
    return result


@router.post("/mstn-check")
async def run_mstn_check(req: MstnCheckRequest):
    """
    Run MSTN level check across all materials with networkStatus in
    'Stock Movement Initiated' or 'Network transition complete'.
    Intended to be triggered between the 8th and 11th of each month.
    """
    svc = _require_service()
    try:
        return svc.run_mstn_check(req)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/alerts")
async def get_alerts(
    checkMonth: Optional[str] = Query(None),
    alertType: Optional[str] = Query(None),
):
    """Get active MSTN and SLOB risk alerts."""
    svc = _require_service()
    return svc.get_alerts(check_month=checkMonth, alert_type=alertType)


@router.patch("/alerts/{alert_id}/resolve", status_code=204)
async def resolve_alert(alert_id: str):
    svc = _require_service()
    success = svc.resolve_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail={"service": "mstn-doh", "message": "Alert not found"})


@router.post("/clearance-check")
async def clearance_check(req: ClearanceCheckRequest):
    """
    Evaluate MSTN clearance criteria for a basepack's materials.
    Returns mstnCoverage, criteriaMet, checkMocLabel, and per-material breakdown.
    """
    svc = _require_service()
    return svc.clearance_check(req)


@router.get("/moc-info")
async def moc_info(date: str = Query(..., description="ISO date string YYYY-MM-DD")):
    """Return MOC number, start date, previous MOC and its start date for the given date."""
    svc = _require_service()
    try:
        return svc.moc_info(date)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid date format: {date}. Expected YYYY-MM-DD.")
