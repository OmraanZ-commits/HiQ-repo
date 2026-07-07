from typing import Optional, List

from fastapi import HTTPException

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
from server_py.services.reference_data.storage import ReferenceDataStorage
from server_py.services.reference_data.ccr_ruleset_storage import CcrRulesetStorage

VALID_STATUSES = {"Active", "Inactive"}
_AUDIT_EXCLUDE = {"attachmentFilename", "attachmentUrl", "changedByUserId", "notes"}


class ReferenceDataService:
    """Business-logic layer for Channel / Cluster / Depot master data."""

    def __init__(self, storage: ReferenceDataStorage):
        self.storage = storage
        self.ccr_storage = CcrRulesetStorage()

    # ── Shared validation helpers ────────────────────────────────

    def _validate_admin_and_attachment(self, user_id: str, filename: str) -> dict:
        """Verify the user exists, has Admin role, and attachment is present. Returns user dict."""
        if not filename or not filename.strip():
            raise HTTPException(status_code=422, detail="attachmentFilename is required (approved email attachment)")
        user = self.storage.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="changedByUserId not found")
        if user["role"] != "Admin":
            raise HTTPException(status_code=403, detail="Only Admin-role users can modify reference data")
        return user

    def _validate_status_update(self, data: RefDataStatusUpdateRequest) -> dict:
        if data.status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail=f"status must be one of: {', '.join(VALID_STATUSES)}")
        return self._validate_admin_and_attachment(data.changedByUserId, data.attachmentFilename)

    # ── Channels ────────────────────────────────────────────────

    def get_all_channels(self) -> List[dict]:
        return self.storage.get_all_channels()

    def get_channel_by_id(self, channel_id: str) -> Optional[dict]:
        return self.storage.get_channel_by_id(channel_id)

    def create_channel(self, data: InsertChannelsMaster) -> dict:
        return self.storage.create_channel(data.model_dump())

    def create_channel_with_audit(self, data: CreateChannelWithAuditRequest) -> dict:
        user = self._validate_admin_and_attachment(data.changedByUserId, data.attachmentFilename)
        entity_data = {k: v for k, v in data.model_dump().items() if k not in _AUDIT_EXCLUDE}
        created = self.storage.create_channel(entity_data)
        self.storage.create_audit_entry(
            entity_type="channel",
            entity_id=created["id"],
            entity_code=created.get("code"),
            action="create",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=None,
            new_status="Active" if data.isActive else "Inactive",
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return created

    def update_channel(self, channel_id: str, data: UpdateChannelsMaster) -> Optional[dict]:
        return self.storage.update_channel(channel_id, data.model_dump(exclude_unset=True))

    def update_channel_status(self, channel_id: str, data: RefDataStatusUpdateRequest) -> dict:
        user = self._validate_status_update(data)
        existing = self.storage.get_channel_by_id(channel_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Channel not found")
        old_status = "Active" if existing["isActive"] else "Inactive"
        updated = self.storage.update_channel_status(channel_id, data.status == "Active")
        self.storage.create_audit_entry(
            entity_type="channel",
            entity_id=channel_id,
            entity_code=existing.get("code"),
            action="update_status",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=old_status,
            new_status=data.status,
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return updated

    def delete_channel(self, channel_id: str) -> bool:
        return self.storage.delete_channel(channel_id)

    # ── Clusters ────────────────────────────────────────────────

    def get_all_clusters(self) -> List[dict]:
        return self.storage.get_all_clusters()

    def get_cluster_by_id(self, cluster_id: str) -> Optional[dict]:
        return self.storage.get_cluster_by_id(cluster_id)

    def create_cluster(self, data: InsertClustersMaster) -> dict:
        return self.storage.create_cluster(data.model_dump())

    def create_cluster_with_audit(self, data: CreateClusterWithAuditRequest) -> dict:
        user = self._validate_admin_and_attachment(data.changedByUserId, data.attachmentFilename)
        entity_data = {k: v for k, v in data.model_dump().items() if k not in _AUDIT_EXCLUDE}
        created = self.storage.create_cluster(entity_data)
        self.storage.create_audit_entry(
            entity_type="cluster",
            entity_id=created["id"],
            entity_code=created.get("name"),
            action="create",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=None,
            new_status="Active" if data.isActive else "Inactive",
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return created

    def update_cluster(self, cluster_id: str, data: UpdateClustersMaster) -> Optional[dict]:
        return self.storage.update_cluster(cluster_id, data.model_dump(exclude_unset=True))

    def update_cluster_status(self, cluster_id: str, data: RefDataStatusUpdateRequest) -> dict:
        user = self._validate_status_update(data)
        existing = self.storage.get_cluster_by_id(cluster_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Cluster not found")
        old_status = "Active" if existing["isActive"] else "Inactive"
        updated = self.storage.update_cluster_status(cluster_id, data.status == "Active")
        self.storage.create_audit_entry(
            entity_type="cluster",
            entity_id=cluster_id,
            entity_code=existing.get("name"),
            action="update_status",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=old_status,
            new_status=data.status,
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return updated

    def delete_cluster(self, cluster_id: str) -> bool:
        return self.storage.delete_cluster(cluster_id)

    # ── Depots ──────────────────────────────────────────────────

    def get_all_depots(self) -> List[dict]:
        return self.storage.get_all_depots()

    def get_depot_by_id(self, depot_id: str) -> Optional[dict]:
        return self.storage.get_depot_by_id(depot_id)

    def create_depot(self, data: InsertDepotsMaster) -> dict:
        return self.storage.create_depot(data.model_dump())

    def create_depot_with_audit(self, data: CreateDepotWithAuditRequest) -> dict:
        user = self._validate_admin_and_attachment(data.changedByUserId, data.attachmentFilename)
        entity_data = {k: v for k, v in data.model_dump().items() if k not in _AUDIT_EXCLUDE}
        created = self.storage.create_depot(entity_data)
        self.storage.create_audit_entry(
            entity_type="depot",
            entity_id=created["id"],
            entity_code=created.get("code"),
            action="create",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=None,
            new_status="Active" if data.isActive else "Inactive",
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return created

    def update_depot(self, depot_id: str, data: UpdateDepotsMaster) -> Optional[dict]:
        return self.storage.update_depot(depot_id, data.model_dump(exclude_unset=True))

    def update_depot_status(self, depot_id: str, data: RefDataStatusUpdateRequest) -> dict:
        user = self._validate_status_update(data)
        existing = self.storage.get_depot_by_id(depot_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Depot not found")
        old_status = "Active" if existing["isActive"] else "Inactive"
        updated = self.storage.update_depot_status(depot_id, data.status == "Active")
        self.storage.create_audit_entry(
            entity_type="depot",
            entity_id=depot_id,
            entity_code=existing.get("code"),
            action="update_status",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=old_status,
            new_status=data.status,
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return updated

    def delete_depot(self, depot_id: str) -> bool:
        return self.storage.delete_depot(depot_id)

    # ── Network Change Types ────────────────────────────────────

    def get_all_network_change_types(self) -> List[dict]:
        return self.storage.get_all_network_change_types()

    def get_network_change_type_by_id(self, type_id: str) -> Optional[dict]:
        return self.storage.get_network_change_type_by_id(type_id)

    def create_network_change_type(self, data: InsertNetworkChangeTypeMaster) -> dict:
        return self.storage.create_network_change_type(data.model_dump())

    def create_network_change_type_with_audit(self, data: CreateNetworkChangeTypeWithAuditRequest) -> dict:
        user = self._validate_admin_and_attachment(data.changedByUserId, data.attachmentFilename)
        entity_data = {k: v for k, v in data.model_dump().items() if k not in _AUDIT_EXCLUDE}
        created = self.storage.create_network_change_type(entity_data)
        self.storage.create_audit_entry(
            entity_type="network_change_type",
            entity_id=created["id"],
            entity_code=created.get("code"),
            action="create",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=None,
            new_status="Active" if data.isActive else "Inactive",
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return created

    def update_network_change_type(self, type_id: str, data: UpdateNetworkChangeTypeMaster) -> Optional[dict]:
        return self.storage.update_network_change_type(type_id, data.model_dump(exclude_unset=True))

    def update_network_change_type_status(self, type_id: str, data: RefDataStatusUpdateRequest) -> dict:
        user = self._validate_status_update(data)
        existing = self.storage.get_network_change_type_by_id(type_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Network change type not found")
        old_status = "Active" if existing["isActive"] else "Inactive"
        updated = self.storage.update_network_change_type_status(type_id, data.status == "Active")
        self.storage.create_audit_entry(
            entity_type="network_change_type",
            entity_id=type_id,
            entity_code=existing.get("code"),
            action="update_status",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=old_status,
            new_status=data.status,
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return updated

    def delete_network_change_type(self, type_id: str) -> bool:
        return self.storage.delete_network_change_type(type_id)

    # ── CCR Ruleset Accounts ─────────────────────────────────────

    def get_all_ccr_accounts(self) -> List[dict]:
        return self.ccr_storage.get_all_accounts()

    def get_ccr_account_by_id(self, account_id: str) -> Optional[dict]:
        return self.ccr_storage.get_account_by_id(account_id)

    def create_ccr_account_with_audit(self, data: CreateCcrAccountWithAuditRequest) -> dict:
        user = self._validate_admin_and_attachment(data.changedByUserId, data.attachmentFilename)
        entity_data = {k: v for k, v in data.model_dump().items() if k not in _AUDIT_EXCLUDE}
        created = self.ccr_storage.create_account(entity_data)
        self.storage.create_audit_entry(
            entity_type="ccr_account",
            entity_id=created["id"],
            entity_code=created["accountName"],
            action="create",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=None,
            new_status="Active" if data.isActive else "Inactive",
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return created

    def update_ccr_account_with_audit(self, account_id: str, data: UpdateCcrAccountWithAuditRequest) -> dict:
        user = self._validate_admin_and_attachment(data.changedByUserId, data.attachmentFilename)
        existing = self.ccr_storage.get_account_by_id(account_id)
        if not existing:
            raise HTTPException(status_code=404, detail="CCR account not found")
        entity_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if k not in _AUDIT_EXCLUDE}
        updated = self.ccr_storage.update_account(account_id, entity_data)
        self.storage.create_audit_entry(
            entity_type="ccr_account",
            entity_id=account_id,
            entity_code=existing["accountName"],
            action="update",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=None,
            new_status=None,
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return updated

    def update_ccr_account_status(self, account_id: str, data: RefDataStatusUpdateRequest) -> dict:
        user = self._validate_status_update(data)
        existing = self.ccr_storage.get_account_by_id(account_id)
        if not existing:
            raise HTTPException(status_code=404, detail="CCR account not found")
        old_status = "Active" if existing["isActive"] else "Inactive"
        updated = self.ccr_storage.update_account_status(account_id, data.status == "Active")
        self.storage.create_audit_entry(
            entity_type="ccr_account",
            entity_id=account_id,
            entity_code=existing["accountName"],
            action="update_status",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=old_status,
            new_status=data.status,
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return updated

    # ── CCR Ruleset Rules ─────────────────────────────────────────

    def get_all_ccr_rules(self) -> List[dict]:
        return self.ccr_storage.get_all_rules()

    def get_ccr_rule_by_id(self, rule_id: str) -> Optional[dict]:
        return self.ccr_storage.get_rule_by_id(rule_id)

    def create_ccr_rule(self, data: CreateCcrRuleWithAuditRequest) -> dict:
        user = self._validate_admin_and_attachment(data.changedByUserId, data.attachmentFilename)
        entity_data = {k: v for k, v in data.model_dump().items() if k not in _AUDIT_EXCLUDE}
        created = self.ccr_storage.create_rule(entity_data)
        acct = self.ccr_storage.get_account_by_id(created["accountId"])
        label = f"{acct['accountName'] if acct else created['accountId']} / {created['changeType']} / {created['eanScenario']}"
        self.storage.create_audit_entry(
            entity_type="ccr_rule",
            entity_id=created["id"],
            entity_code=label,
            action="create",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=None,
            new_status=None,
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return created

    def update_ccr_rule_with_audit(self, rule_id: str, data: UpdateCcrRuleWithAuditRequest) -> dict:
        user = self._validate_admin_and_attachment(data.changedByUserId, data.attachmentFilename)
        existing = self.ccr_storage.get_rule_by_id(rule_id)
        if not existing:
            raise HTTPException(status_code=404, detail="CCR rule not found")
        update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if k not in _AUDIT_EXCLUDE}
        updated = self.ccr_storage.update_rule(rule_id, update_data)
        acct = self.ccr_storage.get_account_by_id(existing["accountId"])
        label = f"{acct['accountName'] if acct else existing['accountId']} / {existing['changeType']} / {existing['eanScenario']}"
        self.storage.create_audit_entry(
            entity_type="ccr_rule",
            entity_id=rule_id,
            entity_code=label,
            action="update",
            changed_by_name=user["name"],
            changed_by_user_id=data.changedByUserId,
            old_status=None,
            new_status=None,
            attachment_filename=data.attachmentFilename,
            attachment_url=data.attachmentUrl,
            notes=data.notes,
        )
        return updated

    # ── Seed (no audit — internal operation) ─────────────────────

    def seed_all(
        self,
        channels: List[dict],
        clusters: List[dict],
        depots: List[dict],
        network_change_types: List[dict] = None,
        cluster_region_states: List[dict] = None,
        ccr_accounts: List[dict] = None,
        ccr_rules: List[dict] = None,
    ):
        self.storage.seed_channels(channels)
        self.storage.seed_clusters(clusters)
        self.storage.seed_depots(depots)
        if network_change_types:
            self.storage.seed_network_change_types(network_change_types)
        if cluster_region_states:
            self.storage.seed_cluster_region_states(cluster_region_states)
        if ccr_accounts:
            account_id_map = self.ccr_storage.seed_accounts(ccr_accounts)
            if ccr_rules and account_id_map:
                resolved_rules = []
                for rule in ccr_rules:
                    acct_name = rule.get("accountName")
                    acct_id = account_id_map.get(acct_name)
                    if acct_id:
                        resolved_rules.append({**rule, "accountId": acct_id})
                self.ccr_storage.seed_rules(resolved_rules)

    # ── Cluster-Region-State Mapping ─────────────────────────────

    def get_cluster_region_map(self) -> List[dict]:
        return self.storage.get_cluster_region_map()

    # ── Geography-Depot Mapping ───────────────────────────────────

    def get_geography_depot_map(self) -> dict:
        from server_py.seed_reference_data import GEOGRAPHY_DEPOT_MAP
        return GEOGRAPHY_DEPOT_MAP

    # ── Audit Log ─────────────────────────────────────────────────

    def get_audit_log(self, entity_type: Optional[str] = None) -> List[dict]:
        return self.storage.get_audit_log(entity_type=entity_type)

    # ── Aggregate ─────────────────────────────────────────────────

    def get_all_reference_data(self) -> dict:
        return {
            "channels": self.get_all_channels(),
            "clusters": self.get_all_clusters(),
            "depots": self.get_all_depots(),
            "networkChangeTypes": self.get_all_network_change_types(),
            "geographyDepotMap": self.get_geography_depot_map(),
            "clusterRegionMap": self.get_cluster_region_map(),
        }
