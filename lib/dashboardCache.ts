import { getClientCache, setClientCache } from "@/lib/clientCache";
import type { DashboardOverview } from "@/types/dashboard";
import type { UserResultSummary } from "@/types/testLibrary";

export const DASHBOARD_CACHE_KEYS = {
  overview: "dashboard:overview",
  userResults: "dashboard:user-results",
  apiOverview: "api:dashboard:overview",
  apiUserResults: "api:dashboard:results:all",
} as const;

function syncMirroredCache<T>(primaryKey: string, mirrorKey: string) {
  const primaryValue = getClientCache<T>(primaryKey);
  const mirrorValue = getClientCache<T>(mirrorKey);

  if (primaryValue === undefined && mirrorValue !== undefined) {
    setClientCache(primaryKey, mirrorValue, { persistForSession: true });
    return mirrorValue;
  }

  if (primaryValue !== undefined && mirrorValue === undefined) {
    setClientCache(mirrorKey, primaryValue, { persistForSession: true });
  }

  return primaryValue;
}

export function getCachedDashboardOverview() {
  return syncMirroredCache<DashboardOverview>(DASHBOARD_CACHE_KEYS.overview, DASHBOARD_CACHE_KEYS.apiOverview);
}

export function setCachedDashboardOverview(overview: DashboardOverview) {
  setClientCache(DASHBOARD_CACHE_KEYS.overview, overview, { persistForSession: true });
}

export function getCachedDashboardUserResults() {
  return syncMirroredCache<UserResultSummary[]>(DASHBOARD_CACHE_KEYS.userResults, DASHBOARD_CACHE_KEYS.apiUserResults);
}

export function setCachedDashboardUserResults(results: UserResultSummary[]) {
  setClientCache(DASHBOARD_CACHE_KEYS.userResults, results, { persistForSession: true });
}
