---
name: Seed-backed action eligibility
description: Why an action-ready demo seed must be checked against the initialized app, not just its seed definition.
---

Verify any seed-backed action through the running application's persisted records and eligibility endpoint, not just against the seed definition or an isolated service test.

**Why:** Insert-only seeding correctly preserves existing records, so a reused identifier can point to older non-qualifying data. Background score refresh can also change clearance after a seed is inserted. Neither problem appears in a test that evaluates only the declared seed object. Stock dates must not be restamped merely to keep a demonstration eligible; that would misrepresent old quantities as current evidence.

**How to apply:** Use unused fixture identities without overwriting existing records, check live stock and clearance after startup, and let actions fail when genuinely measured evidence has expired. If a demonstration depends on stable seeded scores, make that choice explicit and isolate it from operational records.