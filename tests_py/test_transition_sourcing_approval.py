import copy
import unittest
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from server_py.saga.sr_approval_saga import SrApprovalSaga
from server_py.services.list_master.service import ListMasterService
from server_py.services.list_master.storage import ListMasterStorage
from server_py.services.service_requests.service import ServiceRequestService
from server_py.services.service_requests.storage import _row_to_dict
from server_py.services.list_master import storage as list_storage_module


class _NetworkQuery:
    def __init__(self, row):
        self.row = row

    def filter(self, *_predicates):
        return self

    def with_for_update(self):
        return self

    def first(self):
        return self.row


class _NetworkSession:
    def __init__(self, row):
        self.row = row
        self.commits = 0

    def query(self, _model):
        return _NetworkQuery(self.row)

    def commit(self):
        self.commits += 1

    def refresh(self, _row):
        pass

    def close(self):
        pass


class _ApprovalStorage:
    def __init__(self, sr):
        self.sr = sr

    def get_by_id(self, _sr_id):
        return copy.deepcopy(self.sr)

    def update_approvers(self, _sr_id, approvers, status, **_kwargs):
        self.sr["approvers"] = copy.deepcopy(approvers)
        self.sr["status"] = status
        return copy.deepcopy(self.sr)


class _LegacyListMaster:
    def __init__(self):
        self.updated = None
        self.agent_effect = None

    def update_sourcing(self, *args):
        self.updated = args
        return {"id": args[0]}

    def apply_transition_agent_sourcing(self, *args):
        self.agent_effect = args
        return {"id": args[0]}


class TransitionSourcingApprovalTests(unittest.TestCase):
    def test_agent_mapping_is_pending_safe_merged_and_idempotent_on_final_approval(self):
        cbu_id = str(uuid.uuid4())
        network_row = SimpleNamespace(
            id=uuid.UUID(cbu_id),
            depot=["DLGH"],
            sourcing_mode="centralized",
            centralized_geos=["North"],
            centralized_depots=["OLDH"],
            sourcing_depot_mapping={"OLDH": "OLDH"},
        )
        network_session = _NetworkSession(network_row)
        sr = {
            "id": "sr-agent-source",
            "srType": "sourcing-amendment",
            "status": "pending",
            "agentActionKey": "transition-risk:sourcing:CBU-1:ERKH",
            "cbuId": cbu_id,
            "sourcingMode": "centralized",
            "centralizedGeo": [],
            "centralizedDepots": ["DLGH"],
            "addedDepots": ["ERKH"],
            "sourcingDepotMapping": {"ERKH": "DLGH"},
            "pricingComplete": True,
            "sourcingComplete": True,
            "approvers": [
                {"label": "Supply Planner", "status": "pending"},
                {"label": "Demand Planner", "status": "waiting"},
                {"label": "Network Planner", "status": "waiting"},
                {"label": "NCSM", "status": "waiting"},
            ],
        }
        sr_service = ServiceRequestService(_ApprovalStorage(sr))
        list_master = ListMasterService(ListMasterStorage())
        saga = SrApprovalSaga(
            sr["id"], sr_service, bp_status_service=None,
            list_master_service=list_master,
        )

        self.assertEqual(network_row.depot, ["DLGH"])
        self.assertEqual(network_row.centralized_depots, ["OLDH"])
        self.assertEqual(network_row.centralized_geos, ["North"])
        self.assertEqual(network_session.commits, 0)

        with patch.object(list_storage_module, "SessionLocal", lambda: network_session):
            for step_index in range(3):
                result = saga.approve(step_index, "approver")
                self.assertEqual(result["status"], "completed")
                self.assertEqual(network_row.depot, ["DLGH"])
                self.assertEqual(network_row.centralized_depots, ["OLDH"])
                self.assertEqual(network_row.centralized_geos, ["North"])
                self.assertEqual(network_session.commits, 0)

            result = saga.approve(3, "final-approver")
            self.assertEqual(result["status"], "completed")
            self.assertEqual(network_row.depot, ["DLGH", "ERKH"])
            self.assertEqual(network_row.sourcing_mode, "centralized")
            self.assertEqual(network_row.centralized_geos, ["North"])
            self.assertEqual(network_row.centralized_depots, ["OLDH", "DLGH"])
            self.assertEqual(network_row.sourcing_depot_mapping, {
                "OLDH": "OLDH", "ERKH": "DLGH",
            })
            self.assertEqual(network_session.commits, 1)

            # A retried final-approval effect only re-merges the same values.
            saga._apply_sourcing_amendment(sr, "final-approver")
            self.assertEqual(network_row.depot, ["DLGH", "ERKH"])
            self.assertEqual(network_row.centralized_geos, ["North"])
            self.assertEqual(network_row.centralized_depots, ["OLDH", "DLGH"])
            self.assertEqual(network_row.sourcing_depot_mapping, {
                "OLDH": "OLDH", "ERKH": "DLGH",
            })
            self.assertEqual(network_session.commits, 2)

    def test_non_agent_sourcing_request_keeps_legacy_replacement_path(self):
        cbu_id = str(uuid.uuid4())
        list_master = _LegacyListMaster()
        saga = SrApprovalSaga(
            "manual-sr", sr_service=None, bp_status_service=None,
            list_master_service=list_master,
        )
        saga._apply_sourcing_amendment({
            "srType": "sourcing-amendment",
            "cbuId": cbu_id,
            "sourcingMode": "decentralized",
            "centralizedGeo": ["New Geo"],
            "centralizedDepots": ["NEWH"],
        }, "approver")
        self.assertEqual(
            list_master.updated,
            (cbu_id, "decentralized", ["New Geo"], ["NEWH"]),
        )
        self.assertIsNone(list_master.agent_effect)

    def test_storage_serializes_persisted_agent_action_key(self):
        row = SimpleNamespace(
            id=uuid.uuid4(),
            sr_type="sourcing-amendment",
            status="pending",
            raised_by="agent",
            business_group=None,
            brand=None,
            basepack_code=None,
            basepack_name=None,
            business_justification=None,
            materials=[],
            approvers=[],
            rejection_reason=None,
            criteria_met_at_raise=None,
            mstn_coverage_at_raise=None,
            cbu_id=None,
            cbu_code="CBU-1",
            cbu_description=None,
            current_value=None,
            requested_value=None,
            added_geos=[],
            added_depots=["ERKH"],
            added_channels=[],
            sourcing_mode="centralized",
            centralized_geo=[],
            centralized_depots=["DLGH"],
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            agent_action_key="transition-risk:sourcing:CBU-1:ERKH",
            sourcing_depot_mapping={"ERKH": "DLGH"},
        )
        serialized = _row_to_dict(row)
        self.assertEqual(serialized["agentActionKey"], row.agent_action_key)
        self.assertEqual(serialized["sourcingDepotMapping"], {"ERKH": "DLGH"})


if __name__ == "__main__":
    unittest.main()