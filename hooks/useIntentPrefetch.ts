"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type FocusEventHandler,
  type MouseEventHandler,
  type TouchEventHandler,
} from "react";

const DEFAULT_HOVER_INTENT_DELAY_MS = 175;
const completedPrefetchKeys = new Set<string>();
const runningPrefetchKeys = new Set<string>();

type ModernIntentPrefetchOptions = {
  key: string;
  enabled?: boolean;
  delayMs?: number;
  onPrefetch: () => Promise<unknown> | void;
};

type LegacyIntentPrefetchOptions = {
  prefetchKey: string;
  prefetch: (signal: AbortSignal) => Promise<unknown> | void;
  disabled?: boolean;
  delayMs?: number;
  touchDelayMs?: number;
};

type UseIntentPrefetchOptions = ModernIntentPrefetchOptions | LegacyIntentPrefetchOptions;

export type IntentPrefetchHandlers<TElement extends HTMLElement = HTMLElement> = {
  onMouseEnter: MouseEventHandler<TElement>;
  onMouseLeave: MouseEventHandler<TElement>;
  onFocus: FocusEventHandler<TElement>;
  onBlur: FocusEventHandler<TElement>;
  onTouchStart: TouchEventHandler<TElement>;
};

function getIntentConfig(options: UseIntentPrefetchOptions) {
  if ("prefetchKey" in options) {
    return {
      key: options.prefetchKey,
      enabled: !options.disabled,
      delayMs: options.delayMs ?? DEFAULT_HOVER_INTENT_DELAY_MS,
      touchDelayMs: options.touchDelayMs ?? 0,
      onPrefetch: () => options.prefetch(new AbortController().signal),
    };
  }

  return {
    key: options.key,
    enabled: options.enabled ?? true,
    delayMs: options.delayMs ?? DEFAULT_HOVER_INTENT_DELAY_MS,
    touchDelayMs: options.delayMs ?? DEFAULT_HOVER_INTENT_DELAY_MS,
    onPrefetch: options.onPrefetch,
  };
}

export function useIntentPrefetch<TElement extends HTMLElement = HTMLElement>(
  options: UseIntentPrefetchOptions,
): IntentPrefetchHandlers<TElement> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = getIntentConfig(options);
  const onPrefetchRef = useRef(config.onPrefetch);

  useEffect(() => {
    onPrefetchRef.current = config.onPrefetch;
  }, [config.onPrefetch]);

  const clearIntent = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const beginIntent = useCallback(
    (delayMs: number) => {
      if (!config.enabled || !config.key || completedPrefetchKeys.has(config.key) || runningPrefetchKeys.has(config.key)) {
        return;
      }

      clearIntent();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;

        if (!config.enabled || completedPrefetchKeys.has(config.key) || runningPrefetchKeys.has(config.key)) {
          return;
        }

        runningPrefetchKeys.add(config.key);
        Promise.resolve(onPrefetchRef.current())
          .then(() => {
            completedPrefetchKeys.add(config.key);
          })
          .catch((error) => {
            if (process.env.NODE_ENV !== "production") {
              console.warn("Intent prefetch failed", config.key, error);
            }
          })
          .finally(() => {
            runningPrefetchKeys.delete(config.key);
          });
      }, delayMs);
    },
    [clearIntent, config.enabled, config.key],
  );

  useEffect(() => clearIntent, [clearIntent]);

  return {
    onMouseEnter: () => beginIntent(config.delayMs),
    onMouseLeave: clearIntent,
    onFocus: () => beginIntent(config.delayMs),
    onBlur: clearIntent,
    onTouchStart: () => beginIntent(config.touchDelayMs),
  };
}
