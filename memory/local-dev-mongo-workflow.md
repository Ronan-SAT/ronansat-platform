# Local Dev Mongo Workflow

## 2026-04-18

- `bun run dev` now starts the app against `LOCAL_MONGODB_URI` instead of the shared remote `MONGODB_URI`.
- `bun run db` now starts the local MongoDB service for the configured local target on supported platforms.
- If `LOCAL_MONGODB_URI` is not set, the default local target is `mongodb://127.0.0.1:27017/ronansat-local`.
- If the local database is empty on first run, `bun run db` now auto-syncs from `REMOTE_MONGODB_URI` or the shared `MONGODB_URI` before development starts.
- `bun run db -- --fetch` performs an explicit one-way sync from `REMOTE_MONGODB_URI` or the shared `MONGODB_URI` into the local database.
- The dev launcher refuses to sync into a non-local MongoDB target so it cannot accidentally overwrite a remote environment.
- This workflow only changes MongoDB targeting for local development. Other services still follow the loaded env unless locally overridden.
