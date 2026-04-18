import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { readThroughClientCache } from "@/lib/clientCache";
import type { LeaderboardEntry, UserResultSummary, UserStatsSummary } from "@/types/testLibrary";

interface FetchOptions {
  forceRefresh?: boolean;
  view?: "summary" | "detail";
}

export async function fetchDashboardUserResults(
  days?: number,
  options?: FetchOptions,
): Promise<UserResultSummary[]> {
  const view = options?.view ?? "summary";
  const cacheKey = `api:dashboard:results:${days ?? "all"}:${view}`;

  return readThroughClientCache(
    cacheKey,
    async () => {
      const query = new URLSearchParams({ view });
      if (typeof days === "number") {
        query.set("days", String(days));
      }

      const res = await api.get(`${API_PATHS.RESULTS}?${query.toString()}`);
      return (res.data.results || []) as UserResultSummary[];
    },
    { forceRefresh: options?.forceRefresh },
  );
}

export async function fetchDashboardUserStats(
  options?: FetchOptions,
): Promise<UserStatsSummary> {
  const cacheKey = "api:dashboard:stats";

  return readThroughClientCache(
    cacheKey,
    async () => {
      const res = await api.get("/api/user/stats");
      return {
        testsTaken: (res.data.testsTaken || 0) as number,
        highestScore: (res.data.highestScore || 0) as number,
      } satisfies UserStatsSummary;
    },
    { forceRefresh: options?.forceRefresh },
  );
}

export async function fetchLeaderboard(
  options?: FetchOptions,
): Promise<LeaderboardEntry[]> {
  const cacheKey = "api:dashboard:leaderboard";

  return readThroughClientCache(
    cacheKey,
    async () => {
      const res = await api.get("/api/leaderboard");
      return (res.data.leaderboard || []) as LeaderboardEntry[];
    },
    { forceRefresh: options?.forceRefresh },
  );
}
