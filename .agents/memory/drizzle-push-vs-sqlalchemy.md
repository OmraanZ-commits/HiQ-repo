---
name: drizzle-kit push vs SQLAlchemy create_all in this project
description: When adding a new table to shared/schema.ts in this Python-backend project, drizzle-kit push is not required and can hang.
---

The backend (server_py) is FastAPI + SQLAlchemy, not Drizzle. `server_py/db.py`'s `create_tables()` calls `Base.metadata.create_all(bind=engine)` on every startup, so a new SQLAlchemy model class is enough to get the table created — no `npm run db:push` needed for the app to function.

**Why:** `npx drizzle-kit push` in this repo can get stuck on an unrelated interactive prompt (e.g. an existing drift on the `users` table asking whether a column was renamed), which blocks non-interactively and looks like a hang.

**How to apply:** When adding a new table for a Python-backend feature, add it to `shared/schema.ts` (for frontend typing/consistency) AND mirror it as a SQLAlchemy model in `server_py/db.py` + Pydantic models in `server_py/models.py`. Verify the table exists by restarting the workflow and hitting the new endpoint, rather than relying on `drizzle-kit push` succeeding.
