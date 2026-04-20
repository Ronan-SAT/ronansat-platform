import { getClientCache, setClientCache } from "@/lib/clientCache";
import {
  getCachedDashboardBundle,
  getCachedDashboardUserResults,
  setCachedDashboardBundle,
  setCachedDashboardUserResults,
  type DashboardBundle,
} from "@/lib/dashboardCache";
import type { Role } from "@/lib/permissions";
import { fetchDashboardOverview, fetchDashboardUserResults, fetchLeaderboard } from "@/lib/services/dashboardService";
import { fetchTestsPage, getTestsClientCacheKey } from "@/lib/services/testLibraryService";
import type { CachedTestsPayload } from "@/types/testLibrary";

const FULL_LENGTH_CACHE_KEY = getTestsClientCacheKey(1, 15, "newest", { selectedPeriod: "All" });
const SECTIONAL_READING_CACHE_KEY = getTestsClientCacheKey(1, 15, "newest", {
  selectedPeriod: "All",
  subject: "reading",
});
const SECTIONAL_MATH_CACHE_KEY = getTestsClientCacheKey(1, 15, "newest", {
  selectedPeriod: "All",
  subject: "math",
});

const preloadJobs = new Map<string, Promise<void>>();

type PreloadParams = {
  role: Role;
  userId: string;
};

function warmTestsPage(cacheKey: string, subject?: "reading" | "math") {
  const cachedPayload = getClientCache<CachedTestsPayload>(cacheKey);
  if (cachedPayload !== undefined) {
    return Promise.resolve();
  }

  return fetchTestsPage(1, 15, "newest", {
    selectedPeriod: "All",
    subject,
  }).then((payload) => {
    setClientCache(cacheKey, payload);
  });
}

function warmDashboardStats() {
  const cachedBundle = getCachedDashboardBundle();
  if (cachedBundle?.overview !== undefined) {
    return Promise.resolve();
  }

  return fetchDashboardOverview();
}

function warmDashboardLeaderboard() {
  const cachedBundle = getCachedDashboardBundle();
  if (cachedBundle?.leaderboard !== undefined) {
    return Promise.resolve();
  }

  return fetchLeaderboard();
}

function warmDashboardUserResults() {
  if (getCachedDashboardUserResults() !== undefined) {
    return Promise.resolve();
  }

  return fetchDashboardUserResults();
}

export async function preloadDashboardBundle() {
  const cachedBundle = getCachedDashboardBundle();
  if (cachedBundle) {
    return cachedBundle;
  }

  const [overview, leaderboard] = await Promise.all([
    fetchDashboardOverview(),
    fetchLeaderboard(),
  ]);

  const bundle = {
    overview,
    leaderboard,
  } satisfies DashboardBundle;

  setCachedDashboardBundle(bundle);
  return bundle;
}

export async function preloadDashboardUserResults() {
  const cachedResults = getCachedDashboardUserResults();
  if (cachedResults !== undefined) {
    return cachedResults;
  }

  const results = await fetchDashboardUserResults();
  setCachedDashboardUserResults(results);
  return results;
}

async function preloadStudentAppData() {
  await Promise.allSettled([
    warmDashboardStats(),
    warmDashboardLeaderboard(),
    warmDashboardUserResults(),
    warmTestsPage(FULL_LENGTH_CACHE_KEY),
    warmTestsPage(SECTIONAL_READING_CACHE_KEY, "reading"),
    warmTestsPage(SECTIONAL_MATH_CACHE_KEY, "math"),
  ]);
}

export function preloadInitialAppData({ role, userId }: PreloadParams) {
  const preloadKey = `${userId}:${role}`;
  const existingJob = preloadJobs.get(preloadKey);
  if (existingJob) {
    return existingJob;
  }

  const job = (async () => {
    await preloadStudentAppData();
  })();

  preloadJobs.set(preloadKey, job);
  return job;
}
