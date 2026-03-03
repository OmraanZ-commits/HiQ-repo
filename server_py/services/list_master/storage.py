import uuid
from datetime import datetime
from typing import Optional
from server_py.models import NetworkEntry, InsertNetworkEntry, UpdateNetworkEntry


class ListMasterStorage:
    def __init__(self):
        self._entries: dict[str, NetworkEntry] = {}

    def seed_entries(self, seeds: list[InsertNetworkEntry]):
        for seed in seeds:
            entry_id = str(uuid.uuid4())
            self._entries[entry_id] = NetworkEntry(
                id=entry_id,
                createdAt=datetime.utcnow().isoformat(),
                **seed.model_dump(),
            )

    def get_all(self) -> list[NetworkEntry]:
        entries = list(self._entries.values())
        entries.sort(key=lambda e: e.createdAt or "", reverse=True)
        return entries

    def get_by_id(self, entry_id: str) -> Optional[NetworkEntry]:
        return self._entries.get(entry_id)

    def create(self, data: InsertNetworkEntry) -> NetworkEntry:
        entry_id = str(uuid.uuid4())
        entry = NetworkEntry(
            id=entry_id,
            createdAt=datetime.utcnow().isoformat(),
            **data.model_dump(),
        )
        self._entries[entry_id] = entry
        return entry

    def update(self, entry_id: str, data: UpdateNetworkEntry) -> Optional[NetworkEntry]:
        existing = self._entries.get(entry_id)
        if not existing:
            return None
        update_data = data.model_dump(exclude_unset=True)
        updated_dict = existing.model_dump()
        updated_dict.update(update_data)
        updated = NetworkEntry(**updated_dict)
        self._entries[entry_id] = updated
        return updated

    def delete(self, entry_id: str) -> bool:
        if entry_id in self._entries:
            del self._entries[entry_id]
            return True
        return False
