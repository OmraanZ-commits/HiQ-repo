from datetime import date, timedelta

import unittest
from unittest.mock import patch

from server_py.db import DepotStockModel
from server_py.models import ClearanceCheckMaterial, ClearanceCheckRequest
from server_py.seed_data import SEEDS
from server_py.services.mstn_doh.service import MstnDohService
from server_py.services.mstn_doh.storage import MstnDohStorage
from server_py.services.mstn_doh import storage as mstn_storage_module
from server_py.services.paid_bible.storage import _derive_bp_status
from server_py.services.service_requests.service import ServiceRequestService
from server_py.db import DemandForecastEntryModel, NetworkEntryModel
from server_py.services.transition_risk import storage as stock_storage_module
from server_py.services.transition_risk.service import TransitionRiskService
from server_py.services.transition_risk.storage import TransitionRiskStorage


class _FakeQuery:
    def __init__(self, rows):
        self.rows = rows
        self.predicates = []

    def filter(self, *predicates):
        self.predicates.extend(predicates)
        return self

    def first(self):
        rows = self.all()
        return rows[0] if rows else None

    def all(self):
        rows = self.rows
        for predicate in self.predicates:
            field = getattr(predicate.left, "key", None)
            expected = getattr(predicate.right, "value", None)
            if field:
                rows = [row for row in rows if getattr(row, field) == expected]
        return rows


class _FakeStockSession:
    def __init__(self, rows):
        self.rows = rows

    def query(self, _model):
        return _FakeQuery(self.rows)

    def add(self, row):
        self.rows.append(row)

    def commit(self):
        pass

    def close(self):
        pass


class TransitionRiskTests(unittest.TestCase):
    def test_stock_seed_is_idempotent_and_never_overwrites_existing_rows(self):
        existing = DepotStockModel(
            cbu_code="CBU-50007890",
            basepack_code="BP-700",
            depot_code="DLGH",
            quantity_cases=777,
            snapshot_date=date.today() - timedelta(days=1),
        )
        rows = [existing]
        with patch.object(stock_storage_module, "SessionLocal",
                          lambda: _FakeStockSession(rows)):
            storage = TransitionRiskStorage()
            storage.seed_depot_stock()
            initial_count = len(rows)
            storage.seed_depot_stock()

        self.assertEqual(initial_count, 6)
        self.assertEqual(len(rows), initial_count)
        self.assertEqual(rows[0].quantity_cases, 777)
        self.assertEqual(rows[0].snapshot_date, date.today() - timedelta(days=1))
        self.assertTrue(any(row.depot_code == "ERKH" and row.quantity_cases > 0 for row in rows))
        activation_stock = [row for row in rows if row.cbu_code == "CBU-99149003"]
        self.assertEqual({row.depot_code for row in activation_stock}, {"DLGH"})
        self.assertTrue(all(row.quantity_cases > 0 and row.snapshot_date == date.today()
                            for row in activation_stock))
        sourcing_stock = [row for row in rows if row.cbu_code == "CBU-99149002"]
        self.assertEqual({row.depot_code for row in sourcing_stock}, {"DLGH", "MMDH", "ERKH"})
        self.assertTrue(all(row.quantity_cases > 0 and row.snapshot_date == date.today()
                            for row in sourcing_stock))

    def test_additive_activation_seed_passes_existing_clearance_check(self):
        seed = next(row for row in SEEDS if row.basepack == "BP-TR-READY-03")
        source_seed = next(row for row in SEEDS if row.basepack == "BP-TR-SOURCE")
        self.assertEqual(seed.cbuCode, "CBU-99149003")
        self.assertEqual(source_seed.cbuCode, "CBU-99149002")
        self.assertEqual(source_seed.depot, ["DLGH", "MMDH"])
        self.assertTrue(source_seed.priceActive)
        self.assertEqual(source_seed.sourcingMatrixSection, "Updated")
        self.assertEqual(seed.networkStatus, "Pricing Updated")
        self.assertEqual(_derive_bp_status([seed.model_dump()]), "Draft")
        self.assertTrue(seed.priceActive)
        self.assertEqual(seed.networkChangeDate, date.today().isoformat())
        self.assertEqual(seed.dohSnapshotDate, date.today().isoformat())
        self.assertEqual(seed.depot, ["DLGH"])
        self.assertEqual(seed.mstnPercentage, 100)
        self.assertEqual(seed.mstnByDepot, {"DLGH": 100})
        result = MstnDohService(storage=None).clearance_check(ClearanceCheckRequest(
            materials=[ClearanceCheckMaterial(
                code=seed.cbuCode,
                description=seed.materialDescription,
                mstnPct=seed.mstnPercentage,
                mstnByDepot=seed.mstnByDepot,
                networkChangeDate=seed.networkChangeDate,
                typeOfNetworkCode=seed.typeOfNetwork,
            )]
        ))
        self.assertTrue(result["criteriaMet"])
        self.assertEqual(result["mstnCoverage"], 100)

    def test_global_refresh_exempts_only_the_stable_transition_activation_fixture(self):
        statements = []

        class RefreshResult:
            rowcount = 1

        class RefreshSession:
            def execute(self, statement):
                statements.append(str(statement))
                return RefreshResult()

            def commit(self):
                pass

            def close(self):
                pass

        with patch.object(mstn_storage_module, "SessionLocal", RefreshSession):
            MstnDohStorage().refresh_depot_scores()
        self.assertIn("AND NOT (cbu_code = 'CBU-99149003' AND basepack = 'BP-TR-READY-03')",
                      statements[0])
        self.assertIn("WHERE mstn_by_depot IS NOT NULL", statements[0])


class _ActionStorage:
    def __init__(self):
        self.pending = {}
        self.manual_pending = []

    def get_pending_by_agent_action_key(self, key):
        row = self.pending.get(key)
        return row if row and row["status"] == "pending" else None

    def get_all(self, sr_type=None, status=None, business_group=None):
        del sr_type, business_group
        return ([row for row in self.pending.values() if not status or row["status"] == status]
                + [row for row in self.manual_pending
                   if not status or row["status"] == status])


class _SrService:
    def __init__(self):
        self.storage = _ActionStorage()
        self.raised = []

    def raise_sr(self, data, agent_action_key=None):
        self.raised.append((data, agent_action_key))
        result = {
            "id": f"request-{len(self.raised)}",
            "status": "pending",
            "srType": data.srType,
            "effectiveDate": data.effectiveDate,
            "approvers": ["existing approval chain"],
        }
        self.storage.pending[agent_action_key] = result
        return result


class _StockRows:
    def __init__(self, rows):
        self.rows = rows

    def get_depot_stock(self):
        return self.rows


class _Reference:
    def get_all_depots(self):
        return [{"code": "DLGH", "isActive": True}, {"code": "ERKH", "isActive": True}]


class _Mstn:
    def __init__(self, criteria_met=True):
        self.criteria_met = criteria_met

    def clearance_check(self, _request):
        return {
            "criteriaMet": self.criteria_met,
            "mstnCoverage": 100,
            "materials": [{
                "code": material.code,
                "mstnByDepot": material.mstnByDepot,
            } for material in _request.materials],
        }


class _NoOverrideQuery:
    def filter(self, *_args):
        return self

    def order_by(self, *_args):
        return self

    def first(self):
        return None


class _NoOverrideSession:
    def query(self, _model):
        return _NoOverrideQuery()

    def close(self):
        pass


class _ValidationQuery:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *_args):
        return self

    def order_by(self, *_args):
        return self

    def first(self):
        return self.rows[0] if self.rows else None

    def all(self):
        return self.rows


class _ValidationSession:
    def __init__(self, entry):
        self.entry = entry

    def query(self, model):
        return _ValidationQuery(
            [self.entry] if model is NetworkEntryModel else []
            if model is DemandForecastEntryModel else []
        )

    def close(self):
        pass


class _CaptureSrStorage(_ActionStorage):
    def __init__(self):
        super().__init__()
        self.created = []

    def create(self, data):
        self.created.append(data)
        return {**data, "id": "sr-created", "status": "pending"}


def _sourcing_service(stock_rows):
    sr = _SrService()
    entries = [{
        "id": "entry-1",
        "cbuCode": "CBU-1",
        "basepack": "BP-1",
        "basepackDescription": "Pack 1",
        "materialDescription": "Pack 1 material",
        "depot": ["DLGH"],
        "bg": "Foods",
        "brand": "Brand",
    }]
    svc = TransitionRiskService(
        _StockRows(stock_rows), sr, type("List", (), {"get_all": lambda self: entries})(),
        _Reference(), _Mstn(),
    )
    return svc, sr


def _stock(quantity=10, snapshot=None):
    return {
        "id": "stock-1",
        "cbuCode": "CBU-1",
        "basepackCode": "BP-1",
        "depotCode": "ERKH",
        "quantityCases": quantity,
        "snapshotDate": (snapshot or date.today()).isoformat(),
    }


def _mapped_stock(cbu="CBU-1", basepack="BP-1", depot="DLGH",
                  quantity=10, snapshot=None):
    return {
        "id": "stock-mapped",
        "cbuCode": cbu,
        "basepackCode": basepack,
        "depotCode": depot,
        "quantityCases": quantity,
        "snapshotDate": (snapshot or date.today()).isoformat(),
    }


class TransitionRiskServiceTests(unittest.TestCase):
    def test_centralized_source_must_be_currently_mapped_to_selected_cbu(self):
        svc, _ = _sourcing_service([_stock()])
        with self.assertRaisesRegex(ValueError, "must be currently mapped"):
            svc.request_sourcing_amendment(
                "CBU-1", "ERKH", "2099-01-01", "centralized", "ERKH"
            )

    def test_activation_requires_and_uses_clearance_check_criteria(self):
        entry = {
            "id": "entry-1",
            "cbuCode": "CBU-1",
            "basepack": "BP-1",
            "basepackDescription": "Pack 1",
            "materialDescription": "Pack 1 material",
            "networkStatus": "Pricing Updated",
            "mstnPercentage": 86,
            "mstnByDepot": {"DLGH": 86},
            "depot": ["DLGH"],
        }
        sr = _SrService()
        svc = TransitionRiskService(
            _StockRows([_mapped_stock()]), sr, type("List", (), {"get_all": lambda self: [entry]})(),
            _Reference(), _Mstn(criteria_met=False),
        )
        with patch("server_py.services.transition_risk.service.SessionLocal",
                   _NoOverrideSession):
            with self.assertRaisesRegex(ValueError, "criteriaMet is false"):
                svc.request_activation("BP-1", "2099-01-01")
            self.assertEqual(sr.raised, [])

            svc.mstn_service = _Mstn(criteria_met=True)
            raised = svc.request_activation("BP-1", "2099-01-01")
        self.assertFalse(raised["existing"])
        self.assertTrue(sr.raised[0][0].criteriaMetAtRaise)
        decisions = sr.raised[0][0].depotDecisions
        self.assertEqual(len(decisions), 1)
        self.assertEqual(decisions[0]["cbuCode"], "CBU-1")
        self.assertEqual(decisions[0]["depotCode"], "DLGH")
        self.assertEqual(decisions[0]["ncsmDecision"], "pending")
        self.assertEqual(decisions[0]["activationStatus"], "Pending")
        self.assertEqual(entry["networkStatus"], "Pricing Updated")
        self.assertEqual(entry["depot"], ["DLGH"])
        self.assertEqual(raised["request"]["status"], "pending")

    def test_activation_rejects_missing_or_stale_mapped_depot_stock(self):
        entry = {
            "id": "entry-1", "cbuCode": "CBU-1", "basepack": "BP-1",
            "networkStatus": "Pricing Updated", "mstnPercentage": 86,
            "mstnByDepot": {"DLGH": 86}, "depot": ["DLGH"],
        }
        cases = [
            ([], "No explicit depot stock"),
            ([_mapped_stock(snapshot=date.today() - timedelta(days=31))], "stale"),
        ]
        for stock_rows, message in cases:
            with self.subTest(message=message):
                sr = _SrService()
                svc = TransitionRiskService(
                    _StockRows(stock_rows), sr,
                    type("List", (), {"get_all": lambda self: [entry]})(),
                    _Reference(), _Mstn(),
                )
                with patch("server_py.services.transition_risk.service.SessionLocal",
                           _NoOverrideSession):
                    with self.assertRaisesRegex(ValueError, message):
                        svc.request_activation("BP-1", "2099-01-01")
                self.assertEqual(sr.raised, [])

    def test_manual_pending_sr_deduplicates_agent_actions(self):
        svc, sr = _sourcing_service([])
        manual = {
            "id": "manual-sr", "status": "pending", "cbuCode": "CBU-1",
            "addedDepots": ["ERKH"], "srType": "sourcing-amendment",
        }
        sr.storage.manual_pending.append(manual)
        result = svc.request_sourcing_amendment(
            "CBU-1", "ERKH", "2099-01-01", "decentralized"
        )
        self.assertEqual(result, {"request": manual, "existing": True})
        self.assertEqual(sr.raised, [])

        activation = {
            "id": "manual-activation", "status": "pending", "basepackCode": "BP-1",
            "targetStatus": "Active Pack", "srType": "basepack-status-change",
        }
        sr.storage.manual_pending.append(activation)
        result = svc.request_activation("BP-1", "2099-01-01")
        self.assertEqual(result, {"request": activation, "existing": True})
        self.assertEqual(sr.raised, [])

    def test_sourcing_seed_builds_complete_existing_validation_summary(self):
        entry = type("Entry", (), {
            "id": "source-entry",
            "cbu_code": "CBU-99149002",
            "basepack": "BP-TR-SOURCE",
            "basepack_description": "Transition Agent Sourcing Sample",
            "material_description": "Transition Agent Sourcing Sample 500g",
            "bg": "Foods",
            "brand": "Transition Sample",
            "depot": ["DLGH", "MMDH"],
            "channel_mapping": {},
            "sourcing_mode": "decentralized",
            "price_active": True,
            "mstn_percentage": 86,
            "centralized_depots": [],
            "centralized_geos": [],
        })()
        sr_storage = _CaptureSrStorage()
        sr_service = ServiceRequestService(sr_storage)
        source_stock = _stock(quantity=88)
        source_stock.update({
            "cbuCode": "CBU-99149002",
            "basepackCode": "BP-TR-SOURCE",
        })
        transition_service = TransitionRiskService(
            _StockRows([source_stock]),
            sr_service,
            type("List", (), {"get_all": lambda self: [{
                "id": "source-entry",
                "cbuCode": "CBU-99149002",
                "basepack": "BP-TR-SOURCE",
                "basepackDescription": "Transition Agent Sourcing Sample",
                "materialDescription": "Transition Agent Sourcing Sample 500g",
                "depot": ["DLGH", "MMDH"],
                "channelMapping": {},
                "bg": "Foods",
                "brand": "Transition Sample",
            }]})(),
            _Reference(),
            _Mstn(),
        )
        with patch("server_py.services.service_requests.service.SessionLocal",
                   lambda: _ValidationSession(entry)):
            result = transition_service.request_sourcing_amendment(
                "CBU-99149002", "ERKH", "2099-01-01", "centralized", "DLGH"
            )
        self.assertFalse(result["existing"])
        stored = sr_storage.created[0]
        self.assertTrue(stored["pricingComplete"])
        self.assertTrue(stored["sourcingComplete"])
        self.assertEqual(stored["validationSummary"]["priceCheck"]["status"], "Available")
        self.assertEqual(stored["validationSummary"]["sourcingMatrixCheck"]["status"], "Complete")

    def test_sourcing_rejects_missing_stale_or_nonpositive_stock(self):
        cases = [
            ([], "No explicit depot stock"),
            ([_stock(snapshot=date.today() - timedelta(days=31))], "stale"),
            ([_stock(quantity=0)], "positive"),
        ]
        for rows, message in cases:
            with self.subTest(message=message):
                svc, _ = _sourcing_service(rows)
                with self.assertRaisesRegex(ValueError, message):
                    svc.request_sourcing_amendment(
                        "CBU-1", "ERKH", "2099-01-01", "decentralized"
                    )

    def test_duplicate_agent_action_returns_pending_sr_and_approval_stays_pending(self):
        svc, sr = _sourcing_service([_stock(quantity=84)])
        request = svc.request_sourcing_amendment(
            "CBU-1", "ERKH", "2099-01-01", "centralized", "DLGH"
        )
        # Repeat after evidence has disappeared; an already-pending action is
        # still returned without requiring refreshed eligibility evidence.
        svc.storage.rows = []
        duplicate = svc.request_sourcing_amendment(
            "CBU-1", "ERKH", "2099-01-01", "centralized", "DLGH"
        )
        self.assertFalse(request["existing"])
        self.assertEqual(duplicate, {"request": request["request"], "existing": True})
        self.assertEqual(len(sr.raised), 1)
        raised, action_key = sr.raised[0]
        self.assertEqual(raised.addedDepots, ["ERKH"])
        self.assertEqual(raised.sourcingDepotMapping, {"ERKH": "DLGH"})
        self.assertIn("84 cases", raised.businessJustification)
        self.assertIn(date.today().isoformat(), raised.businessJustification)
        self.assertEqual(request["request"]["status"], "pending")

        # Once approved, the partial unique key is released and a later action
        # is allowed. Submission itself never changes the network mapping.
        sr.storage.pending[action_key]["status"] = "approved"
        svc.storage.rows = [_stock(quantity=84)]
        next_action = svc.request_sourcing_amendment(
            "CBU-1", "ERKH", "2099-01-01", "centralized", "DLGH"
        )
        self.assertFalse(next_action["existing"])
        self.assertEqual(len(sr.raised), 2)