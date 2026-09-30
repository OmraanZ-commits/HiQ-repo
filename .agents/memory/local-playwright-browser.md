---
name: Local Playwright browser
description: How to run headless Playwright checks when its managed browser executable is missing in this Repl.
---

Use the system Chromium executable reported by `command -v chromium` as Playwright's `executablePath` for local headless interaction checks, with `--no-sandbox` when needed. Do not bake this workspace-specific path into product code.

**Why:** The installed Playwright package reported managed browser paths, but both its default headless-shell path and its regular managed Chromium path were absent. The Replit-provided system Chromium launched successfully without downloading another browser.

**How to apply:** When a local Playwright launch says its browser executable does not exist, check for system Chromium before installing a browser. This applies to local verification, not production app behavior.

Playwright's `recordVideo` also requires its own managed ffmpeg binary; an ffmpeg executable available on the shell PATH does not satisfy that requirement. If the managed binary is absent and the goal is a short UI proof clip, timed Playwright screenshots can be captured as frames and encoded with the system ffmpeg instead.

**Why:** A video-recording context failed before page creation even though shell ffmpeg was installed. Frame capture avoided a browser-tool download and preserved authentic non-destructive UI interactions.

**How to apply:** Check the managed recorder requirement before planning Playwright video capture. Prefer the frame approach for a few short clips when system ffmpeg is already present.