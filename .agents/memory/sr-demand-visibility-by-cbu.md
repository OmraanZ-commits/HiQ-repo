---
name: SR Demand Visibility is per-CBU, not per-basepack
description: Overview-page Demand Visibility check must be broken out per CBU sharing a basepack, not aggregated into one number.
---

Demand Visibility on the Service Request Overview tab is computed per CBU (network entry), not as a single basepack-level aggregate — a basepack can have multiple CBUs, each with its own depot footprint and demand.

**Why:** `demand_forecast_entries` rows are keyed by `depot`, and each `network_entries` (CBU) row has its own `depot` array. Summing all demand rows for a basepack conflates CBUs with completely different depot footprints and hides which specific CBU actually lacks visibility.

**How to apply:** `validationSummary.demandVisibility` carries both an aggregate (`status`/`totalUnits`/`mocMonths`) and a `byCbu: [{cbuCode, cbuDescription, status, totalUnits, mocMonths}]` array — one entry per CBU sharing the SR's basepack, computed by filtering demand rows to that CBU's `depot` list. The frontend renders one card per `byCbu` entry when present, falling back to a single card for legacy SRs without the breakdown. Sourcing/Price/MSTN checks remain single-CBU (tied to the SR's own `cbuCode`), only Demand Visibility fans out across CBUs.
