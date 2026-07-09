---
name: SR approval chain blocking semantics
description: How the 4-stage SR approver chain (Supply Planner/Demand Planner/Network Planner/NCSM) validates and blocks
---

The Network Planner step blocks approval only when `pricingComplete` / `sourcingComplete` are explicitly `False` on the SR record — absence of these fields (`None`) does NOT block. Nothing currently populates these two fields anywhere in the codebase, so the blocking rule is effectively a no-op until a computation source (e.g. CBU `priceActive` + sourcing mapping via list_master_service) is wired in to set them.

**Why:** avoids blocking real approvals on missing/uncomputed data while the feature is partially built; treats "unknown" as "not blocked" rather than failing closed.

**How to apply:** if asked to make Network Planner blocking "real", add code that computes and persists `pricingComplete`/`sourcingComplete` on the SR (at raise time or before this approval step), then the existing check in `service.py` will start enforcing it with no other changes needed.

Also: mandatory-comment rules are enforced per-action in the saga step handlers, not in the frontend alone — `approve_step` requires comments when Supply Planner modifies `effectiveDate`, and `reject_step` requires a non-empty reason at any step. `effectiveDate` must be strictly greater than "today" at SR-raise time (enforced server-side in `raise_sr`).
