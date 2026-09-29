---
name: BSS freshness semantics
description: Distinguish production-age freshness from validity date ranges in BSS configuration
---

The BSS configuration's “Valid Day from Prod Date” is the source of the Freshness day count. It is not a Valid From/To range or a validity start/end date. Present the count as “N days” and omit validity-related date fields from the BSS response and UI.

**Why:** The user explicitly removed validity dates while keeping freshness, so filtering every field containing “valid” would incorrectly discard freshness.

**How to apply:** When a real BSS source becomes available, map its production-date day count to Freshness; keep date-range fields out of the BSS API contract and table.