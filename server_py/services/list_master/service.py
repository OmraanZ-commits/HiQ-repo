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
