import { getClientCache, setClientCache } from "@/lib/clientCache";
import {
  getCachedDashboardOverview,
  getCachedDashboardUserResults,
  setCachedDashboardOverview,
  setCachedDashboardUserResults,
} from "@/lib/dashboardCache";
import type { Role } from "@/lib/permissions";
import { fetchDashboardOverview, fetchDashboardUserResults } from "@/lib/services/dashboardService";
import { fetchReviewResults } from "@/lib/services/reviewService";
import { fetchTestsPage, getTestsClientCacheKey } from "@/lib/services/testLibraryService";
import type { ReviewResult } from "@/types/review";
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
const REVIEW_RESULTS_CACHE_KEY = "review:results";

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
  if (getCachedDashboardOverview() !== undefined) {
    return Promise.resolve();
  }

  return fetchDashboardOverview();
}

function warmDashboardUserResults() {
  if (getCachedDashboardUserResults() !== undefined) {
    return Promise.resolve();
  }

  return fetchDashboardUserResults();
}

function warmReviewResults() {
  if (getClientCache<ReviewResult[]>(REVIEW_RESULTS_CACHE_KEY) !== undefined) {
    return Promise.resolve();
  }

  return fetchReviewResults().then((results) => {
    setClientCache(REVIEW_RESULTS_CACHE_KEY, results);
  });
}

export async function preloadDashboardOverview() {
  const cachedOverview = getCachedDashboardOverview();
  if (cachedOverview !== undefined) {
    return cachedOverview;
  }

  const overview = await fetchDashboardOverview();
  setCachedDashboardOverview(overview);
  return overview;
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
    warmDashboardUserResults(),
    warmTestsPage(FULL_LENGTH_CACHE_KEY),
    warmTestsPage(SECTIONAL_READING_CACHE_KEY, "reading"),
    warmTestsPage(SECTIONAL_MATH_CACHE_KEY, "math"),
    warmReviewResults(),
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
