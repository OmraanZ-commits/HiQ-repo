"""
Paid Bible Router
Exposes Paid Bible-specific aggregated endpoints under /api/paid-bible/.
Reuses existing network-entries, service-requests, basepack-status services
via the PaidBibleService business logic layer.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException

from server_py.models import BasepakLifecycleDateBase, BasepakLifecycleDateResponse

router = APIRouter()

_service = None


def set_service(svc):
    global _service
    _service = svc


def get_service():
    return _service


# ── Basepacks (aggregated listing-master view) ─────────────────────────────


@router.get("/basepacks")
def list_basepacks():
    """
    Returns all basepacks as aggregated records from network_entries.
    Each record includes derived status, MSTN coverage, SLOB risk,
    price-inactive trigger, lifecycle dates and full list of CBUs.
    """
    if not _service:
        raise HTTPException(status_code=503, detail="PaidBibleService not initialised")
    return _service.get_basepacks()


@router.get("/basepacks/{bp_code}")
def get_basepack_profile(bp_code: str):
    """
    Full profile for a single basepack:
    metadata + CBUs + linked SRs + lifecycle dates + derived/effective status.
    """
    if not _service:
        raise HTTPException(status_code=503, detail="PaidBibleService not initialised")
    profile = _service.get_basepack_profile(bp_code)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Basepack {bp_code} not found")
    return profile


@router.get("/basepacks/{bp_code}/history")
def get_basepack_history(bp_code: str):
    """
    Immutable append-only status-change history for a basepack.
    Ordered newest first.
    """
    if not _service:
        raise HTTPException(status_code=503, detail="PaidBibleService not initialised")
    return _service.get_status_history(bp_code)


@router.get("/basepacks/{bp_code}/cbus")
def list_bp_cbus(bp_code: str):
    """Returns the individual CBU records for a specific basepack."""
    if not _service:
        raise HTTPException(status_code=503, detail="PaidBibleService not initialised")
    all_bps = _service.get_basepacks()
    bp = next((b for b in all_bps if b["basepackCode"] == bp_code), None)
    if not bp:
        raise HTTPException(status_code=404, detail=f"Basepack {bp_code} not found")
    return bp["cbus"]


# ── Triggers ──────────────────────────────────────────────────────────────────


@router.get("/triggers")
def get_triggers():
    """
    Returns two trigger lists for the Paid Bible Action Centre:
    - priceInactive: CBUs with MSTN >= 80% but price not activated
    - slobRisk: CBUs with active SLOB risk flag
    """
    if not _service:
        raise HTTPException(status_code=503, detail="PaidBibleService not initialised")
    return _service.get_triggers()


# ── MOC (Month of Change) ─────────────────────────────────────────────────────


@router.get("/moc")
def get_moc():
    """Returns the current Month of Change window status."""
    if not _service:
        raise HTTPException(status_code=503, detail="PaidBibleService not initialised")
    return _service.get_moc()


# ── Basepack Lifecycle Dates ───────────────────────────────────────────────────


@router.get("/basepack-dates")
def list_basepack_dates():
    """Returns lifecycle key dates (activation, inactive, delist) for all basepacks."""
    if not _service:
        raise HTTPException(status_code=503, detail="PaidBibleService not initialised")
    return _service.get_all_lifecycle_dates()


@router.get("/basepack-dates/{bp_code}")
def get_basepack_date(bp_code: str):
    """Returns lifecycle key dates for a specific basepack."""
    if not _service:
        raise HTTPException(status_code=503, detail="PaidBibleService not initialised")
    result = _service.get_lifecycle_date(bp_code)
    if not result:
        raise HTTPException(status_code=404, detail=f"No lifecycle dates for {bp_code}")
    return result


@router.put("/basepack-dates/{bp_code}")
def upsert_basepack_date(bp_code: str, body: BasepakLifecycleDateBase):
    """
    Upsert (create or update) lifecycle key dates for a basepack.
    Only non-null fields in the body will update the stored values.
    """
    if not _service:
        raise HTTPException(status_code=503, detail="PaidBibleService not initialised")
    return _service.upsert_lifecycle_date(
        bp_code=bp_code,
        activation_date=body.activationDate,
        inactive_date=body.inactiveDate,
        delist_date=body.delistDate,
    )


# ── Service Requests (Paid Bible scoped) ──────────────────────────────────────


@router.get("/service-requests")
def list_paid_bible_srs(sr_type: Optional[str] = None, status: Optional[str] = None):
    """
    Convenience endpoint: returns service requests relevant to the Paid Bible module.
    Delegates to the main /api/service-requests endpoint.
    """
    if not _service:
        raise HTTPException(status_code=503, detail="PaidBibleService not initialised")
    return _service.get_service_requests(sr_type=sr_type, status=status)
