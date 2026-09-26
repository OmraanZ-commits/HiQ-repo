---
name: Local Playwright browser
description: How to run headless Playwright checks when its managed browser executable is missing in this Repl.
---

Use the system Chromium executable reported by `command -v chromium` as Playwright's `executablePath` for local headless interaction checks, with `--no-sandbox` when needed. Do not bake this workspace-specific path into product code.

**Why:** The installed Playwright package reported managed browser paths, but both its default headless-shell path and its regular managed Chromium path were absent. The Replit-provided system Chromium launched successfully without downloading another browser.

**How to apply:** When a local Playwright launch says its browser executable does not exist, check for system Chromium before installing a browser. This applies to local verification, not production app behavior.