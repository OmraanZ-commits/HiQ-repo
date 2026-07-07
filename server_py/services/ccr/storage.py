import uuid
from datetime import datetime, timezone
from typing import Optional, List

from server_py.db import (
    SessionLocal,
    CcrCustomerMasterModel,
    CcrCustomerCodeMappingModel,
    CcrCicMappingModel,
    CcrRulesetModel,
    CcrLineItemModel,
    CcrAuditLogModel,
)


def _parse_dt(value) -> Optional[datetime]:
    """Safely parse an ISO datetime string or return None."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _customer_to_dict(row: CcrCustomerMasterModel) -> dict:
    return {
        "id": str(row.id),
        "customerChain": row.customer_chain,
        "coverageType": row.coverage_type,
        "behaviourType": row.behaviour_type,
        "cseId": row.cse_id,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _code_mapping_to_dict(row: CcrCustomerCodeMappingModel) -> dict:
    return {
        "id": str(row.id),
        "customerChain": row.customer_chain,
        "customerCode": row.customer_code,
        "depot": row.depot,
        "subChannel": row.sub_channel,
        "channel": row.channel,
    }


def _cic_mapping_to_dict(row: CcrCicMappingModel) -> dict:
    return {
        "id": str(row.id),
        "cbuCode": row.cbu_code,
        "basepack": row.basepack,
        "customerChain": row.customer_chain,
        "customerCode": row.customer_code,
        "cic": row.cic,
        "salesOrg": row.sales_org,
        "channel": row.channel,
        "depot": row.depot,
        "status": row.status,
        "sourcingDepot": row.sourcing_depot,
        "sourcingType": row.sourcing_type,
        "pricingStatus": row.pricing_status,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


def _ruleset_to_dict(row: CcrRulesetModel) -> dict:
    return {
        "id": str(row.id),
        "networkChangeType": row.network_change_type,
        "newCicRequired": row.new_cic_required,
        "contentUpdateRequired": row.content_update_required,
        "rundownRequired": row.rundown_required,
        "autoCcr": row.auto_ccr,
        "notes": row.notes,
    }


def _line_item_to_dict(row: CcrLineItemModel) -> dict:
    return {
        "id": str(row.id),
        "predecessorCbuCode": row.predecessor_cbu_code,
        "successorCbuCode": row.successor_cbu_code,
        "customerChain": row.customer_chain,
        "customerCode": row.customer_code,
        "cic": row.cic,
        "triggerStage": row.trigger_stage,
        "urgencyColor": row.urgency_color,
        "ccrStatus": row.ccr_status,
        "executionType": row.execution_type,
        "rulesetOutcome": row.ruleset_outcome,
        "overrides": row.overrides,
        "escalationDueAt": row.escalation_due_at.isoformat() if row.escalation_due_at else None,
        "escalatedAt": row.escalated_at.isoformat() if row.escalated_at else None,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


def _audit_log_to_dict(row: CcrAuditLogModel) -> dict:
    return {
        "id": str(row.id),
        "ccrLineItemId": str(row.ccr_line_item_id),
        "eventType": row.event_type,
        "actor": row.actor,
        "payload": row.payload,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


class CcrStorage:

    # ── Customer Master ─────────────────────────────────────────

    def get_all_customers(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(CcrCustomerMasterModel).order_by(CcrCustomerMasterModel.customer_chain).all()
            return [_customer_to_dict(r) for r in rows]
        finally:
            db.close()

    def get_customer_by_chain(self, customer_chain: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrCustomerMasterModel).filter(
                CcrCustomerMasterModel.customer_chain == customer_chain
            ).first()
            return _customer_to_dict(row) if row else None
        finally:
            db.close()

    # ── Customer Code Mapping ───────────────────────────────────

    def get_code_mappings_for_chain(self, customer_chain: str) -> List[dict]:
        db = SessionLocal()
        try:
            rows = (
                db.query(CcrCustomerCodeMappingModel)
                .filter(CcrCustomerCodeMappingModel.customer_chain == customer_chain)
                .order_by(CcrCustomerCodeMappingModel.customer_code)
                .all()
            )
            return [_code_mapping_to_dict(r) for r in rows]
        finally:
            db.close()

    # ── CIC Mapping ─────────────────────────────────────────────

    def get_cic_mappings(self, cbu_code: Optional[str] = None, customer_chain: Optional[str] = None) -> List[dict]:
        db = SessionLocal()
        try:
            q = db.query(CcrCicMappingModel)
            if cbu_code:
                q = q.filter(CcrCicMappingModel.cbu_code == cbu_code)
            if customer_chain:
                q = q.filter(CcrCicMappingModel.customer_chain == customer_chain)
            rows = q.order_by(CcrCicMappingModel.customer_chain, CcrCicMappingModel.customer_code).all()
            return [_cic_mapping_to_dict(r) for r in rows]
        finally:
            db.close()

    def get_cic_mapping_status_summary(self) -> dict:
        """
        Returns per-CBU posting status for all CBUs that have CIC mapping rows.
        Pending: no rows exist (caller defaults; absent keys = Pending)
        Saved:   rows exist, not all Mapped (partial / Non-Mapped rows present)
        Posted:  all rows for the CBU have status='Mapped'
        """
        db = SessionLocal()
        try:
            rows = db.query(CcrCicMappingModel.cbu_code, CcrCicMappingModel.status).all()
            agg: dict = {}
            for r in rows:
                cbu = r.cbu_code
                if cbu not in agg:
                    agg[cbu] = {"total": 0, "mapped": 0}
                agg[cbu]["total"] += 1
                if r.status == "Mapped":
                    agg[cbu]["mapped"] += 1
            result = {}
            for cbu, counts in agg.items():
                if counts["mapped"] == counts["total"]:
                    result[cbu] = "Posted"
                else:
                    result[cbu] = "Saved"
            return result
        finally:
            db.close()

    # ── Ruleset ─────────────────────────────────────────────────

    def get_all_ruleset(self) -> List[dict]:
        db = SessionLocal()
        try:
            rows = db.query(CcrRulesetModel).order_by(CcrRulesetModel.network_change_type).all()
            return [_ruleset_to_dict(r) for r in rows]
        finally:
            db.close()

    # ── Line Items ──────────────────────────────────────────────

    def get_line_items(
        self,
        cse_id: Optional[str] = None,
        ccr_status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        db = SessionLocal()
        try:
            q = db.query(CcrLineItemModel)
            if cse_id:
                customer_chains = (
                    db.query(CcrCustomerMasterModel.customer_chain)
                    .filter(CcrCustomerMasterModel.cse_id == cse_id)
                    .subquery()
                )
                q = q.filter(CcrLineItemModel.customer_chain.in_(customer_chains))
            if ccr_status:
                q = q.filter(CcrLineItemModel.ccr_status == ccr_status)
            total = q.count()
            rows = q.order_by(CcrLineItemModel.created_at.desc()).offset(offset).limit(limit).all()
            return {
                "total": total,
                "items": [_line_item_to_dict(r) for r in rows],
            }
        finally:
            db.close()

    def get_line_item_by_id(self, item_id: str) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrLineItemModel).filter(CcrLineItemModel.id == uuid.UUID(item_id)).first()
            if not row:
                return None
            item = _line_item_to_dict(row)
            logs = (
                db.query(CcrAuditLogModel)
                .filter(CcrAuditLogModel.ccr_line_item_id == uuid.UUID(item_id))
                .order_by(CcrAuditLogModel.created_at.asc())
                .all()
            )
            item["auditLog"] = [_audit_log_to_dict(l) for l in logs]
            return item
        finally:
            db.close()

    def update_line_item_status(self, item_id: str, data: dict) -> Optional[dict]:
        db = SessionLocal()
        try:
            row = db.query(CcrLineItemModel).filter(CcrLineItemModel.id == uuid.UUID(item_id)).first()
            if not row:
                return None
            if "ccrStatus" in data:
                row.ccr_status = data["ccrStatus"]
            if "triggerStage" in data:
                row.trigger_stage = data["triggerStage"]
            if "urgencyColor" in data:
                row.urgency_color = data["urgencyColor"]
            if "executionType" in data:
                row.execution_type = data["executionType"]
            if "rulesetOutcome" in data:
                row.ruleset_outcome = data["rulesetOutcome"]
            if "overrides" in data:
                row.overrides = data["overrides"]
            if "escalationDueAt" in data:
                row.escalation_due_at = _parse_dt(data["escalationDueAt"])
            if "escalatedAt" in data:
                row.escalated_at = _parse_dt(data["escalatedAt"])
            row.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(row)
            return _line_item_to_dict(row)
        finally:
            db.close()

    # ── Audit Log ───────────────────────────────────────────────

    def append_audit_log(self, item_id: str, data: dict) -> dict:
        db = SessionLocal()
        try:
            log = CcrAuditLogModel(
                id=uuid.uuid4(),
                ccr_line_item_id=uuid.UUID(item_id),
                event_type=data.get("eventType", "note"),
                actor=data.get("actor", "system"),
                payload=data.get("payload", {}),
                created_at=datetime.now(timezone.utc),
            )
            db.add(log)
            db.commit()
            return _audit_log_to_dict(log)
        finally:
            db.close()

    # ── Seed helpers ────────────────────────────────────────────

    def seed_customers(self, seeds: List[dict]) -> None:
        db = SessionLocal()
        try:
            existing = {r.customer_chain for r in db.query(CcrCustomerMasterModel.customer_chain).all()}
            for s in seeds:
                if s["customer_chain"] not in existing:
                    db.add(CcrCustomerMasterModel(
                        id=uuid.uuid4(),
                        customer_chain=s["customer_chain"],
                        coverage_type=s["coverage_type"],
                        behaviour_type=s["behaviour_type"],
                        cse_id=s.get("cse_id"),
                        created_at=datetime.now(timezone.utc),
                    ))
            db.commit()
        finally:
            db.close()

    def seed_code_mappings(self, seeds: List[dict]) -> None:
        db = SessionLocal()
        try:
            existing = {
                (r.customer_chain, r.customer_code, r.depot)
                for r in db.query(
                    CcrCustomerCodeMappingModel.customer_chain,
                    CcrCustomerCodeMappingModel.customer_code,
                    CcrCustomerCodeMappingModel.depot,
                ).all()
            }
            for s in seeds:
                key = (s["customer_chain"], s["customer_code"], s["depot"])
                if key not in existing:
                    db.add(CcrCustomerCodeMappingModel(
                        id=uuid.uuid4(),
                        customer_chain=s["customer_chain"],
                        customer_code=s["customer_code"],
                        depot=s["depot"],
                        sub_channel=s.get("sub_channel"),
                        channel=s.get("channel", "MT"),
                    ))
            db.commit()
        finally:
            db.close()

    def seed_cic_mappings(self, seeds: List[dict]) -> None:
        db = SessionLocal()
        try:
            existing = {
                (r.cbu_code, r.customer_chain, r.customer_code)
                for r in db.query(
                    CcrCicMappingModel.cbu_code,
                    CcrCicMappingModel.customer_chain,
                    CcrCicMappingModel.customer_code,
                ).all()
            }
            now = datetime.now(timezone.utc)
            for s in seeds:
                key = (s["cbu_code"], s["customer_chain"], s["customer_code"])
                if key not in existing:
                    db.add(CcrCicMappingModel(
                        id=uuid.uuid4(),
                        cbu_code=s["cbu_code"],
                        basepack=s.get("basepack"),
                        customer_chain=s["customer_chain"],
                        customer_code=s["customer_code"],
                        cic=s.get("cic"),
                        sales_org=s.get("sales_org", "1000"),
                        channel=s.get("channel", "MT"),
                        depot=s.get("depot"),
                        status=s.get("status", "Mapped"),
                        sourcing_depot=s.get("sourcing_depot"),
                        sourcing_type=s.get("sourcing_type", "Decentralized"),
                        pricing_status=s.get("pricing_status", "Available"),
                        created_at=now,
                        updated_at=now,
                    ))
            db.commit()
        finally:
            db.close()

    def seed_ruleset(self, seeds: List[dict]) -> None:
        db = SessionLocal()
        try:
            existing = {r.network_change_type for r in db.query(CcrRulesetModel.network_change_type).all()}
            for s in seeds:
                if s["network_change_type"] not in existing:
                    db.add(CcrRulesetModel(
                        id=uuid.uuid4(),
                        network_change_type=s["network_change_type"],
                        new_cic_required=s.get("new_cic_required", False),
                        content_update_required=s.get("content_update_required", False),
                        rundown_required=s.get("rundown_required", False),
                        auto_ccr=s.get("auto_ccr", False),
                        notes=s.get("notes"),
                    ))
            db.commit()
        finally:
            db.close()

    def upsert_cic_mappings(self, mappings: List[dict]) -> List[dict]:
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            results = []
            for m in mappings:
                # Key on (cbu_code, customer_chain, customer_code, depot) — depot-granular
                # because a single customer code can map to multiple depots.
                row = (
                    db.query(CcrCicMappingModel)
                    .filter(
                        CcrCicMappingModel.cbu_code == m["cbuCode"],
                        CcrCicMappingModel.customer_chain == m["customerChain"],
                        CcrCicMappingModel.customer_code == m["customerCode"],
                        CcrCicMappingModel.depot == m.get("depot"),
                    )
                    .first()
                )
                if row:
                    row.basepack = m.get("basepack", row.basepack)
                    row.cic = m.get("cic", row.cic)
                    row.sales_org = m.get("salesOrg", row.sales_org)
                    row.channel = m.get("channel", row.channel)
                    row.depot = m.get("depot", row.depot)
                    row.status = m.get("status", row.status)
                    row.sourcing_depot = m.get("sourcingDepot", row.sourcing_depot)
                    row.sourcing_type = m.get("sourcingType", row.sourcing_type)
                    row.pricing_status = m.get("pricingStatus", row.pricing_status)
                    row.updated_at = now
                else:
                    row = CcrCicMappingModel(
                        id=uuid.uuid4(),
                        cbu_code=m["cbuCode"],
                        basepack=m.get("basepack"),
                        customer_chain=m["customerChain"],
                        customer_code=m["customerCode"],
                        cic=m.get("cic"),
                        sales_org=m.get("salesOrg", "1000"),
                        channel=m.get("channel", "MT"),
                        depot=m.get("depot"),
                        status=m.get("status", "Mapped"),
                        sourcing_depot=m.get("sourcingDepot"),
                        sourcing_type=m.get("sourcingType", "Decentralized"),
                        pricing_status=m.get("pricingStatus", "Available"),
                        created_at=now,
                        updated_at=now,
                    )
                    db.add(row)
                db.flush()
                results.append(_cic_mapping_to_dict(row))
            db.commit()
            return results
        finally:
            db.close()

    # ── Trigger Engine ──────────────────────────────────────────

    def evaluate_triggers(self, network_entries: List[dict]) -> dict:
        """
        Cross-reference CCR line items against network entries and update
        trigger_stage, urgency_color, escalation_due_at, and escalated_at.

        Network entries are fetched server-side by the CcrService before calling
        this method, so no client-supplied data influences the evaluation.

        Mapping rules (applied only to non-Completed items with a CIC):
          FTR Approved              → First Intimation  (Amber)
          Stock Movement Initiated  → Second Intimation (Red)
          DOH threshold             → Third Intimation  (Blinking Red)

        DOH / CLOT gating policy:
          National customers: Third Intimation fires only for depots that sit in
            the top-70% of the customer chain's depots ranked by CLOT volume.
            CLOT values are stored in ccr_customer_code_mapping.clot (seeded via
            run_migrations). Each line item's depot is looked up via customer_code.
          Regional / SBM customers: Third Intimation applied for all depots without
            CLOT gating.

        Escalation semantics:
          • When trigger_stage advances to a new non-None stage, escalation_due_at is
            (re-)set to now + 3 calendar days and escalated_at is cleared, giving a
            fresh window at each new stage.
          • Back-fill: active-stage rows that somehow have no escalation_due_at get it
            set from their updated_at timestamp + 3 days (proxy for activation time).
          • If escalation_due_at < now and escalated_at is still None → set escalated_at.

        Returns {updated, escalated} counts.
        """
        import math
        from datetime import timedelta

        entry_map: dict = {}
        for e in network_entries:
            cbu = e.get("cbuCode") or e.get("cbu_code")
            if cbu:
                entry_map[cbu] = e

        STATUS_TO_STAGE = {
            "FTR Approved":             ("First",  "Amber"),
            "Stock Movement Initiated": ("Second", "Red"),
        }

        db = SessionLocal()
        try:
            # ── 1. Coverage-type per chain ────────────────────────────────────
            coverage_by_chain = {
                r.customer_chain: r.coverage_type
                for r in db.query(CcrCustomerMasterModel).all()
            }

            # ── 2. CLOT lookup & top-70% threshold per chain ─────────────────
            # {chain: {depot: clot}}
            from sqlalchemy import text as _text
            clot_rows = db.execute(_text(
                "SELECT customer_chain, depot, COALESCE(clot, 1.0) "
                "FROM ccr_customer_code_mapping"
            )).fetchall()
            chain_depot_clot: dict[str, dict[str, float]] = {}
            for chain_val, depot_val, clot_val in clot_rows:
                chain_depot_clot.setdefault(chain_val, {})[depot_val] = float(clot_val or 1.0)

            # Top-70% threshold: minimum CLOT value of a depot that qualifies
            chain_top70: dict[str, float] = {}
            for chain_val, depot_clot_map in chain_depot_clot.items():
                vals = sorted(depot_clot_map.values(), reverse=True)
                top_n = max(1, math.ceil(len(vals) * 0.70))
                chain_top70[chain_val] = vals[top_n - 1] if top_n <= len(vals) else 0.0

            # ── 3. customer_code → depot lookup ───────────────────────────────
            code_to_depot: dict[str, str] = {}
            for r in db.query(CcrCustomerCodeMappingModel).all():
                code_to_depot[r.customer_code] = r.depot

            # ── 4. Evaluate each active line item ─────────────────────────────
            rows = (
                db.query(CcrLineItemModel)
                .filter(CcrLineItemModel.ccr_status != "Completed")
                .all()
            )
            # Use naive UTC to match PostgreSQL TIMESTAMP WITHOUT TIME ZONE columns.
            # datetime.now(timezone.utc) is offset-aware and cannot be directly compared
            # against naive datetimes returned from SQLAlchemy ORM column reads.
            now = datetime.utcnow()
            updated = 0
            escalated = 0

            for row in rows:
                if not row.cic:
                    continue

                entry = entry_map.get(row.successor_cbu_code or "")
                if not entry:
                    continue

                net_status  = entry.get("networkStatus")  or entry.get("network_status")  or ""
                pred_doh    = entry.get("predecessorDoh") or entry.get("predecessor_doh") or 0
                succ_doh    = entry.get("successorDoh")   or entry.get("successor_doh")   or 0
                coverage    = coverage_by_chain.get(row.customer_chain, "National")

                current_stage = row.trigger_stage or "None"
                new_stage: str | None = None
                new_color: str | None = None

                # ── Stage mapping: lifecycle status → trigger stage ───────────
                # Stages MUST follow the required progression order:
                #   First  ← FTR Approved
                #   Second ← Stock Movement Initiated
                #   Third  ← DOH threshold (only from Second-stage context)
                #
                # DOH Third Intimation is gated: it may only fire when the network
                # status is already "Stock Movement Initiated" (Second stage context)
                # OR the line item is already at Second/Third stage.  This prevents
                # an item jumping from First directly to Third out of sequence.
                if net_status in STATUS_TO_STAGE:
                    new_stage, new_color = STATUS_TO_STAGE[net_status]

                # DOH gate: can only promote to Third from a Second-stage context
                basic_doh_met = bool(succ_doh) and succ_doh > 5 and (pred_doh or 0) < 3
                doh_context_ok = (
                    net_status == "Stock Movement Initiated"
                    or current_stage in ("Second", "Third")
                )
                if basic_doh_met and doh_context_ok:
                    if coverage == "National":
                        # Gate on CLOT: only fire if this line item's depot is in top 70%
                        depot = code_to_depot.get(row.customer_code)
                        if depot:
                            threshold = chain_top70.get(row.customer_chain, 0.0)
                            depot_clot = chain_depot_clot.get(row.customer_chain, {}).get(depot, 1.0)
                            doh_eligible = depot_clot >= threshold
                        else:
                            doh_eligible = False   # no depot mapping → skip
                    else:
                        # Regional / SBM: all depots eligible
                        doh_eligible = True

                    if doh_eligible:
                        # DOH overrides the lifecycle-status stage (highest severity)
                        new_stage, new_color = "Third", "Blinking Red"

                if new_stage is None:
                    continue

                changed = False
                stage_advanced = current_stage != new_stage

                if stage_advanced:
                    row.trigger_stage = new_stage
                    row.urgency_color = new_color
                    # Fresh 3-day SLA window at each new stage
                    row.escalation_due_at = now + timedelta(days=3)
                    row.escalated_at = None
                    changed = True
                else:
                    # Stage unchanged — only sync urgency_color if it drifted
                    if row.urgency_color != new_color:
                        row.urgency_color = new_color
                        changed = True

                # ── Sync ccr_status with trigger activation ───────────────────
                # Any active trigger stage (First–Fourth) promotes the item to
                # "Action Required" so the workspace Action Required tab is accurate.
                # Completed items are never demoted.
                if new_stage != "None" and row.ccr_status not in ("Completed",):
                    if row.ccr_status != "Action Required":
                        row.ccr_status = "Action Required"
                        changed = True

                # ── Escalation back-fill and expiry ───────────────────────────
                # Back-fill escalation_due_at for pre-existing active rows
                if new_stage != "None" and not row.escalation_due_at:
                    activation_ts = row.updated_at or now
                    row.escalation_due_at = activation_ts + timedelta(days=3)
                    changed = True

                # Mark escalated once the SLA window has expired
                if row.escalation_due_at and now > row.escalation_due_at and not row.escalated_at:
                    row.escalated_at = now
                    escalated += 1
                    changed = True

                if changed:
                    row.updated_at = now
                    updated += 1

            db.commit()
            return {"updated": updated, "escalated": escalated}
        finally:
            db.close()

    # ── Execution Engine ────────────────────────────────────────

    def execute_line_item(
        self, item_id: str, payload: dict, network_entries: List[dict]
    ) -> Optional[dict]:
        """
        Apply CCR execution: update MT listing (CIC mappings) per customer
        classification, write audit log, and mark line item Completed.

        MT listing logic:
          Listing (Regional OR National):
            Predecessor stays Mapped; Successor added as Mapped with same CIC.
          Non-Listing (Regional):
            Predecessor → Inactive; Successor → Mapped.
          Non-Listing (National):
            All depots shift — only applied when DOH/CLOT gate is met:
              succ_doh > 5 AND pred_doh < 3 AND depot is in top-70% CLOT.
            If gate not met: depot-shift is deferred; outcome records
            pendingDohClotGate=True so downstream processes can retry.
          New CIC required:
            Old CBU rows in old CIC → Inactive; new CBU → Mapped with new CIC.

        overrides must be a list of structured objects:
          [{field, originalValue, overrideValue, timestamp}]

        actor is always derived server-side (not accepted from client payload).
        """
        import math
        db = SessionLocal()
        try:
            item = db.query(CcrLineItemModel).filter(
                CcrLineItemModel.id == uuid.UUID(item_id)
            ).first()
            if not item:
                return None

            # ── Customer classification ──────────────────────────────
            customer = db.query(CcrCustomerMasterModel).filter(
                CcrCustomerMasterModel.customer_chain == item.customer_chain
            ).first()
            coverage  = customer.coverage_type  if customer else "National"
            behaviour = customer.behaviour_type if customer else "Non-Listing"

            new_cic_required = payload.get("rulesetValues", {}).get("newCicRequired", False)
            cic_code         = payload.get("cicCode") or item.cic
            overrides_list   = payload.get("overrides", [])  # structured [{field,orig,new,ts}]
            ruleset_values   = payload.get("rulesetValues", {})
            actor            = payload.get("_serverActor", "system")  # always server-derived
            justification    = payload.get("justification")
            now              = datetime.now(timezone.utc)

            # ── Derive execution mode server-side from ruleset AND customer type ──
            # Client-supplied executionType is ignored; mode is always determined here.
            # Must mirror client-side derivedMode logic in TakeActionDialog.
            auto_ccr         = bool(ruleset_values.get("autoCcr", False))
            rundown_required = bool(ruleset_values.get("rundownRequired", False))
            if new_cic_required or rundown_required:
                execution_type = "Manual"
            elif coverage == "National" and behaviour == "Non-Listing":
                # National Non-Listing requires manual coordination (depot-level complexity)
                execution_type = "Manual"
            elif auto_ccr and coverage != "National":
                execution_type = "Auto"
            else:
                execution_type = "Semi-Auto"

            # ── DOH / CLOT gating for National Non-Listing ───────────
            # Required per BRD: "all depots shift only after DOH/CLOT"
            pending_doh_clot_gate = False
            if coverage == "National" and behaviour == "Non-Listing" and not new_cic_required:
                entry_map = {
                    e.get("cbuCode") or e.get("cbu_code"): e
                    for e in network_entries
                }
                entry = entry_map.get(item.successor_cbu_code or "")
                succ_doh = int(entry.get("successorDoh") or entry.get("successor_doh") or 0) if entry else 0
                pred_doh = int(entry.get("predecessorDoh") or entry.get("predecessor_doh") or 0) if entry else 0

                # Basic DOH gate: successor has meaningful stock, predecessor is running down
                basic_doh_met = succ_doh > 5 and pred_doh < 3

                # CLOT gating: depot must be in top-70% of chain's depots by CLOT volume
                from sqlalchemy import text as _text
                clot_rows = db.execute(_text(
                    "SELECT customer_chain, depot, COALESCE(clot, 1.0) "
                    "FROM ccr_customer_code_mapping"
                )).fetchall()
                chain_depot_clot: dict = {}
                for ch, dp, cl in clot_rows:
                    chain_depot_clot.setdefault(ch, {})[dp] = float(cl or 1.0)

                depot_clot_map = chain_depot_clot.get(item.customer_chain, {})
                if depot_clot_map:
                    vals = sorted(depot_clot_map.values(), reverse=True)
                    top_n = max(1, math.ceil(len(vals) * 0.70))
                    threshold = vals[top_n - 1] if top_n <= len(vals) else 0.0
                else:
                    threshold = 0.0

                # Look up this item's depot via its customer_code
                code_row = db.query(CcrCustomerCodeMappingModel).filter(
                    CcrCustomerCodeMappingModel.customer_code == item.customer_code
                ).first()
                item_depot = code_row.depot if code_row else None
                item_clot  = depot_clot_map.get(item_depot, 1.0) if item_depot else 0.0
                clot_gate_met = item_clot >= threshold if item_depot else False

                if not (basic_doh_met and clot_gate_met):
                    pending_doh_clot_gate = True

            # ── Predecessor / Successor CIC rows ────────────────────
            pred_rows = (
                db.query(CcrCicMappingModel)
                .filter(
                    CcrCicMappingModel.cbu_code       == item.predecessor_cbu_code,
                    CcrCicMappingModel.customer_chain == item.customer_chain,
                )
                .all()
            )
            succ_rows = (
                db.query(CcrCicMappingModel)
                .filter(
                    CcrCicMappingModel.cbu_code       == item.successor_cbu_code,
                    CcrCicMappingModel.customer_chain == item.customer_chain,
                )
                .all()
            )

            def _upsert_succ_mapped(target_cic: str) -> None:
                """
                Update existing successor rows to Mapped with target_cic.
                If no rows exist, create them by cloning the predecessor's
                customer_code/depot/channel structure (or from customer_code_mapping
                when the predecessor has no rows either).
                """
                if succ_rows:
                    for row in succ_rows:
                        row.cic        = target_cic
                        row.status     = "Mapped"
                        row.updated_at = now
                elif pred_rows:
                    # Clone predecessor rows to create successor rows
                    for tmpl in pred_rows:
                        db.add(CcrCicMappingModel(
                            id=uuid.uuid4(),
                            cbu_code=item.successor_cbu_code,
                            customer_chain=tmpl.customer_chain,
                            customer_code=tmpl.customer_code,
                            cic=target_cic,
                            sales_org=tmpl.sales_org or "1000",
                            channel=tmpl.channel,
                            depot=tmpl.depot,
                            status="Mapped",
                            sourcing_depot=tmpl.sourcing_depot,
                            sourcing_type=tmpl.sourcing_type,
                            pricing_status=tmpl.pricing_status,
                            created_at=now,
                            updated_at=now,
                        ))
                else:
                    # Neither predecessor nor successor rows — create from chain's
                    # customer_code_mappings (depot/channel scaffold)
                    code_maps = (
                        db.query(CcrCustomerCodeMappingModel)
                        .filter(CcrCustomerCodeMappingModel.customer_chain == item.customer_chain)
                        .all()
                    )
                    for cm in code_maps:
                        db.add(CcrCicMappingModel(
                            id=uuid.uuid4(),
                            cbu_code=item.successor_cbu_code,
                            customer_chain=item.customer_chain,
                            customer_code=cm.customer_code,
                            cic=target_cic,
                            depot=cm.depot,
                            status="Mapped",
                            created_at=now,
                            updated_at=now,
                        ))

            if new_cic_required:
                # Old CBU rows in old CIC → Inactive; new CBU → Mapped with new CIC
                for row in pred_rows:
                    if row.cic == item.cic:
                        row.status     = "Inactive"
                        row.updated_at = now
                _upsert_succ_mapped(cic_code)
            elif behaviour == "Listing":
                # Regional OR National Listing:
                # Predecessor stays Mapped; Successor → Mapped with same CIC
                _upsert_succ_mapped(cic_code)
            elif coverage == "National" and not pending_doh_clot_gate:
                # National Non-Listing, DOH/CLOT gate MET: full depot shift
                for row in pred_rows:
                    row.status     = "Inactive"
                    row.updated_at = now
                _upsert_succ_mapped(cic_code)
            elif coverage != "National":
                # Regional Non-Listing: Predecessor → Inactive; Successor → Mapped
                for row in pred_rows:
                    row.status     = "Inactive"
                    row.updated_at = now
                _upsert_succ_mapped(cic_code)
            # else: National Non-Listing, gate NOT met → no mapping changes; deferred

            # ── Build enriched ruleset outcome ───────────────────────
            outcome = {**ruleset_values}
            outcome["coverage"]             = coverage
            outcome["behaviour"]            = behaviour
            outcome["derivedExecutionType"] = execution_type
            outcome["pendingDohClotGate"]   = pending_doh_clot_gate

            if pending_doh_clot_gate:
                # ── Gate NOT met: defer mapping changes ──────────────
                # Do NOT mark Completed. Keep current status so the item
                # remains actionable and re-evaluated by the trigger engine.
                # Record a gate_pending audit event for traceability.
                item.ruleset_outcome = outcome
                item.execution_type  = execution_type
                if overrides_list:
                    item.overrides = overrides_list
                item.updated_at = now

                gate_log = CcrAuditLogModel(
                    id=uuid.uuid4(),
                    ccr_line_item_id=uuid.UUID(item_id),
                    event_type="gate_pending",
                    actor=actor,
                    payload={
                        "message":          "National Non-Listing DOH/CLOT gate not yet met; mapping deferred.",
                        "executionType":    execution_type,
                        "rulesetValues":    ruleset_values,
                        "overrides":        overrides_list,
                        "cicCode":          cic_code,
                        "justification":    justification,
                        "coverage":         coverage,
                        "behaviour":        behaviour,
                    },
                    created_at=now,
                )
                db.add(gate_log)
                db.commit()
                db.refresh(item)
                return _line_item_to_dict(item)

            # ── Gate met (or not applicable): mark Completed ─────────
            item.ccr_status      = "Completed"
            item.execution_type  = execution_type
            item.ruleset_outcome = outcome
            item.cic             = cic_code
            # Persist structured overrides; keep existing if no new ones provided
            if overrides_list:
                item.overrides = overrides_list
            item.updated_at = now

            # ── Audit log ────────────────────────────────────────────
            exec_log = CcrAuditLogModel(
                id=uuid.uuid4(),
                ccr_line_item_id=uuid.UUID(item_id),
                event_type="executed",
                actor=actor,
                payload={
                    "executionType":        execution_type,
                    "rulesetValues":        ruleset_values,
                    "overrides":            overrides_list,
                    "cicCode":              cic_code,
                    "justification":        justification,
                    "coverage":             coverage,
                    "behaviour":            behaviour,
                    "newCicRequired":       new_cic_required,
                    "pendingDohClotGate":   False,
                },
                created_at=now,
            )
            db.add(exec_log)
            db.commit()
            db.refresh(item)
            return _line_item_to_dict(item)
        finally:
            db.close()

    def get_recommendation(self, item_id: str, network_entries: List[dict]) -> Optional[dict]:
        """
        Auto-CCR recommendation engine: generates Scenario A/B/C for an item.
        Uses successor_doh as a proxy for ATP score.
        Scenario A: retain current successor (adequate ATP).
        Scenario B: switch to a higher-ATP alternate sharing the same predecessor.
        Scenario C: flag for manual — no good candidate found.
        """
        db = SessionLocal()
        try:
            item = db.query(CcrLineItemModel).filter(
                CcrLineItemModel.id == uuid.UUID(item_id)
            ).first()
            if not item:
                return None

            entry_map: dict = {}
            for e in network_entries:
                cbu = e.get("cbuCode") or e.get("cbu_code")
                if cbu:
                    entry_map[cbu] = e

            current_entry = entry_map.get(item.successor_cbu_code or "")
            current_atp   = int(
                current_entry.get("successorDoh") or current_entry.get("successor_doh") or 0
            ) if current_entry else 0

            # Find alternates: same predecessor CBU, different successor
            alternates = []
            for cbu_code, entry in entry_map.items():
                if cbu_code == item.successor_cbu_code:
                    continue
                pred = entry.get("predecessorCode") or entry.get("predecessor_code")
                if pred != item.predecessor_cbu_code:
                    continue
                atp = int(entry.get("successorDoh") or entry.get("successor_doh") or 0)
                alternates.append({
                    "cbuCode":     cbu_code,
                    "basepack":    entry.get("basepack"),
                    "description": entry.get("materialDescription") or entry.get("material_description"),
                    "atpScore":    atp,
                    "networkStatus": entry.get("networkStatus") or entry.get("network_status"),
                })
            alternates.sort(key=lambda x: x["atpScore"], reverse=True)

            # Scenario selection
            if alternates and alternates[0]["atpScore"] > current_atp * 1.2:
                scenario = "B"
                rationale = (
                    f"Alternate CBU {alternates[0]['cbuCode']} has significantly higher ATP "
                    f"({alternates[0]['atpScore']} vs {current_atp}). Recommend switching."
                )
            elif current_atp < 5:
                scenario = "C"
                rationale = (
                    f"Current successor DOH/ATP ({current_atp}) is below threshold. "
                    f"No adequate alternate found. Flag for manual review."
                )
            else:
                scenario = "A"
                rationale = (
                    f"Current successor CBU {item.successor_cbu_code} has adequate ATP "
                    f"({current_atp}). Retain current recommendation."
                )

            return {
                "itemId": item_id,
                "currentCbu": {
                    "cbuCode":     item.successor_cbu_code,
                    "basepack":    current_entry.get("basepack") if current_entry else None,
                    "description": (
                        current_entry.get("materialDescription")
                        or current_entry.get("material_description")
                    ) if current_entry else None,
                    "atpScore": current_atp,
                },
                "alternates": alternates[:3],
                "scenario":   scenario,
                "rationale":  rationale,
            }
        finally:
            db.close()

    def get_export_data(self, item_id: str) -> Optional[List[dict]]:
        """
        Return BRD-specified mapping columns for a completed line item.
        Used by the 'Generate Mapping Output' button on the detail page.
        Returns None when the item_id does not exist (router converts to 404).
        """
        db = SessionLocal()
        try:
            item = db.query(CcrLineItemModel).filter(
                CcrLineItemModel.id == uuid.UUID(item_id)
            ).first()
            if not item:
                return None
            rows = (
                db.query(CcrCicMappingModel)
                .filter(
                    CcrCicMappingModel.cbu_code       == item.successor_cbu_code,
                    CcrCicMappingModel.customer_chain == item.customer_chain,
                )
                .all()
            )
            return [
                {
                    "CustomerCode":  r.customer_code,
                    "CustomerChain": r.customer_chain,
                    "CIC":           r.cic,
                    "MaterialCode":  r.cbu_code,
                    "Depot":         r.depot,
                    "MappingStatus": r.status,
                    "SourcingDepot": r.sourcing_depot,
                    "PricingStatus": r.pricing_status,
                }
                for r in rows
            ]
        finally:
            db.close()

    def delisting_response(
        self, item_id: str, action: str, justification: Optional[str]
    ) -> Optional[dict]:
        """
        Handle Accept/Reject for a Paid Bible delisting intimation.
        Accept: mark all CIC mapping rows for the successor CBU × chain as
                'Stock Base Delisted'; set line item ccr_status = Completed.
        Reject: require justification; log rejection; leave mapping unchanged.
        """
        db = SessionLocal()
        try:
            item = db.query(CcrLineItemModel).filter(
                CcrLineItemModel.id == uuid.UUID(item_id)
            ).first()
            if not item:
                return None

            now = datetime.now(timezone.utc)

            if action == "accept":
                rows = (
                    db.query(CcrCicMappingModel)
                    .filter(
                        CcrCicMappingModel.cbu_code       == item.successor_cbu_code,
                        CcrCicMappingModel.customer_chain == item.customer_chain,
                    )
                    .all()
                )
                for row in rows:
                    row.status     = "Stock Base Delisted"
                    row.updated_at = now
                item.ccr_status = "Completed"

            log = CcrAuditLogModel(
                id=uuid.uuid4(),
                ccr_line_item_id=uuid.UUID(item_id),
                event_type=f"delisting_{action}",
                actor="system",
                payload={"action": action, "justification": justification},
                created_at=now,
            )
            db.add(log)
            item.updated_at = now
            db.commit()
            db.refresh(item)
            return _line_item_to_dict(item)
        finally:
            db.close()

    def seed_line_items(self, seeds: List[dict]) -> None:
        db = SessionLocal()
        try:
            existing = {
                (r.predecessor_cbu_code, r.successor_cbu_code, r.customer_chain, r.customer_code)
                for r in db.query(
                    CcrLineItemModel.predecessor_cbu_code,
                    CcrLineItemModel.successor_cbu_code,
                    CcrLineItemModel.customer_chain,
                    CcrLineItemModel.customer_code,
                ).all()
            }
            now = datetime.now(timezone.utc)
            for s in seeds:
                key = (s["predecessor_cbu_code"], s["successor_cbu_code"], s["customer_chain"], s["customer_code"])
                if key not in existing:
                    db.add(CcrLineItemModel(
                        id=uuid.uuid4(),
                        predecessor_cbu_code=s["predecessor_cbu_code"],
                        successor_cbu_code=s["successor_cbu_code"],
                        customer_chain=s["customer_chain"],
                        customer_code=s["customer_code"],
                        cic=s.get("cic"),
                        trigger_stage=s.get("trigger_stage", "None"),
                        urgency_color=s.get("urgency_color", "None"),
                        ccr_status=s.get("ccr_status", "Upcoming"),
                        execution_type=s.get("execution_type", "Manual"),
                        ruleset_outcome=s.get("ruleset_outcome"),
                        overrides=s.get("overrides"),
                        escalation_due_at=None,
                        escalated_at=None,
                        created_at=now,
                        updated_at=now,
                    ))
            db.commit()
        finally:
            db.close()
