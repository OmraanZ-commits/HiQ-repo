---
name: MultiSelectFilter checkbox testid placement
description: Where to put data-testid on checkbox-list popover filters so automated/E2E clicks register reliably
---

In the shared `MultiSelectFilter` popover component (checkbox option rows), put `data-testid` on the
clickable row `<div>` that owns the `onClick` toggle handler — not on the inner `Checkbox` itself.

**Why:** The Checkbox is rendered with `pointer-events-none` (purely visual, toggle logic lives on the row's
onClick). Playwright/E2E clicks targeting the checkbox element directly (because that's where the testid was)
were unreliable/no-ops during automated testing, even though manual clicks on the row happened to work.

**How to apply:** Any future popover/list-based multi-select checkbox UI should expose the testid (and be the
click target) on the outer interactive row, treating the checkbox purely as a visual indicator that mirrors
`value.includes(...)` state.
