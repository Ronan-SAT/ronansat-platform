# Supabase Project Cutover To afmeruhjbgqeebczpxzf

## Status

- Done: migrated remote Supabase app data from `awzhqoxnyxyciaoejjno` into `afmeruhjbgqeebczpxzf`.
- Done: pushed repo-managed Supabase migrations and config to the new project.
- Done: updated repo defaults that still pointed at the old project ref.

## What Changed

- Applied all checked-in migrations to the new Supabase project.
- Dumped data from the old project's `public`, `auth`, and `storage` schemas, excluding internal migration tables that should remain project-owned.
- Restored that dump into the new project after truncating newly created tables to avoid duplicate seeded rows.
- Confirmed the old project had no Storage buckets or objects, so no blob copy step was required.
- Swapped local and documented default project refs from `awzhqoxnyxyciaoejjno` to `afmeruhjbgqeebczpxzf`.

## Verification

- Old project row estimates captured before cutover showed 48 auth users and populated `public` runtime tables.
- New project accepted the repo migration set via `supabase db push --linked --include-all`.
- New project accepted the imported SQL dump through a direct Postgres restore.
- `supabase config push --project-ref afmeruhjbgqeebczpxzf --yes` completed successfully.

## Follow-Up

- Keep the old project as a short-term rollback source until app login and core student/admin flows are smoke-tested against the new project.
- Remove or archive the old Supabase project only after production env consumers are confirmed to be using the new URL and keys.
