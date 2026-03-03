from typing import Optional
from server_py.models import STATUS_FLOW, UpdateNetworkEntry
from server_py.services.state_management.storage import StateStorage
from server_py.services.list_master.storage import ListMasterStorage


class StateManagementService:
    def __init__(self, state_storage: StateStorage, list_storage: Optional[ListMasterStorage] = None):
        self.state_storage = state_storage
        self.list_storage = list_storage

    def validate_transition(self, entry_id: str, to_status: str) -> dict:
        if to_status not in STATUS_FLOW:
            raise ValueError(f"Invalid status: {to_status}. Valid statuses: {', '.join(STATUS_FLOW)}")

        current_status = self.state_storage.get_status(entry_id)
        if not current_status:
            raise LookupError(f"No status found for entry {entry_id}")

        current_index = STATUS_FLOW.index(current_status) if current_status in STATUS_FLOW else -1
        target_index = STATUS_FLOW.index(to_status)

        if target_index <= current_index:
            raise ValueError(
                f'Cannot transition from "{current_status}" to "{to_status}". Status can only move forward.'
            )

        if to_status == "Active" and self.list_storage:
            entry = self.list_storage.get_by_id(entry_id)
            if entry:
                errors = []
                if not entry.get("networkChangeDate"):
                    errors.append("Network Change Date is required")
                if not entry.get("startDate"):
                    errors.append("Start Date is required")
                if not entry.get("endDate"):
                    errors.append("End Date is required")
                if entry.get("startDate") and entry.get("networkChangeDate") and entry["startDate"] < entry["networkChangeDate"]:
                    errors.append("Start Date must be on or after Network Change Date")
                if entry.get("startDate") and entry.get("endDate") and entry["endDate"] < entry["startDate"]:
                    errors.append("End Date must be on or after Start Date")
                geo = entry.get("geography") or []
                dep = entry.get("depot") or []
                ch = [c for c in (entry.get("channel") or []) if c != "MT"]
                if len(geo) == 0:
                    errors.append("At least one cluster must be selected")
                if len(dep) == 0:
                    errors.append("At least one depot must be selected")
                if len(ch) == 0:
                    errors.append("At least one channel must be selected")
                if errors:
                    raise ValueError(f"Validation failed for activation: {'; '.join(errors)}")

        return {
            "validated": True,
            "currentStatus": current_status,
            "toStatus": to_status,
            "currentStep": current_index + 1,
            "targetStep": target_index + 1,
        }

    def record_transition(self, entry_id: str, from_status: str, to_status: str, triggered_by: str = None, metadata: dict = None) -> dict:
        transition = self.state_storage.add_transition(
            entry_id=entry_id,
            from_status=from_status,
            to_status=to_status,
            triggered_by=triggered_by,
            metadata=metadata,
        )
        return {
            "transitionId": transition.id,
            "fromStatus": from_status,
            "toStatus": to_status,
        }

    def compensate_transition(self, entry_id: str, from_status: str):
        self.state_storage.set_status(entry_id, from_status)

    def get_status(self, entry_id: str) -> Optional[str]:
        return self.state_storage.get_status(entry_id)

    def get_status_info(self, entry_id: str) -> Optional[dict]:
        status = self.state_storage.get_status(entry_id)
        if not status:
            return None
        current_index = STATUS_FLOW.index(status) if status in STATUS_FLOW else -1
        return {
            "entryId": entry_id,
            "currentStatus": status,
            "currentStep": current_index + 1,
            "totalSteps": len(STATUS_FLOW),
            "canAdvance": current_index < len(STATUS_FLOW) - 1,
            "nextStatus": STATUS_FLOW[current_index + 1] if current_index < len(STATUS_FLOW) - 1 else None,
        }

    def get_history(self, entry_id: str) -> list:
        return self.state_storage.get_history(entry_id)
