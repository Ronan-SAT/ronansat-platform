# Session Prefetch Strategy

Status: implemented in progress on 2026-04-28.

## Decision

Client preloads and intent prefetches are session-scoped. Cache entries that should survive normal reloads use `persistForSession: true`, which stores `expiresAt: null` in `sessionStorage`. The cache clears naturally when the browser tab/session ends.

## Boundaries

- Startup preload owns dashboard, full-length page 1, sectional page 1, and review summary.
- Route-level data prefetch is limited to Error log, Vocab, Hall of Fame, and Settings.
- Test-engine data is not broadly route-prefetched. The only allowed test payload prefetch is explicit hover/touch intent on a concrete Start/Retake action.
- Review detail/question data is only warmed for a concrete hovered result/question/back/next target. Explanations remain lazy.
- Hover leave cancels only the pending intent timer. It must not abort a request that already entered `readThroughClientCache`.

## Implementation Notes

- `lib/clientCache.ts` supports `expiresAt: null`, quota eviction, memory-only degradation, and timeout cleanup for inflight requests.
- `hooks/useIntentPrefetch.ts` centralizes 175ms intent delay, touch support, one-shot success flags, and running-key guards.
- Sectional module switching should preserve the selected period/filter and reset only page number.

## Next Check

When modifying any prefetch key, verify the destination page uses the exact same service/key on real load. If hover and click use different functions or parameters, the prefetch is probably useless.
