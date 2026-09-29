---
name: BSS exception presentation
description: Business-facing field selection for the BSS Exception List
---

For the BSS Exception List, show only Customer, Material, and Batch in the frontend. Keep Price Lot, Cl., DChl, and Grp4 available in the backend response without making them columns in this view.

**Why:** The user explicitly wants the lookup to focus on the identifiers needed for exception review and considers the SAP scope fields backend context, not useful display columns.

**How to apply:** When connecting real BSS exception data or changing exports, preserve the backend fields but do not surface those four as default UI columns without a new request.