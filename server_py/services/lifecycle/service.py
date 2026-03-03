from typing import Optional
from server_py.services.lifecycle.engine import compute_lifecycle
from server_py.services.list_master.storage import ListMasterStorage


class LifecycleService:
    def __init__(self, list_storage: ListMasterStorage):
        self.list_storage = list_storage

    def recompute_entry(self, entry_id: str) -> Optional[dict]:
        entry = self.list_storage.get_by_id(entry_id)
        if not entry:
            return None
        return compute_lifecycle(entry)

    def recompute_all(self) -> dict:
        entries = self.list_storage.get_all()
        result = {}
        for entry in entries:
            lifecycle = compute_lifecycle(entry)
            result[entry["id"]] = lifecycle
        return result
