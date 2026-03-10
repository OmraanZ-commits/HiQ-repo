from fastapi import APIRouter, HTTPException

from server_py.models import (
    InsertChannelsMaster, UpdateChannelsMaster,
    InsertClustersMaster, UpdateClustersMaster,
    InsertDepotsMaster, UpdateDepotsMaster,
    InsertNetworkChangeTypeMaster, UpdateNetworkChangeTypeMaster,
)
from server_py.services.reference_data.service import ReferenceDataService
from server_py.services.reference_data.storage import ReferenceDataStorage

router = APIRouter()
_service: ReferenceDataService | None = None


def set_service(service: ReferenceDataService):
    global _service
    _service = service


def get_service() -> ReferenceDataService | None:
    return _service


def _svc() -> ReferenceDataService:
    if not _service:
        raise HTTPException(status_code=503, detail="Reference-data service not initialized")
    return _service


# ── Aggregate endpoint ──────────────────────────────────────────

@router.get("")
@router.get("/")
async def get_all_reference_data():
    return _svc().get_all_reference_data()


# ── Channels ────────────────────────────────────────────────────

@router.get("/channels")
async def get_channels():
    return _svc().get_all_channels()


@router.get("/channels/{channel_id}")
async def get_channel(channel_id: str):
    entry = _svc().get_channel_by_id(channel_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Channel not found")
    return entry


@router.post("/channels", status_code=201)
async def create_channel(data: InsertChannelsMaster):
    return _svc().create_channel(data)


@router.patch("/channels/{channel_id}")
async def update_channel(channel_id: str, data: UpdateChannelsMaster):
    entry = _svc().update_channel(channel_id, data)
    if not entry:
        raise HTTPException(status_code=404, detail="Channel not found")
    return entry


@router.delete("/channels/{channel_id}", status_code=204)
async def delete_channel(channel_id: str):
    if not _svc().delete_channel(channel_id):
        raise HTTPException(status_code=404, detail="Channel not found")


# ── Clusters ────────────────────────────────────────────────────

@router.get("/clusters")
async def get_clusters():
    return _svc().get_all_clusters()


@router.get("/clusters/{cluster_id}")
async def get_cluster(cluster_id: str):
    entry = _svc().get_cluster_by_id(cluster_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return entry


@router.post("/clusters", status_code=201)
async def create_cluster(data: InsertClustersMaster):
    return _svc().create_cluster(data)


@router.patch("/clusters/{cluster_id}")
async def update_cluster(cluster_id: str, data: UpdateClustersMaster):
    entry = _svc().update_cluster(cluster_id, data)
    if not entry:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return entry


@router.delete("/clusters/{cluster_id}", status_code=204)
async def delete_cluster(cluster_id: str):
    if not _svc().delete_cluster(cluster_id):
        raise HTTPException(status_code=404, detail="Cluster not found")


# ── Depots ──────────────────────────────────────────────────────

@router.get("/depots")
async def get_depots():
    return _svc().get_all_depots()


@router.get("/depots/{depot_id}")
async def get_depot(depot_id: str):
    entry = _svc().get_depot_by_id(depot_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Depot not found")
    return entry


@router.post("/depots", status_code=201)
async def create_depot(data: InsertDepotsMaster):
    return _svc().create_depot(data)


@router.patch("/depots/{depot_id}")
async def update_depot(depot_id: str, data: UpdateDepotsMaster):
    entry = _svc().update_depot(depot_id, data)
    if not entry:
        raise HTTPException(status_code=404, detail="Depot not found")
    return entry


@router.delete("/depots/{depot_id}", status_code=204)
async def delete_depot(depot_id: str):
    if not _svc().delete_depot(depot_id):
        raise HTTPException(status_code=404, detail="Depot not found")


# ── Network Change Types ────────────────────────────────────

@router.get("/network-change-types")
async def get_network_change_types():
    return _svc().get_all_network_change_types()


@router.get("/network-change-types/{type_id}")
async def get_network_change_type(type_id: str):
    entry = _svc().get_network_change_type_by_id(type_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Network change type not found")
    return entry


@router.post("/network-change-types", status_code=201)
async def create_network_change_type(data: InsertNetworkChangeTypeMaster):
    return _svc().create_network_change_type(data)


@router.patch("/network-change-types/{type_id}")
async def update_network_change_type(type_id: str, data: UpdateNetworkChangeTypeMaster):
    entry = _svc().update_network_change_type(type_id, data)
    if not entry:
        raise HTTPException(status_code=404, detail="Network change type not found")
    return entry


@router.delete("/network-change-types/{type_id}", status_code=204)
async def delete_network_change_type(type_id: str):
    if not _svc().delete_network_change_type(type_id):
        raise HTTPException(status_code=404, detail="Network change type not found")


# ── Geography-Depot Mapping ────────────────────────────────────

@router.get("/geography-depot-map")
async def get_geography_depot_map():
    """Return the geography to depot mapping."""
    return _svc().get_geography_depot_map()
