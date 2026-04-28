import { readThroughClientCache } from "@/lib/clientCache";
import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { DASHBOARD_CACHE_KEYS } from "@/lib/dashboardCache";
import type { DashboardOverview } from "@/types/dashboard";
import type { UserResultSummary } from "@/types/testLibrary";

interface FetchOptions {
  forceRefresh?: boolean;
  ttlMs?: number;
  persistForSession?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function fetchDashboardUserResults(
  days?: number,
  options?: FetchOptions,
): Promise<UserResultSummary[]> {
  const params = new URLSearchParams({ summary: "1" });
  if (typeof days === "number") {
    params.set("days", String(days));
  }

  const cacheKey =
    typeof days === "number" ? `${DASHBOARD_CACHE_KEYS.apiUserResults}:${days}` : DASHBOARD_CACHE_KEYS.apiUserResults;

  return readThroughClientCache(
    cacheKey,
    async () => {
      const res = await api.get(`${API_PATHS.RESULTS}?${params.toString()}`, { signal: options?.signal });
      return (res.data.results || []) as UserResultSummary[];
    },
    { ...options, persistForSession: options?.persistForSession ?? true },
  );
}

export async function fetchDashboardOverview(options?: FetchOptions): Promise<DashboardOverview> {
  return readThroughClientCache(
    DASHBOARD_CACHE_KEYS.apiOverview,
    async () => {
      const res = await api.get(API_PATHS.USER_DASHBOARD, { signal: options?.signal });
      return res.data as DashboardOverview;
    },
    { ...options, persistForSession: options?.persistForSession ?? true },
  );
}
