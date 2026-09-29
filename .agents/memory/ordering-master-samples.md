---
name: Ordering master sample separation
description: How to use supplied ordering/compliance examples without misrepresenting them as live customer-chain data
---

Keep illustrative vendor, PO, PDP, and FSSAI source rows in an explicitly labeled sample view, separate from live chain-specific customer/depot rows.

**Why:** The supplied sample identifiers do not correspond to the CCR customer-chain identifiers already stored in the app. Merging them into a selected chain would falsely present examples as that chain's operational master data. The user specifically requested a solution from schemas and samples without asking for large-file uploads.

**How to apply:** When expanding the operational master, preserve the distinction between sample and live data. Only populate live fields from an authoritative source matched to that customer; keep sample records labeled until such a source exists.