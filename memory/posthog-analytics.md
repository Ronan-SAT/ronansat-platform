# PostHog Analytics Integration

## 2026-04-18

- Added a single root `components/PostHogProvider.tsx` client wrapper in `app/layout.tsx` so analytics initialization stays centralized.
- The browser SDK initializes only when `NEXT_PUBLIC_POSTHOG_KEY` is present.
- Pageviews are captured manually on App Router navigation changes to avoid duplicate automatic pageview events.
- Authenticated users are identified from the existing NextAuth session using `user.id` as the distinct id plus `email`, `name`, `role`, `username`, and `hasCompletedProfile` as person properties.
- `NEXT_PUBLIC_POSTHOG_HOST` defaults to `https://us.i.posthog.com` and can be overridden for EU or self-hosted PostHog projects.
