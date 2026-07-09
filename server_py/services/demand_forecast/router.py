from fastapi import APIRouter

from server_py.services.demand_forecast.service import DemandForecastService

router = APIRouter()
_service: DemandForecastService | None = None


def set_service(service: DemandForecastService):
    global _service
    _service = service


def _svc() -> DemandForecastService:
    assert _service is not None, "DemandForecastService not initialized"
    return _service


@router.get("/{basepack}")
async def get_demand_forecast(basepack: str):
    return _svc().get_by_basepack(basepack)
