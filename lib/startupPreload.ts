"use client";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { fetchDashboardUserResults, fetchDashboardUserStats, fetchLeaderboard } from "@/lib/services/dashboardService";
import { fetchReviewResults } from "@/lib/services/reviewService";
import { fetchTestsPage, getTestsClientCacheKey } from "@/lib/services/testLibraryService";
import type { Role } from "@/lib/permissions";
import type { CachedTestsPayload } from "@/types/testLibrary";

const preloadJobs = new Map<string, Promise<void>>();
const PARENT_DASHBOARD_CACHE_KEY = "parent:dashboard";

type PreloadParams = {
  role: Role;
  userId: string;
};

function getWarmTestsPayloadCacheKey(subject?: "reading" | "math") {
  return getTestsClientCacheKey(1, 15, "newest", {
    selectedPeriod: "All",
    subject,
  });
}

async function warmTestsPage(subject?: "reading" | "math") {
  const cacheKey = getWarmTestsPayloadCacheKey(subject);
  const cachedPayload = getClientCache<CachedTestsPayload>(cacheKey);
  if (cachedPayload !== undefined) {
    return;
  }

  const payload = await fetchTestsPage(1, 15, "newest", {
    selectedPeriod: "All",
    subject,
  });
  setClientCache(cacheKey, payload);
}

async function warmParentDashboard() {
  if (getClientCache(PARENT_DASHBOARD_CACHE_KEY) !== undefined) {
    return;
  }

  const response = await fetch("/api/parent/dashboard", {
    method: "GET",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Failed to preload parent dashboard: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  setClientCache(PARENT_DASHBOARD_CACHE_KEY, payload);
}

async function preloadStudentAppData() {
  await Promise.allSettled([
    fetchDashboardUserStats(),
    fetchDashboardUserResults(30),
    fetchDashboardUserResults(),
    fetchLeaderboard(),
    warmTestsPage(),
    warmTestsPage("reading"),
    warmTestsPage("math"),
    fetchReviewResults(),
  ]);
}

async function preloadParentAppData() {
  await Promise.allSettled([warmParentDashboard(), fetchLeaderboard()]);
}

export function preloadInitialAppData({ role, userId }: PreloadParams) {
  const preloadKey = `${userId}:${role}`;
  const existingJob = preloadJobs.get(preloadKey);
  if (existingJob) {
    return existingJob;
  }

  const nextJob = (async () => {
    if (role === "PARENT") {
      await preloadParentAppData();
      return;
    }

    await preloadStudentAppData();
  })().finally(() => {
    preloadJobs.delete(preloadKey);
  });

  preloadJobs.set(preloadKey, nextJob);
  return nextJob;
}
