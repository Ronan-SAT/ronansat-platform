import { readThroughClientCache } from "@/lib/clientCache";
import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { DASHBOARD_CACHE_KEYS } from "@/lib/dashboardCache";
import type { DashboardOverview } from "@/types/dashboard";
import type { LeaderboardEntry, UserResultSummary } from "@/types/testLibrary";

/** Shared options accepted by every service function in this module. */
interface FetchOptions {
  /** When true, skip the cache and always hit the network. */
  forceRefresh?: boolean;
}

// ---------------------------------------------------------------------------
// fetchDashboardUserResults
// ---------------------------------------------------------------------------

/**
 * Returns the current user's result history for the given time window.
 *
 * The cache key includes the `days` parameter so results for different windows
 * are stored independently and never collide.
 */
export async function fetchDashboardUserResults(
  days?: number,
  options?: FetchOptions,
): Promise<UserResultSummary[]> {
  const params = new URLSearchParams({ summary: "1" });
  if (typeof days === "number") {
    params.set("days", String(days));
  }

  const cacheKey = DASHBOARD_CACHE_KEYS.apiUserResults;

  return readThroughClientCache(
    cacheKey,
    async () => {
      const res = await api.get(`${API_PATHS.RESULTS}?${params.toString()}`);
      return (res.data.results || []) as UserResultSummary[];
    },
    options,
  );
}

export async function fetchDashboardOverview(options?: FetchOptions): Promise<DashboardOverview> {
  return readThroughClientCache(
    DASHBOARD_CACHE_KEYS.apiOverview,
    async () => {
      const res = await api.get(API_PATHS.USER_DASHBOARD);
      return res.data as DashboardOverview;
    },
    options,
  );
}

// ---------------------------------------------------------------------------
// fetchLeaderboard
// ---------------------------------------------------------------------------

/**
 * Returns the global leaderboard entries.
 */
export async function fetchLeaderboard(
  options?: FetchOptions,
): Promise<LeaderboardEntry[]> {
  return readThroughClientCache(
    DASHBOARD_CACHE_KEYS.apiLeaderboard,
    async () => {
      const res = await api.get("/api/leaderboard");
      return (res.data.leaderboard || []) as LeaderboardEntry[];
    },
    options,
  );
}
