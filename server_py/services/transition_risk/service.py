from datetime import date, timedelta

from sqlalchemy.exc import IntegrityError

from server_py.db import BasepakStatusOverrideModel, SessionLocal
from server_py.models import ClearanceCheckMaterial, ClearanceCheckRequest, InsertServiceRequest
from server_py.services.mstn_doh.service import _MSTN_THRESHOLD
from server_py.services.paid_bible.storage import _derive_bp_status
from server_py.services.service_requests.service import ServiceRequestService
from server_py.services.transition_risk.storage import TransitionRiskStorage


STOCK_MAX_AGE_DAYS = 30


class TransitionRiskService:
    def __init__(self, storage: TransitionRiskStorage, sr_service: ServiceRequestService,
                 list_service, reference_service, mstn_service):
        self.storage = storage
        self.sr_service = sr_service
        self.list_service = list_service
        self.reference_service = reference_service
        self.mstn_service = mstn_service

    def get_depot_stock(self) -> list[dict]:
        return self.storage.get_depot_stock()

    @staticmethod
    def _future_date(value: str) -> None:
        try:
            effective = date.fromisoformat(value[:10])
        except (TypeError, ValueError):
            raise ValueError("effectiveDate must be a valid ISO date")
        if effective <= date.today():
            raise ValueError("effectiveDate must be strictly greater than today")

    def _find_pending(self, key: str):
        return self.sr_service.storage.get_pending_by_agent_action_key(key)

    def _find_pending_activation(self, basepack_code: str) -> dict | None:
        return next((request for request in self.sr_service.storage.get_all(status="pending")
                     if (request.get("basepackCode") or request.get("basepakCode")) == basepack_code
                     and (request.get("targetStatus") or request.get("requestedValue")) == "Active Pack"),
                    None)

    def _find_pending_sourcing(self, cbu_code: str, depot_code: str) -> dict | None:
        return next((request for request in self.sr_service.storage.get_all(status="pending")
                     if request.get("cbuCode") == cbu_code
                     and depot_code in (request.get("addedDepots") or [])),
                    None)

    @staticmethod
    def _require_fresh_positive_stock(stock_rows: list[dict], cbu_code: str,
                                      basepack_code: str, depot_code: str) -> dict:
        stock = next((row for row in stock_rows
                      if row["cbuCode"] == cbu_code
                      and row["basepackCode"] == basepack_code
                      and row["depotCode"] == depot_code), None)
        if not stock:
            raise ValueError(
                f"No explicit depot stock evidence for {cbu_code} at mapped depot {depot_code}"
            )
        if float(stock["quantityCases"]) <= 0:
            raise ValueError(f"Depot stock must be positive for {cbu_code} at {depot_code}")
        try:
            snapshot_date = date.fromisoformat(stock["snapshotDate"])
        except (TypeError, ValueError):
            raise ValueError(f"Invalid depot stock snapshotDate for {cbu_code} at {depot_code}")
        if snapshot_date > date.today() or snapshot_date < date.today() - timedelta(days=STOCK_MAX_AGE_DAYS):
            raise ValueError(f"Depot stock evidence is stale for {cbu_code} at {depot_code}")
        return stock

    def _raise_once(self, data: InsertServiceRequest, key: str) -> dict:
        existing = self._find_pending(key)
        if existing:
            return {"request": existing, "existing": True}
        try:
            request = self.sr_service.raise_sr(data, agent_action_key=key)
            return {"request": request, "existing": False}
        except IntegrityError:
            # The partial unique index arbitrates concurrent actions. Read the
            # winning pending SR rather than creating a second request.
            existing = self._find_pending(key)
            if existing:
                return {"request": existing, "existing": True}
            raise

    def _entries(self) -> list[dict]:
        return self.list_service.get_all()

    def _basepack_status(self, basepack_code: str, entries: list[dict]) -> str:
        db = SessionLocal()
        try:
            override = db.query(BasepakStatusOverrideModel).filter(
                BasepakStatusOverrideModel.bp_id == basepack_code,
                BasepakStatusOverrideModel.is_active == True,
            ).order_by(BasepakStatusOverrideModel.applied_at.desc()).first()
            if override:
                return override.status
        finally:
            db.close()
        return _derive_bp_status([
            entry for entry in entries if entry.get("basepack") == basepack_code
        ])

    def request_activation(self, basepack_code: str, effective_date: str) -> dict:
        key = f"transition-risk:activation:{basepack_code}"
        existing = self._find_pending(key) or self._find_pending_activation(basepack_code)
        if existing:
            return {"request": existing, "existing": True}

        self._future_date(effective_date)
        entries = [entry for entry in self._entries()
                   if entry.get("basepack") == basepack_code]
        if not entries:
            raise ValueError(f"No current CBU evidence found for basepack {basepack_code}")
        current_status = self._basepack_status(basepack_code, entries)
        if current_status == "Active Pack":
            raise ValueError(f"Basepack {basepack_code} is already Active Pack")

        stock_rows = self.storage.get_depot_stock()
        stock_evidence = []
        materials = []
        for entry in entries:
            material_code = entry.get("cbuCode")
            score = entry.get("mstnPercentage")
            scores_by_depot = entry.get("mstnByDepot") or {}
            mapped_depots = set(entry.get("depot") or [])
            if not material_code or score is None or not scores_by_depot:
                raise ValueError(
                    f"Incomplete current clearance evidence for basepack {basepack_code}"
                )
            if not mapped_depots.issubset(set(scores_by_depot)):
                missing = sorted(mapped_depots - set(scores_by_depot))
                raise ValueError(
                    f"Incomplete current depot clearance evidence for {material_code}: {', '.join(missing)}"
                )
            if not mapped_depots:
                raise ValueError(f"No mapped depots found for activation CBU {material_code}")
            for depot_code in sorted(mapped_depots):
                stock = self._require_fresh_positive_stock(
                    stock_rows, material_code, basepack_code, depot_code
                )
                stock_evidence.append(
                    f"{material_code}/{depot_code}: {stock['quantityCases']} cases "
                    f"(snapshot {stock['snapshotDate']})"
                )
            materials.append(ClearanceCheckMaterial(
                code=material_code,
                description=entry.get("materialDescription") or "",
                mstnPct=score,
                mstnByDepot=scores_by_depot,
                networkChangeDate=entry.get("networkChangeDate"),
                typeOfNetworkCode=entry.get("typeOfNetwork"),
                priceStart=entry.get("priceUpdatedAt"),
            ))

        clearance = self.mstn_service.clearance_check(
            ClearanceCheckRequest(materials=materials)
        )
        if not clearance.get("criteriaMet"):
            raise ValueError(
                f"Activation is not eligible: clearance_check criteriaMet is false for {basepack_code}"
            )

        depot_decisions = []
        for material in clearance.get("materials", []):
            for depot_code, score in (material.get("mstnByDepot") or {}).items():
                depot_decisions.append({
                    "cbuCode": material["code"],
                    "depotCode": depot_code,
                    "mstnPct": score,
                    "mstnCleared": score is not None and score >= _MSTN_THRESHOLD,
                    "ncsmDecision": "pending",
                    "activationStatus": "Pending",
                })

        representative = entries[0]
        request = InsertServiceRequest(
            srType="basepack-status-change",
            raisedBy="Transition Agent",
            businessGroup=representative.get("bg"),
            brand=representative.get("brand"),
            basepackCode=basepack_code,
            basepackName=representative.get("basepackDescription"),
            targetStatus="Active Pack",
            currentValue=current_status,
            requestedValue="Active Pack",
            businessJustification=(
                f"Transition agent requests activation after current clearance_check "
                f"criteriaMet=true ({clearance.get('mstnCoverage')}% MSTN coverage). "
                f"Positive mapped-depot stock evidence: {'; '.join(stock_evidence)}."
            ),
            effectiveDate=effective_date,
            criteriaMetAtRaise=True,
            mstnCoverageAtRaise=clearance.get("mstnCoverage"),
            depotDecisions=depot_decisions,
            materials=[{
                "id": entry.get("id") or material.code,
                "cbuCode": material.code,
                "mstnPct": material.mstnPct,
                "mstnCleared": next(
                    (item.get("mstnCleared") for item in clearance.get("materials", [])
                     if item.get("code") == material.code),
                    None,
                ),
            } for entry, material in zip(entries, materials)],
        )
        return self._raise_once(request, key)

    def request_sourcing_amendment(self, cbu_code: str, depot_code: str,
                                   effective_date: str, sourcing_mode: str,
                                   sourcing_depot_code: str | None = None) -> dict:
        key = f"transition-risk:sourcing:{cbu_code}:{depot_code}"
        existing = self._find_pending(key) or self._find_pending_sourcing(cbu_code, depot_code)
        if existing:
            return {"request": existing, "existing": True}

        self._future_date(effective_date)
        if sourcing_mode not in {"centralized", "decentralized"}:
            raise ValueError("sourcingMode must be explicitly selected as centralized or decentralized")
        if sourcing_mode == "centralized" and not sourcing_depot_code:
            raise ValueError("sourcingDepotCode is required for centralized sourcing")

        depots = self.reference_service.get_all_depots()
        valid_depots = {
            depot["code"] for depot in depots if depot.get("isActive", True)
        }
        if depot_code not in valid_depots:
            raise ValueError(f"Unknown or inactive depot: {depot_code}")
        if sourcing_depot_code and sourcing_depot_code not in valid_depots:
            raise ValueError(f"Unknown or inactive sourcing depot: {sourcing_depot_code}")

        entry = next((row for row in self._entries()
                      if row.get("cbuCode") == cbu_code), None)
        if not entry:
            raise ValueError(f"Unknown CBU: {cbu_code}")
        if (sourcing_mode == "centralized"
                and sourcing_depot_code not in (entry.get("depot") or [])):
            raise ValueError(
                f"sourcingDepotCode {sourcing_depot_code} must be currently mapped to {cbu_code}"
            )
        if depot_code in (entry.get("depot") or []):
            raise ValueError(f"Depot {depot_code} is already mapped to {cbu_code}")

        stock = self._require_fresh_positive_stock(
            self.storage.get_depot_stock(), cbu_code, entry.get("basepack"), depot_code
        )

        representative = entry
        selected_source = sourcing_depot_code if sourcing_mode == "centralized" else depot_code
        justification = (
            f"Transition-risk agent proposes adding {depot_code} to {cbu_code}: "
            f"explicit depot-stock evidence shows {stock['quantityCases']} cases "
            f"as of {stock['snapshotDate']}; the depot is not in the current CBU mapping. "
            f"Human-selected sourcing mode: {sourcing_mode}; source depot: {selected_source}."
        )
        request = InsertServiceRequest(
            srType="sourcing-amendment",
            raisedBy="Transition Agent",
            businessGroup=representative.get("bg"),
            brand=representative.get("brand"),
            basepackCode=representative.get("basepack"),
            basepackName=representative.get("basepackDescription"),
            cbuCode=cbu_code,
            cbuId=representative.get("id"),
            cbuDescription=representative.get("materialDescription"),
            currentValue=",".join(entry.get("depot") or []),
            requestedValue=depot_code,
            businessJustification=justification,
            addedDepots=[depot_code],
            sourcingMode=sourcing_mode,
            centralizedDepots=[sourcing_depot_code] if sourcing_mode == "centralized" else [],
            sourcingDepotMapping={depot_code: selected_source},
            effectiveDate=effective_date,
        )
        return self._raise_once(request, key)