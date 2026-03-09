"""
Reference-Data Fetch Saga
─────────────────────────
Uses the saga orchestrator to fetch channels, clusters, depots and network
change types in coordinated steps with automatic compensation on failure.

Steps:
  1. fetch_channels             – load all channel master rows
  2. fetch_clusters             – load all cluster master rows
  3. fetch_depots               – load all depot master rows
  4. fetch_network_change_types – load all network change type master rows

If any step fails the saga will compensate (here compensation is no-op for
pure reads, but the pattern is preserved for consistency and future writes).
"""

from server_py.saga.base import SagaOrchestrator, SagaStep
from server_py.services.reference_data.service import ReferenceDataService


def build_reference_data_saga(
    ref_service: ReferenceDataService,
) -> SagaOrchestrator:

    def step_fetch_channels(ctx: dict) -> dict:
        channels = ref_service.get_all_channels()
        return {"channels": channels}

    def step_fetch_clusters(ctx: dict) -> dict:
        clusters = ref_service.get_all_clusters()
        return {"clusters": clusters}

    def step_fetch_depots(ctx: dict) -> dict:
        depots = ref_service.get_all_depots()
        return {"depots": depots}

    def step_fetch_network_change_types(ctx: dict) -> dict:
        network_change_types = ref_service.get_all_network_change_types()
        return {"networkChangeTypes": network_change_types}

    steps = [
        SagaStep(
            name="fetch_channels",
            execute_fn=step_fetch_channels,
            compensate_fn=None,  # read-only – nothing to compensate
        ),
        SagaStep(
            name="fetch_clusters",
            execute_fn=step_fetch_clusters,
            compensate_fn=None,
        ),
        SagaStep(
            name="fetch_depots",
            execute_fn=step_fetch_depots,
            compensate_fn=None,
        ),
        SagaStep(
            name="fetch_network_change_types",
            execute_fn=step_fetch_network_change_types,
            compensate_fn=None,
        ),
    ]

    return SagaOrchestrator(
        saga_type="reference_data_fetch",
        entry_id="master",        # not tied to a specific entry
        steps=steps,
    )
