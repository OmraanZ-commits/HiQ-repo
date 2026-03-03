from typing import Optional
from server_py.models import UpdateNetworkEntry
from server_py.services.list_master.storage import ListMasterStorage


class ListMasterService:
    def __init__(self, storage: ListMasterStorage):
        self.storage = storage

    def get_entry(self, entry_id: str) -> Optional[dict]:
        return self.storage.get_by_id(entry_id)

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
