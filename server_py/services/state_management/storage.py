import uuid
from datetime import datetime
from typing import Optional
from server_py.models import StateTransition


class StateStorage:
    def __init__(self):
        self._statuses: dict[str, str] = {}
        self._transitions: list[StateTransition] = []

    def seed_statuses(self, entries: list[dict]):
        for entry in entries:
            self._statuses[entry["id"]] = entry["status"]

    def get_status(self, entry_id: str) -> Optional[str]:
        return self._statuses.get(entry_id)

    def set_status(self, entry_id: str, status: str):
        self._statuses[entry_id] = status

    def get_all_statuses(self) -> dict[str, str]:
        return dict(self._statuses)

    def get_history(self, entry_id: str) -> list[StateTransition]:
        transitions = [t for t in self._transitions if t.entryId == entry_id]
        transitions.sort(key=lambda t: t.createdAt, reverse=True)
        return transitions

    def add_transition(
        self,
        entry_id: str,
        from_status: str,
        to_status: str,
        triggered_by: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> StateTransition:
        transition = StateTransition(
            id=str(uuid.uuid4()),
            entryId=entry_id,
            fromStatus=from_status,
            toStatus=to_status,
            transitionDate=datetime.utcnow().strftime("%Y-%m-%d"),
            triggeredBy=triggered_by,
            metadata=metadata,
            createdAt=datetime.utcnow().isoformat(),
        )
        self._transitions.append(transition)
        self._statuses[entry_id] = to_status
        return transition
