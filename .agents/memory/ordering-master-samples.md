---
name: Operational master sample separation
description: How to use supplied operational source records and examples without misrepresenting them as live customer-chain data
---

Keep illustrative vendor, PO, PDP, FSSAI, and mailer rows in an explicitly labeled sample view, separate from live chain-specific rows. A supplied configuration file without chain identity (such as CSS tolerance data) can be shown as a source view, but must not be claimed as belonging to the selected chain; join it to chain customer codes separately.

**Why:** Supplied identifiers may not correspond to the CCR customer-chain identifiers already stored in the app; example email addresses may not exist at all. Merging them into a selected chain would falsely present examples as that chain's operational master data. The user specifically requested a solution from schemas and samples without asking for large-file uploads.

**How to apply:** When expanding the operational master, preserve the distinction between source/sample and chain-mapped data. Only populate selected-chain fields by matching customer IDs to the selected chain; label unmapped source records rather than attributing them to that chain.