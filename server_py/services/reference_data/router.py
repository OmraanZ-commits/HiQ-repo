from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from server_py.models import (
    InsertChannelsMaster, UpdateChannelsMaster,
    InsertClustersMaster, UpdateClustersMaster,
    InsertDepotsMaster, UpdateDepotsMaster,
    InsertNetworkChangeTypeMaster, UpdateNetworkChangeTypeMaster,
    RefDataStatusUpdateRequest,
    CreateChannelWithAuditRequest,
    CreateClusterWithAuditRequest,
    CreateDepotWithAuditRequest,
    CreateNetworkChangeTypeWithAuditRequest,
    CreateCcrAccountWithAuditRequest,
    UpdateCcrAccountWithAuditRequest,
    UpdateCcrRuleWithAuditRequest,
    InsertCcrRule,
    CreateCcrRuleWithAuditRequest,
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


# ── Audit Log ───────────────────────────────────────────────────

@router.get("/audit-log")
async def get_audit_log(entity_type: Optional[str] = Query(None)):
    return _svc().get_audit_log(entity_type=entity_type)


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
async def create_channel(data: CreateChannelWithAuditRequest):
    return _svc().create_channel_with_audit(data)


@router.patch("/channels/{channel_id}/status")
async def update_channel_status(channel_id: str, data: RefDataStatusUpdateRequest):
    return _svc().update_channel_status(channel_id, data)


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
async def create_cluster(data: CreateClusterWithAuditRequest):
    return _svc().create_cluster_with_audit(data)


@router.patch("/clusters/{cluster_id}/status")
async def update_cluster_status(cluster_id: str, data: RefDataStatusUpdateRequest):
    return _svc().update_cluster_status(cluster_id, data)


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
async def create_depot(data: CreateDepotWithAuditRequest):
    return _svc().create_depot_with_audit(data)


@router.patch("/depots/{depot_id}/status")
async def update_depot_status(depot_id: str, data: RefDataStatusUpdateRequest):
    return _svc().update_depot_status(depot_id, data)


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
async def create_network_change_type(data: CreateNetworkChangeTypeWithAuditRequest):
    return _svc().create_network_change_type_with_audit(data)


@router.patch("/network-change-types/{type_id}/status")
async def update_network_change_type_status(type_id: str, data: RefDataStatusUpdateRequest):
    return _svc().update_network_change_type_status(type_id, data)


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


# ── Cluster-Region-State Mapping ───────────────────────────────

@router.get("/cluster-region-map")
async def get_cluster_region_map():
    """Return the cluster to region code + state mapping."""
    return _svc().get_cluster_region_map()


# ── CCR Ruleset – Accounts ──────────────────────────────────────

@router.get("/ccr-accounts")
async def get_ccr_accounts():
    return _svc().get_all_ccr_accounts()


@router.get("/ccr-accounts/{account_id}")
async def get_ccr_account(account_id: str):
    entry = _svc().get_ccr_account_by_id(account_id)
    if not entry:
        raise HTTPException(status_code=404, detail="CCR account not found")
    return entry


@router.post("/ccr-accounts", status_code=201)
async def create_ccr_account(data: CreateCcrAccountWithAuditRequest):
    return _svc().create_ccr_account_with_audit(data)


@router.patch("/ccr-accounts/{account_id}/status")
async def update_ccr_account_status(account_id: str, data: RefDataStatusUpdateRequest):
    return _svc().update_ccr_account_status(account_id, data)


@router.patch("/ccr-accounts/{account_id}")
async def update_ccr_account(account_id: str, data: UpdateCcrAccountWithAuditRequest):
    return _svc().update_ccr_account_with_audit(account_id, data)


# ── CCR Ruleset – Rules ─────────────────────────────────────────

@router.get("/ccr-rules")
async def get_ccr_rules():
    return _svc().get_all_ccr_rules()


@router.post("/ccr-rules", status_code=201)
async def create_ccr_rule(data: CreateCcrRuleWithAuditRequest):
    return _svc().create_ccr_rule(data)


@router.patch("/ccr-rules/{rule_id}")
async def update_ccr_rule(rule_id: str, data: UpdateCcrRuleWithAuditRequest):
    return _svc().update_ccr_rule_with_audit(rule_id, data)
