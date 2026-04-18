"use client";

import { useEffect, useRef, useState } from "react";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { fetchTestsPage, getTestsClientCacheKey } from "@/lib/services/testLibraryService";
import type {
  CachedTestsPayload,
  SortOption,
  TestListItem,
  UserResultSummary,
} from "@/types/testLibrary";

import { fetchDashboardUserResults } from "@/lib/services/dashboardService";

export function useFullLengthDashboardController() {
  const pageSize = 15;
  const initialTestsCacheRef = useRef<CachedTestsPayload | undefined>(undefined);
  const initialTestsCache = initialTestsCacheRef.current;

  const [hasHydratedClientCache, setHasHydratedClientCache] = useState(false);
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [uniquePeriods, setUniquePeriods] = useState<string[]>(["All"]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [testsRefreshing, setTestsRefreshing] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  const [totalPages, setTotalPages] = useState(1);
  const [userResults, setUserResults] = useState<UserResultSummary[]>([]);

  const hasCachedDashboardView = hasHydratedClientCache && Boolean(initialTestsCache);

  useEffect(() => {
    const testsCache = getClientCache<CachedTestsPayload>(
      getTestsClientCacheKey(1, pageSize, "newest", { selectedPeriod: "All" }),
    );

    initialTestsCacheRef.current = testsCache;

    if (testsCache) {
      setTests(testsCache.tests);
      setUniquePeriods(testsCache.availablePeriods);
      setTotalPages(testsCache.totalPages);
      setTestsLoading(false);
    }

    setHasHydratedClientCache(true);
  }, [pageSize]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    let cancelled = false;

    const loadTests = async () => {
      const filters = { selectedPeriod } as const;
      const cacheKey = getTestsClientCacheKey(page, pageSize, sortOption, filters);
      const cachedTests = getClientCache<CachedTestsPayload>(cacheKey);

      if (cachedTests) {
        setTests(cachedTests.tests);
        setUniquePeriods(cachedTests.availablePeriods);
        setTotalPages(cachedTests.totalPages);
        setTestsLoading(false);
        setTestsRefreshing(false);
        return;
      }

      setTestsLoading(true);
      setTestsRefreshing(false);

      try {
        const nextPayload = await fetchTestsPage(page, pageSize, sortOption, filters);

        if (cancelled) {
          return;
        }

        setTests(nextPayload.tests);
        setUniquePeriods(nextPayload.availablePeriods);
        setTotalPages(nextPayload.totalPages);
        setClientCache(cacheKey, nextPayload);
      } catch (error) {
        console.error("Failed to fetch tests", error);
      } finally {
        if (!cancelled) {
          setTestsLoading(false);
          setTestsRefreshing(false);
        }
      }
    };

    void loadTests();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, selectedPeriod, sortOption]);

  useEffect(() => {
    fetchDashboardUserResults(30).then((res) => {
      setUserResults(res);
    });
  }, []);

  return {
    hasCachedDashboardView,
    testsLoading,
    testsRefreshing,
    userResults,
    sortOption,
    page,
    totalPages,
    selectedPeriod,
    uniquePeriods,
    filteredTests: tests,
    setSortOption,
    setPage,
    setSelectedPeriod,
  };
}
