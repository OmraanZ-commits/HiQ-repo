---
name: Narration generation rate limit
description: Practical concurrency constraint for generating multi-segment narrated media
---

For multi-segment ElevenLabs narration, dispatch fewer than ten speech requests in a one-second window. A larger simultaneous batch can partially succeed while the rest receive HTTP 429, so inspect every result and retry only failed segments.

**Why:** A sixteen-segment burst encountered the repl-wide ten-requests-per-second limit; missing audio clips would otherwise leave a video render incomplete.

**How to apply:** Generate in bounded batches or stagger starts, and verify all expected output files before rendering.