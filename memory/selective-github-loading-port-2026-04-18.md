# 2026-04-18 Selective GitHub Loading Port

## Decision

Port only the safe loading improvements from `origin/main` into local, and keep local as the source of truth for session boot and provider scoping.

## Kept From Local

- Server-fetched session in `app/layout.tsx`
- `AuthProvider` with an explicit `session` prop
- Route-local board providers instead of a root-level `VocabBoardProvider`
- Recent local fixes around question rendering and cache behavior

## Ported From GitHub, Adapted For Local

- Shared redirect helper logic through `lib/getPostAuthRedirectPath.ts`
- Startup cache preloading through `components/AppStartupPreloader.tsx` and `lib/startupPreload.ts`

## Explicitly Rejected From GitHub

- Client-only auth boot in `components/AuthProvider.tsx`
- Root layout `VocabBoardProvider`
- Global boot overlay and initial-tab pending flow

## Why

- The redirect helper improves consistency and avoids auth-route drift.
- Startup preloading improves perceived loading without changing server/client boundaries or blocking the UI.
- The rejected GitHub pieces are tied to regressions already seen locally: unnecessary vocab hydration, auth flicker, and possible app-wide boot deadlocks.
