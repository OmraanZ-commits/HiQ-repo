from datetime import datetime, timezone, date
from typing import Optional, List

from server_py.models import (
    InsertServiceRequest,
    ApproveStepRequest,
    RejectStepRequest,
    APPROVER_CHAIN_TEMPLATE,
    SR_TYPES,
)
from server_py.services.service_requests.storage import ServiceRequestStorage
from server_py.db import SessionLocal, NetworkEntryModel, DemandForecastEntryModel

MSTN_THRESHOLD = 80


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _compute_validation_checks(cbu_code: Optional[str], basepack_code: Optional[str]) -> dict:
    """
    Compute the four Overview-page validation checks at SR-raise time:
    demand visibility, sourcing matrix check, price check, MSTN check.
    Snapshotted onto the SR so later data changes don't rewrite history.
    """
    demand_visibility = {"status": "Not Available", "totalUnits": 0, "mocMonths": 0}
    sourcing_matrix_check = {"status": "Incomplete", "mode": None, "details": "No network entry found for this CBU"}
    price_check = {"status": "Not Available", "details": "No network entry found for this CBU"}
    mstn_check = {"status": "Fail", "coverage": 0, "threshold": MSTN_THRESHOLD}

    db = SessionLocal()
    try:
        entry = None
        if cbu_code:
            entry = db.query(NetworkEntryModel).filter(
                NetworkEntryModel.cbu_code == cbu_code
            ).order_by(NetworkEntryModel.created_at.desc()).first()

        if entry is not None:
            mode = entry.sourcing_mode or "decentralized"
            if mode == "centralized":
                mapped = bool(entry.centralized_depots) and bool(entry.centralized_geos)
                sourcing_matrix_check = {
                    "status": "Complete" if mapped else "Incomplete",
                    "mode": "Centralized",
                    "details": "Centralized depot mapping present" if mapped else "Centralized depot mapping is missing",
                }
            else:
                mapped = bool(entry.channel_mapping) or bool(entry.depot)
                sourcing_matrix_check = {
                    "status": "Complete" if mapped else "Incomplete",
                    "mode": "Decentralized",
                    "details": "Geo-channel distribution matrix configured" if mapped else "Distribution matrix is not configured",
                }

            if entry.price_active is True:
                price_check = {"status": "Available", "details": "Pricing is active for this CBU"}
            elif entry.price_active is False:
                price_check = {"status": "Not Available", "details": "Pricing has not been activated for this CBU"}
            else:
                price_check = {"status": "Partial", "details": "Pricing status has not been confirmed"}

            coverage = entry.mstn_percentage or 0
            mstn_check = {
                "status": "Pass" if coverage >= MSTN_THRESHOLD else "Fail",
                "coverage": coverage,
                "threshold": MSTN_THRESHOLD,
            }

            basepack_code = basepack_code or entry.basepack

        demand_by_cbu = []
        if basepack_code:
            all_rows = db.query(DemandForecastEntryModel).filter(
                DemandForecastEntryModel.basepack == basepack_code
            ).all()

            # All CBUs (network entries) that share this basepack — demand is
            # broken out per CBU since each CBU has its own depot footprint.
            cbu_entries = db.query(NetworkEntryModel).filter(
                NetworkEntryModel.basepack == basepack_code
            ).order_by(NetworkEntryModel.created_at.asc()).all()

            if cbu_entries:
                seen_cbus = set()
                for cbu_entry in cbu_entries:
                    if not cbu_entry.cbu_code or cbu_entry.cbu_code in seen_cbus:
                        continue
                    seen_cbus.add(cbu_entry.cbu_code)
                    cbu_depots = set(cbu_entry.depot or [])
                    cbu_rows = [r for r in all_rows if r.depot in cbu_depots] if cbu_depots else []
                    if cbu_rows:
                        total_units = sum(r.qty_units or 0 for r in cbu_rows)
                        month_totals: dict = {}
                        for r in cbu_rows:
                            if not r.moc_month:
                                continue
                            month_totals[r.moc_month] = month_totals.get(r.moc_month, 0) + (r.qty_units or 0)
                        by_month = [
                            {"mocMonth": m, "totalUnits": round(month_totals[m])}
                            for m in sorted(month_totals.keys())
                        ]
                        demand_by_cbu.append({
                            "cbuCode": cbu_entry.cbu_code,
                            "cbuDescription": cbu_entry.material_description or cbu_entry.basepack_description,
                            "status": "Available",
                            "totalUnits": round(total_units),
                            "mocMonths": len(by_month),
                            "byMonth": by_month,
                        })
                    else:
                        demand_by_cbu.append({
                            "cbuCode": cbu_entry.cbu_code,
                            "cbuDescription": cbu_entry.material_description or cbu_entry.basepack_description,
                            "status": "Not Available",
                            "totalUnits": 0,
                            "mocMonths": 0,
                        })
            elif all_rows:
                # No CBU/network-entry breakdown available — fall back to a
                # single basepack-level aggregate.
                total_units = sum(r.qty_units or 0 for r in all_rows)
                moc_months = len({r.moc_month for r in all_rows if r.moc_month})
                demand_by_cbu.append({
                    "cbuCode": cbu_code,
                    "status": "Available",
                    "totalUnits": round(total_units),
                    "mocMonths": moc_months,
                })

            if demand_by_cbu:
                available = [d for d in demand_by_cbu if d["status"] == "Available"]
                demand_visibility = {
                    "status": "Available" if available else "Not Available",
                    "totalUnits": round(sum(d["totalUnits"] for d in demand_by_cbu)),
                    "mocMonths": max((d["mocMonths"] for d in demand_by_cbu), default=0),
                    "byCbu": demand_by_cbu,
                }
    finally:
        db.close()

    return {
        "demandVisibility": demand_visibility,
        "sourcingMatrixCheck": sourcing_matrix_check,
        "priceCheck": price_check,
        "mstnCheck": mstn_check,
    }


def _build_approvers(assigned_users: Optional[dict] = None) -> list:
    """
    Build the initial 4-step approver chain:
    Supply Planner -> Demand Planner -> Network Planner -> NCSM.
    assigned_users: dict of role -> user name (looked up from users service at raise time).
    First step is "pending", rest are "waiting".
    """
    assigned_users = assigned_users or {}
    chain = []
    for i, step in enumerate(APPROVER_CHAIN_TEMPLATE):
        chain.append({
            "label": step["label"],
            "assignedTo": assigned_users.get(step["role"], step["role"]),
            "subLabel": step["subLabel"],
            "status": "pending" if i == 0 else "waiting",
            "actionedAt": None,
            "rejectionReason": None,
            "comments": None,
            "effectiveDate": None,
        })
    return chain


class ServiceRequestService:
    def __init__(self, storage: ServiceRequestStorage):
        self.storage = storage

    def get_all(self, sr_type: Optional[str] = None, status: Optional[str] = None,
                business_group: Optional[str] = None) -> List[dict]:
        return self.storage.get_all(sr_type=sr_type, status=status, business_group=business_group)

    def get_by_id(self, sr_id: str) -> Optional[dict]:
        return self.storage.get_by_id(sr_id)

    def raise_sr(self, data: InsertServiceRequest, assigned_users: Optional[dict] = None) -> dict:
        if data.srType not in SR_TYPES:
            raise ValueError(f"Invalid SR type: {data.srType}")

        if not data.effectiveDate:
            raise ValueError("effectiveDate is required when raising a service request")
        try:
            eff = datetime.fromisoformat(data.effectiveDate[:10]).date()
        except ValueError:
            raise ValueError(f"Invalid effectiveDate: {data.effectiveDate}")
        if eff <= date.today():
            raise ValueError("effectiveDate must be strictly greater than today")

        approvers = _build_approvers(assigned_users)
        payload = data.model_dump()
        payload["approvers"] = approvers

        basepack_code = payload.get("basepackCode") or payload.get("basepakCode")
        validation_summary = _compute_validation_checks(payload.get("cbuCode"), basepack_code)
        payload["validationSummary"] = validation_summary
        payload["pricingComplete"] = validation_summary["priceCheck"]["status"] == "Available"
        payload["sourcingComplete"] = validation_summary["sourcingMatrixCheck"]["status"] == "Complete"

        return self.storage.create(payload)

    def approve_step(self, sr_id: str, req: ApproveStepRequest) -> dict:
        sr = self.storage.get_by_id(sr_id)
        if not sr:
            raise LookupError(f"SR {sr_id} not found")
        if sr["status"] != "pending":
            raise ValueError(f"SR is already {sr['status']}")

        approvers = list(sr["approvers"])
        step_index = req.stepIndex

        if step_index < 0 or step_index >= len(approvers):
            raise ValueError(f"Invalid step index {step_index}")
        if approvers[step_index]["status"] != "pending":
            raise ValueError(f"Step {step_index} is not pending")

        step_label = approvers[step_index].get("label")
        new_effective_date = None

        # Supply Planner (step 0): may modify the Effective Date on approval.
        # Any modification is a mandatory-comment action.
        if step_label == "Supply Planner" and req.effectiveDate:
            if req.effectiveDate != sr.get("effectiveDate"):
                if not req.comments or not req.comments.strip():
                    raise ValueError("Comments are mandatory when modifying the Effective Date")
                try:
                    eff = datetime.fromisoformat(req.effectiveDate[:10]).date()
                except ValueError:
                    raise ValueError(f"Invalid effectiveDate: {req.effectiveDate}")
                if eff <= date.today():
                    raise ValueError("effectiveDate must be strictly greater than today")
                new_effective_date = req.effectiveDate
            approvers[step_index]["effectiveDate"] = req.effectiveDate

        # Network Planner (step 2): approval is BLOCKED unless pricing + sourcing
        # validation has already been recorded as complete on the SR payload.
        if step_label == "Network Planner":
            if sr.get("pricingComplete") is False or sr.get("sourcingComplete") is False:
                raise ValueError(
                    "Network Planner approval is blocked: pricing and/or sourcing "
                    "matrix validation is incomplete for this request"
                )

        approvers[step_index]["status"] = "approved"
        approvers[step_index]["actionedAt"] = _now_iso()
        if req.comments:
            approvers[step_index]["comments"] = req.comments

        is_last = step_index == len(approvers) - 1
        if is_last:
            overall_status = "approved"
        else:
            approvers[step_index + 1]["status"] = "pending"
            overall_status = "pending"

        return self.storage.update_approvers(
            sr_id, approvers, overall_status, effective_date=new_effective_date
        )

    def seed_requests(self, seeds: list) -> None:
        """
        Insert seed SRs if they don't already exist (idempotent by id).
        Validation checks (demand visibility, sourcing, price, MSTN) are always
        computed from the live Network Visibility data (network entries + demand
        forecast entries), never hardcoded, so seed SRs mirror real CBU state.
        """
        enriched = []
        for seed in seeds:
            seed = dict(seed)
            basepack_code = seed.get("basepackCode") or seed.get("basepakCode")
            validation_summary = _compute_validation_checks(seed.get("cbuCode"), basepack_code)
            seed["validationSummary"] = validation_summary
            seed["pricingComplete"] = validation_summary["priceCheck"]["status"] == "Available"
            seed["sourcingComplete"] = validation_summary["sourcingMatrixCheck"]["status"] == "Complete"
            enriched.append(seed)
        self.storage.seed_requests(enriched)

    def reject_step(self, sr_id: str, req: RejectStepRequest) -> dict:
        sr = self.storage.get_by_id(sr_id)
        if not sr:
            raise LookupError(f"SR {sr_id} not found")
        if sr["status"] != "pending":
            raise ValueError(f"SR is already {sr['status']}")

        if not req.reason or not req.reason.strip():
            raise ValueError("Comments are mandatory when rejecting a step")

        approvers = list(sr["approvers"])
        step_index = req.stepIndex

        if step_index < 0 or step_index >= len(approvers):
            raise ValueError(f"Invalid step index {step_index}")
        if approvers[step_index]["status"] != "pending":
            raise ValueError(f"Step {step_index} is not pending")

        approvers[step_index]["status"] = "rejected"
        approvers[step_index]["actionedAt"] = _now_iso()
        approvers[step_index]["rejectionReason"] = req.reason
        approvers[step_index]["comments"] = req.reason

        return self.storage.update_approvers(
            sr_id, approvers, "rejected", rejection_reason=req.reason
        )
