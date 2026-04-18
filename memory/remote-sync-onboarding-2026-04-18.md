# 2026-04-18 Remote Sync: Onboarding Port

## What was integrated

- Remote student profile-completion support based on `username` and `birthDate`
- Session payload expansion so auth-aware pages can route incomplete student accounts to `/welcome`
- New onboarding endpoints:
  - `/api/user/username`
  - `/api/user/onboarding`
- Welcome onboarding page at `/welcome`
- Settings display for locked `username` and `birthDate`

## What stayed local

- Server-first session hydration in the root layout
- Non-blocking cache preloader
- Route-local vocab/fix providers
- Existing render/cache fixes from the local regression work

## What was explicitly not merged

- Remote global loading overlays
- Remote client-only `AuthProvider`
- Remote root-layout provider changes
- Remote client-side auth gating rewrites for the main study routes

## QA outcome

- Static verification passed:
  - `eslint`
  - `tsc`
  - `npm run build`
- HTTP smoke checks passed for unauthenticated redirects and new API auth guards.
- Full authenticated end-to-end QA could not be completed because DB-backed auth/register flow is failing or hanging in the current environment, which prevented reliable temporary-user login testing.
