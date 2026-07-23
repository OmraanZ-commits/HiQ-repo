from typing import Optional, List
from server_py.models import InsertNetworkEntry, UpdateNetworkEntry
from server_py.services.list_master.storage import ListMasterStorage


class ListMasterService:
    def __init__(self, storage: ListMasterStorage):
        self.storage = storage

    def get_all(self) -> List[dict]:
        return self.storage.get_all()

    def get_by_id(self, entry_id: str) -> Optional[dict]:
        return self.storage.get_by_id(entry_id)

    def create(self, data: InsertNetworkEntry) -> dict:
        return self.storage.create(data)

    def update(self, entry_id: str, data: UpdateNetworkEntry) -> Optional[dict]:
        return self.storage.update(entry_id, data)

    def delete(self, entry_id: str) -> bool:
        return self.storage.delete(entry_id)

    def seed_entries(self, entries: List[InsertNetworkEntry]):
        self.storage.seed_entries(entries)

    def update_status(self, entry_id: str, new_status: str) -> dict:
        entry = self.storage.get_by_id(entry_id)
        if not entry:
            raise LookupError(f"Entry {entry_id} not found")

        previous_status = entry.get("networkStatus", "Draft")
        self.storage.update(entry_id, UpdateNetworkEntry(networkStatus=new_status))

        return {
            "previousStatus": previous_status,
            "newStatus": new_status,
        }

    def compensate_status_update(self, entry_id: str, previous_status: str):
        self.storage.update(entry_id, UpdateNetworkEntry(networkStatus=previous_status))

    def merge_geo_depots(self, entry_id: str, added_geos: list, added_depots: list) -> Optional[dict]:
        return self.storage.merge_geo_depots(entry_id, added_geos, added_depots)

    def remove_geo_depots(self, entry_id: str, removed_geos: list, removed_depots: list) -> Optional[dict]:
        return self.storage.remove_geo_depots(entry_id, removed_geos, removed_depots)

    def merge_channels(self, entry_id: str, added_channels: list) -> Optional[dict]:
        return self.storage.merge_channels(entry_id, added_channels)

    def update_sourcing(self, entry_id: str, sourcing_mode: str,
                        centralized_geos: list, centralized_depots: list) -> Optional[dict]:
        return self.storage.update_sourcing(entry_id, sourcing_mode, centralized_geos, centralized_depots)

    def merge_customer_mapping(self, entry_id: str, requested_customer_mapping: dict) -> Optional[dict]:
        return self.storage.merge_customer_mapping(entry_id, requested_customer_mapping)

    def update_network_change_date(self, entry_id: str, new_date: str) -> Optional[dict]:
        return self.storage.update_network_change_date(entry_id, new_date)

    def merge_activated_depots_by_cbu(self, cbu_code: str, depot_codes: list) -> Optional[dict]:
        return self.storage.merge_activated_depots_by_cbu(cbu_code, depot_codes)
