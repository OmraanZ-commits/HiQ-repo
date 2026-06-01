---
name: Paid Bible Summary Tab
description: Architecture notes for the paid-bible summary tab — type access patterns and data derivation approach
---

The Summary tab (`paid-bible-summary.tsx`) is self-contained and lazy-loaded.

**Why not import PbBasepack/PbMaterial from paid-bible.tsx:**
These types are defined locally inside paid-bible.tsx (not exported). The summary tab instead uses `NetworkEntry` from `@shared/schema` and re-derives basepack groups locally with its own copy of `deriveBpStatus()`.

**How to apply:**
Any future page/component needing basepack-level data should use `/api/network-entries` + local derivation, not import from paid-bible.tsx.

**Relaunch detection:**
Codes: `RL_ART_PKG`, `RL_ART_FORM`, `RL_PKG_FORM`, `RL_ART`, `RL_FORM`, `RL_PKG` (RELAUNCH_CODES Set).

**Timeline buckets:** Cumulative from today — ≤15 days, ≤30 days, ≤60 days (networkChangeDate).
