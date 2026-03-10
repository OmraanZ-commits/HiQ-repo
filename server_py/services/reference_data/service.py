from typing import Optional, List

from server_py.models import (
    InsertChannelsMaster, UpdateChannelsMaster,
    InsertClustersMaster, UpdateClustersMaster,
    InsertDepotsMaster, UpdateDepotsMaster,
    InsertNetworkChangeTypeMaster, UpdateNetworkChangeTypeMaster,
)
from server_py.services.reference_data.storage import ReferenceDataStorage


class ReferenceDataService:
    """Business-logic layer for Channel / Cluster / Depot master data."""

    def __init__(self, storage: ReferenceDataStorage):
        self.storage = storage

    # ── Channels ────────────────────────────────────────────────

    def get_all_channels(self) -> List[dict]:
        return self.storage.get_all_channels()

    def get_channel_by_id(self, channel_id: str) -> Optional[dict]:
        return self.storage.get_channel_by_id(channel_id)

    def create_channel(self, data: InsertChannelsMaster) -> dict:
        return self.storage.create_channel(data.model_dump())

    def update_channel(self, channel_id: str, data: UpdateChannelsMaster) -> Optional[dict]:
        return self.storage.update_channel(channel_id, data.model_dump(exclude_unset=True))

    def delete_channel(self, channel_id: str) -> bool:
        return self.storage.delete_channel(channel_id)

    # ── Clusters ────────────────────────────────────────────────

    def get_all_clusters(self) -> List[dict]:
        return self.storage.get_all_clusters()

    def get_cluster_by_id(self, cluster_id: str) -> Optional[dict]:
        return self.storage.get_cluster_by_id(cluster_id)

    def create_cluster(self, data: InsertClustersMaster) -> dict:
        return self.storage.create_cluster(data.model_dump())

    def update_cluster(self, cluster_id: str, data: UpdateClustersMaster) -> Optional[dict]:
        return self.storage.update_cluster(cluster_id, data.model_dump(exclude_unset=True))

    def delete_cluster(self, cluster_id: str) -> bool:
        return self.storage.delete_cluster(cluster_id)

    # ── Depots ──────────────────────────────────────────────────

    def get_all_depots(self) -> List[dict]:
        return self.storage.get_all_depots()

    def get_depot_by_id(self, depot_id: str) -> Optional[dict]:
        return self.storage.get_depot_by_id(depot_id)

    def create_depot(self, data: InsertDepotsMaster) -> dict:
        return self.storage.create_depot(data.model_dump())

    def update_depot(self, depot_id: str, data: UpdateDepotsMaster) -> Optional[dict]:
        return self.storage.update_depot(depot_id, data.model_dump(exclude_unset=True))

    def delete_depot(self, depot_id: str) -> bool:
        return self.storage.delete_depot(depot_id)

    # ── Network Change Types ────────────────────────────────────

    def get_all_network_change_types(self) -> List[dict]:
        return self.storage.get_all_network_change_types()

    def get_network_change_type_by_id(self, type_id: str) -> Optional[dict]:
        return self.storage.get_network_change_type_by_id(type_id)

    def create_network_change_type(self, data: InsertNetworkChangeTypeMaster) -> dict:
        return self.storage.create_network_change_type(data.model_dump())

    def update_network_change_type(self, type_id: str, data: UpdateNetworkChangeTypeMaster) -> Optional[dict]:
        return self.storage.update_network_change_type(type_id, data.model_dump(exclude_unset=True))

    def delete_network_change_type(self, type_id: str) -> bool:
        return self.storage.delete_network_change_type(type_id)

    # ── Seed ────────────────────────────────────────────────

    def seed_all(
        self,
        channels: List[dict],
        clusters: List[dict],
        depots: List[dict],
        network_change_types: List[dict] = None,
    ):
        self.storage.seed_channels(channels)
        self.storage.seed_clusters(clusters)
        self.storage.seed_depots(depots)
        if network_change_types:
            self.storage.seed_network_change_types(network_change_types)

    # ── Geography-Depot Mapping ────────────────────────────────

    def get_geography_depot_map(self) -> dict:
        """Return the geography to depot mapping from seed data."""
        from server_py.seed_reference_data import GEOGRAPHY_DEPOT_MAP
        return GEOGRAPHY_DEPOT_MAP

    # ── Aggregate (used by saga) ──────────────────────────────

    def get_all_reference_data(self) -> dict:
        """Return channels, clusters, depots, network change types and geography-depot map in a single call."""
        return {
            "channels": self.get_all_channels(),
            "clusters": self.get_all_clusters(),
            "depots": self.get_all_depots(),
            "networkChangeTypes": self.get_all_network_change_types(),
            "geographyDepotMap": self.get_geography_depot_map(),
        }
