from server_py.saga.base import SagaOrchestrator, SagaStep
from server_py.services.state_management.service import StateManagementService
from server_py.services.list_master.service import ListMasterService
from server_py.services.lifecycle.service import LifecycleService


def build_transition_saga(
    entry_id: str,
    to_status: str,
    triggered_by: str,
    metadata: dict | None,
    state_service: StateManagementService,
    list_service: ListMasterService,
    lifecycle_service: LifecycleService,
) -> SagaOrchestrator:

    def step_validate(ctx: dict) -> dict:
        result = state_service.validate_transition(entry_id, to_status)
        return {
            "currentStatus": result["currentStatus"],
            "toStatus": result["toStatus"],
        }

    def step_record_transition(ctx: dict) -> dict:
        current_status = ctx["currentStatus"]
        result = state_service.record_transition(
            entry_id=entry_id,
            from_status=current_status,
            to_status=to_status,
            triggered_by=triggered_by,
            metadata=metadata,
        )
        return {"transitionId": result["transitionId"]}

    def compensate_transition(ctx: dict):
        current_status = ctx.get("currentStatus", "Draft")
        state_service.compensate_transition(entry_id, current_status)

    def step_update_entry(ctx: dict) -> dict:
        result = list_service.update_status(entry_id, to_status)
        return {"previousEntryStatus": result["previousStatus"]}

    def compensate_entry_update(ctx: dict):
        previous = ctx.get("previousEntryStatus") or ctx.get("currentStatus", "Draft")
        list_service.compensate_status_update(entry_id, previous)

    def step_recompute_lifecycle(ctx: dict) -> dict:
        result = lifecycle_service.recompute_entry(entry_id)
        return {"lifecycle": result}

    steps = [
        SagaStep(
            name="validate_transition",
            execute_fn=step_validate,
            compensate_fn=None,
        ),
        SagaStep(
            name="record_transition",
            execute_fn=step_record_transition,
            compensate_fn=compensate_transition,
        ),
        SagaStep(
            name="update_entry_status",
            execute_fn=step_update_entry,
            compensate_fn=compensate_entry_update,
        ),
        SagaStep(
            name="recompute_lifecycle",
            execute_fn=step_recompute_lifecycle,
            compensate_fn=None,
        ),
    ]

    return SagaOrchestrator(
        saga_type="status_transition",
        entry_id=entry_id,
        steps=steps,
    )
