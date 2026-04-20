import { getClientCache, setClientCache } from "@/lib/clientCache";
import type { DashboardOverview } from "@/types/dashboard";
import type { LeaderboardEntry, UserResultSummary } from "@/types/testLibrary";

export const DASHBOARD_CACHE_KEYS = {
  overview: "dashboard:overview",
  leaderboard: "dashboard:leaderboard",
  userResults: "dashboard:user-results",
  apiOverview: "api:dashboard:overview",
  apiLeaderboard: "api:dashboard:leaderboard",
  apiUserResults: "api:dashboard:results:all",
} as const;

export type DashboardBundle = {
  overview: DashboardOverview;
  leaderboard: LeaderboardEntry[];
};

function syncMirroredCache<T>(primaryKey: string, mirrorKey: string) {
  const primaryValue = getClientCache<T>(primaryKey);
  const mirrorValue = getClientCache<T>(mirrorKey);

  if (primaryValue === undefined && mirrorValue !== undefined) {
    setClientCache(primaryKey, mirrorValue);
    return mirrorValue;
  }

  if (primaryValue !== undefined && mirrorValue === undefined) {
    setClientCache(mirrorKey, primaryValue);
  }

  return primaryValue;
}

export function getCachedDashboardBundle() {
  const overview = syncMirroredCache<DashboardOverview>(DASHBOARD_CACHE_KEYS.overview, DASHBOARD_CACHE_KEYS.apiOverview);
  const leaderboard = syncMirroredCache<LeaderboardEntry[]>(
    DASHBOARD_CACHE_KEYS.leaderboard,
    DASHBOARD_CACHE_KEYS.apiLeaderboard,
  );

  if (overview === undefined || leaderboard === undefined) {
    return undefined;
  }

  return {
    overview,
    leaderboard,
  } satisfies DashboardBundle;
}

export function setCachedDashboardBundle(bundle: DashboardBundle) {
  setClientCache(DASHBOARD_CACHE_KEYS.overview, bundle.overview);
  setClientCache(DASHBOARD_CACHE_KEYS.leaderboard, bundle.leaderboard);
}

export function getCachedDashboardUserResults() {
  return syncMirroredCache<UserResultSummary[]>(DASHBOARD_CACHE_KEYS.userResults, DASHBOARD_CACHE_KEYS.apiUserResults);
}

export function setCachedDashboardUserResults(results: UserResultSummary[]) {
  setClientCache(DASHBOARD_CACHE_KEYS.userResults, results);
}
