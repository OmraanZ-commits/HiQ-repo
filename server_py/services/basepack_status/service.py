from typing import Optional, List

from server_py.models import InsertBasepakStatusOverride
from server_py.services.basepack_status.storage import BasepakStatusStorage


class BasepakStatusService:
    def __init__(self, storage: BasepakStatusStorage):
        self.storage = storage

    def get_all_active(self) -> dict:
        """Returns dict bpId -> status for all active overrides."""
        return self.storage.get_all_active()

    def get_override(self, bp_id: str) -> Optional[dict]:
        return self.storage.get_by_bp_id(bp_id)

    def apply_override(self, data: InsertBasepakStatusOverride) -> dict:
        return self.storage.upsert(data.model_dump())

    def revert_override(self, bp_id: str) -> bool:
        """Compensation: remove active override for a basepack (e.g. SR rejected)."""
        return self.storage.deactivate(bp_id)
