const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_READ_TIMEOUT_MS = 10_000;
const STORAGE_KEY_PREFIX = "bluebook:";
const STORAGE_EVICTION_BATCH_SIZE = 8;

type CacheEntry<T> = {
  value: T;
  expiresAt: number | null;
  createdAt: number;
  lastAccessedAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflightCache = new Map<string, Promise<unknown>>();
const cacheWriteVersions = new Map<string, number>();

function getStorageKey(key: string) {
  return `${STORAGE_KEY_PREFIX}${key}`;
}

function isExpired(entry: CacheEntry<unknown>) {
  return entry.expiresAt !== null && entry.expiresAt <= Date.now();
}

function getClientKeyFromStorageKey(storageKey: string) {
  return storageKey.startsWith(STORAGE_KEY_PREFIX) ? storageKey.slice(STORAGE_KEY_PREFIX.length) : storageKey;
}

function isQuotaExceededError(error: unknown) {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    ((error as { name?: string }).name === "QuotaExceededError" ||
      (error as { name?: string }).name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function normalizeEntry<T>(entry: CacheEntry<T>): CacheEntry<T> {
  const now = Date.now();
  return {
    ...entry,
    createdAt: typeof entry.createdAt === "number" ? entry.createdAt : now,
    lastAccessedAt: now,
  };
}

function getEntryTimestamp(entry: CacheEntry<unknown>) {
  return entry.lastAccessedAt ?? entry.createdAt ?? entry.expiresAt ?? 0;
}

function evictExpiredMemoryEntries() {
  Array.from(memoryCache.entries()).forEach(([key, entry]) => {
    if (isExpired(entry)) {
      memoryCache.delete(key);
    }
  });
}

function evictOldestMemoryEntries(count: number) {
  evictExpiredMemoryEntries();

  Array.from(memoryCache.entries())
    .sort(([, a], [, b]) => getEntryTimestamp(a) - getEntryTimestamp(b))
    .slice(0, count)
    .forEach(([key]) => memoryCache.delete(key));
}

function getSessionStorageEntries() {
  if (typeof window === "undefined") {
    return [];
  }

  return Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
    .map((storageKey) => {
      try {
        const rawValue = window.sessionStorage.getItem(storageKey);
        const entry = rawValue ? normalizeEntry(JSON.parse(rawValue) as CacheEntry<unknown>) : undefined;
        return { storageKey, entry };
      } catch {
        return { storageKey, entry: undefined };
      }
    });
}

function evictOldestStorageEntries(count: number) {
  if (typeof window === "undefined") {
    return;
  }

  const entries = getSessionStorageEntries();
  const expiredOrInvalidKeys = entries
    .filter(({ entry }) => !entry || (entry.expiresAt !== null && typeof entry.expiresAt !== "number") || isExpired(entry))
    .map(({ storageKey }) => storageKey);

  expiredOrInvalidKeys.forEach((storageKey) => {
    window.sessionStorage.removeItem(storageKey);
    memoryCache.delete(getClientKeyFromStorageKey(storageKey));
  });

  if (expiredOrInvalidKeys.length >= count) {
    return;
  }

  entries
    .filter(({ storageKey, entry }) => !expiredOrInvalidKeys.includes(storageKey) && entry)
    .sort((a, b) => getEntryTimestamp(a.entry as CacheEntry<unknown>) - getEntryTimestamp(b.entry as CacheEntry<unknown>))
    .slice(0, count - expiredOrInvalidKeys.length)
    .forEach(({ storageKey }) => {
      window.sessionStorage.removeItem(storageKey);
      memoryCache.delete(getClientKeyFromStorageKey(storageKey));
    });
}

export function evictOldestClientCacheEntries(count = STORAGE_EVICTION_BATCH_SIZE) {
  evictOldestMemoryEntries(count);
  evictOldestStorageEntries(count);
}

function readStorageEntry<T>(key: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const rawValue = window.sessionStorage.getItem(getStorageKey(key));
    if (!rawValue) {
      return undefined;
    }

    const parsedValue = JSON.parse(rawValue) as CacheEntry<T>;
    const hasValidExpiry = parsedValue?.expiresAt === null || typeof parsedValue?.expiresAt === "number";
    if (!parsedValue || typeof parsedValue !== "object" || !hasValidExpiry) {
      window.sessionStorage.removeItem(getStorageKey(key));
      return undefined;
    }

    const normalizedEntry = normalizeEntry(parsedValue);
    if (isExpired(normalizedEntry as CacheEntry<unknown>)) {
      window.sessionStorage.removeItem(getStorageKey(key));
      return undefined;
    }

    writeStorageEntry(key, normalizedEntry);
    return normalizedEntry;
  } catch {
    return undefined;
  }
}

function writeStorageEntry<T>(key: string, entry: CacheEntry<T>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getStorageKey(key), JSON.stringify(entry));
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      return;
    }

    evictOldestClientCacheEntries();

    try {
      window.sessionStorage.setItem(getStorageKey(key), JSON.stringify(entry));
    } catch {
      // Keep serving from memory if storage is still unavailable.
    }
  }
}

export function getClientCache<T>(key: string): T | undefined {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry) {
    if (isExpired(memoryEntry)) {
      memoryCache.delete(key);
    } else {
      memoryEntry.lastAccessedAt = Date.now();
      return memoryEntry.value as T;
    }
  }

  const storageEntry = readStorageEntry<T>(key);
  if (!storageEntry) {
    return undefined;
  }

  memoryCache.set(key, storageEntry);
  return storageEntry.value;
}

export type SetClientCacheOptions = {
  ttlMs?: number;
  persistForSession?: boolean;
};

function normalizeSetOptions(options?: number | SetClientCacheOptions): SetClientCacheOptions | undefined {
  if (typeof options === "number") {
    return { ttlMs: options };
  }

  return options;
}

function createCacheEntry<T>(value: T, options?: SetClientCacheOptions): CacheEntry<T> {
  const now = Date.now();
  return {
    value,
    expiresAt: options?.persistForSession ? null : now + (options?.ttlMs ?? DEFAULT_TTL_MS),
    createdAt: now,
    lastAccessedAt: now,
  };
}

export function setClientCache<T>(key: string, value: T, options?: number | SetClientCacheOptions) {
  const entry = createCacheEntry(value, normalizeSetOptions(options));

  memoryCache.set(key, entry);
  writeStorageEntry(key, entry);
}

export function setSessionClientCache<T>(key: string, value: T) {
  setClientCache(key, value, { persistForSession: true });
}

export function deleteClientCache(key: string) {
  memoryCache.delete(key);
  inflightCache.delete(key);
  cacheWriteVersions.delete(key);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(getStorageKey(key));
  } catch {
    // Ignore storage delete failures and continue.
  }
}

export function clearClientCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear();
    inflightCache.clear();
    cacheWriteVersions.clear();

    if (typeof window !== "undefined") {
      try {
        Object.keys(window.sessionStorage)
          .filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
          .forEach((key) => window.sessionStorage.removeItem(key));
      } catch {
        // Ignore storage cleanup failures and continue.
      }
    }

    return;
  }

  Array.from(memoryCache.keys())
    .filter((key) => key.startsWith(keyPrefix))
    .forEach((key) => memoryCache.delete(key));
  Array.from(inflightCache.keys())
    .filter((key) => key.startsWith(keyPrefix))
    .forEach((key) => inflightCache.delete(key));
  Array.from(cacheWriteVersions.keys())
    .filter((key) => key.startsWith(keyPrefix))
    .forEach((key) => cacheWriteVersions.delete(key));

  if (typeof window === "undefined") {
    return;
  }

  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(getStorageKey(keyPrefix)))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Ignore storage cleanup failures and continue.
  }
}

interface ReadThroughOptions {
  forceRefresh?: boolean;
  ttlMs?: number;
  persistForSession?: boolean;
  timeoutMs?: number;
}

function withTimeout<T>(request: Promise<T>, timeoutMs: number, key: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Client cache request timed out for ${key}`));
    }, timeoutMs);
  });

  return Promise.race([request, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export async function readThroughClientCache<T>(
  key: string,
  load: () => Promise<T>,
  options?: ReadThroughOptions,
) {
  if (!options?.forceRefresh) {
    const cachedValue = getClientCache<T>(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const inflightValue = inflightCache.get(key);
    if (inflightValue) {
      return inflightValue as Promise<T>;
    }
  }

  if (options?.forceRefresh) {
    cacheWriteVersions.set(key, (cacheWriteVersions.get(key) ?? 0) + 1);
  }

  const requestVersion = cacheWriteVersions.get(key) ?? 0;
  const request = withTimeout(Promise.resolve().then(load), options?.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS, key)
    .then((value) => {
      if ((cacheWriteVersions.get(key) ?? 0) === requestVersion) {
        setClientCache(key, value, {
          ttlMs: options?.ttlMs,
          persistForSession: options?.persistForSession,
        });
      }
      if (inflightCache.get(key) === request) {
        inflightCache.delete(key);
      }
      return value;
    })
    .catch((error) => {
      if (inflightCache.get(key) === request) {
        inflightCache.delete(key);
      }
      throw error;
    });

  inflightCache.set(key, request);
  return request;
}
