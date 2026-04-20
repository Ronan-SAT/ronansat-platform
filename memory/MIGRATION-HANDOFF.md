# Migration Handoff

## Summary

This repository is mid-migration from `NextAuth + MongoDB` to `Supabase Auth + Postgres + RLS`.

The old auth path has been removed from live application code.

The current state is:

- Supabase local setup exists and works.
- Core SQL schema and RLS exist.
- Local migration scripts exist and were executed.
- Main auth/runtime/service cutover has been implemented.
- Mongo remains intentionally in use for `FixBoard` and fix reports.
- Hall-of-fame student cards still remain in Mongo.
- Some legacy data is malformed and was skipped during migration.

## Local Supabase

Repo-local ports:

- API: `http://127.0.0.1:55321`
- DB: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`
- Studio: `http://127.0.0.1:55323`
- Inbucket: `http://127.0.0.1:55324`

Useful commands:

- `bun run supabase:start`
- `bun run supabase:stop`
- `bun run supabase:db:reset`
- `bun run db -- --fetch`
- `bun run supabase:migrate:users`
- `bun run supabase:migrate:tests`
- `bun run supabase:migrate:user-data`
- `bun run supabase:migrate:results`
- `bun run supabase:migrate:all`

Local database workflow notes:

- `bun run db -- --fetch` refreshes local Supabase from the linked production project, refreshes local MongoDB from the configured remote Mongo source, and writes a gitignored local Supabase snapshot to `supabase/seeds/local-data.sql`.
- `bun run supabase:db:reset` is now a local wrapper that runs a normal local reset first, then restores `supabase/seeds/local-data.sql` if that snapshot exists.
- Production database automation still uses `supabase db push` only. It does not run `db reset` and does not apply local snapshot seed files.

The MongoDB -> Supabase migration scripts now live in `scripts/migrations/mongodb-to-supabase/`.

## What was implemented

### Auth

- Old `next-auth` dependency removed.
- Old `lib/authOptions.ts` removed.
- Old NextAuth catch-all route replaced with `410` response.
- Direct app auth layer now lives in:
  - `lib/auth/session.ts`
  - `lib/auth/client.tsx`
  - `lib/auth/server.ts`
  - `lib/auth/middleware.ts`

### Supabase

- Helpers live in:
  - `lib/supabase/env.ts`
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
  - `lib/supabase/admin.ts`
- Supabase migrations live in `supabase/migrations/`.

### Runtime cutover

Moved to Supabase-backed runtime paths:

- auth pages
- profile gate
- onboarding
- username availability
- settings
- password change
- tests service
- questions service
- question explanation route
- user stats
- review reasons
- vocab board
- results service
- review error log
- answer reason persistence

### Mongo retained intentionally

- `app/api/fix-board/route.ts`
- `app/api/fix-reports/route.ts`
- `app/api/students/route.ts`
- legacy `FixBoard` model and Mongo connection for fix workflow
- legacy `studentCard` model for hall-of-fame cards

### Mongo removed after cutover

- leaderboard is now computed from Supabase `test_attempts`
- old Mongo `User`, `Result`, `Test`, and `Question` models were removed
- old Mongo-only seed/import scripts for tests/questions were removed
- old SMTP email helper files were removed because password reset now uses Supabase Auth directly

`/api/fix-reports` now maps Postgres UUID ids back to `legacy_mongo_id` before writing into Mongo.

## Data migration status

Local source counts at last run:

- users: `41`
- tests: `38`
- questions: `3698`
- results: `86`

Local Supabase counts at last run:

- profiles: `41`
- user roles: `41`
- tests: `38`
- questions: `3454`
- attempts: `32`
- attempt answers: `1325`
- review reasons: `123`
- vocab cards: `34`
- vocab columns: `9`

Known skipped rows:

- `30` malformed questions
- `54` results
- `638` result answers

## Why rows were skipped

Questions were skipped when legacy data had issues such as:

- missing MC options
- missing SPR accepted answers
- correct answer not matching any imported option

Results/answers were skipped when referenced relations could not be mapped after question migration.

## Highest-priority next steps

1. Run a real browser verification pass over the migrated runtime.
2. Fix migration scripts or source data for skipped malformed rows.
3. Re-run migration from a clean reset and compare counts again.
4. Remove dead Mongo code for domains already migrated.
5. Decide the production user-auth migration policy.

## Suggested verification checklist

1. Logged-out redirect to `/auth`
2. Email/password sign-up
3. Email/password sign-in
4. Google OAuth sign-in
5. Welcome onboarding submit
6. Settings load
7. Password change
8. Test libraries load
9. Live test loads questions
10. Result submission writes attempts
11. Review results load
12. Error log loads and reason changes persist
13. Vocab board loads and saves
14. Admin page access control
15. Fix report submission from test/review screens

## Notes for continuation

- Do not reintroduce `next-auth`.
- Prefer `lib/auth/*` and `lib/supabase/*` only.
- Keep Mongo limited to fix workflows unless there is an explicit decision to migrate those too.
- Update this file and `memory/MIGRATION-PLAN.md` as soon as new phases complete.
