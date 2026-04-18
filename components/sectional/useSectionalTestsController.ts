"use client";

import { useEffect, useRef, useState } from "react";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { fetchTestsPage, getTestsClientCacheKey } from "@/lib/services/testLibraryService";
import type { CachedTestsPayload, SortOption, TestListItem, UserResultSummary } from "@/types/testLibrary";

import { fetchDashboardUserResults } from "@/lib/services/dashboardService";

export function useSectionalTestsController() {
  const pageSize = 15;
  const initialTestsCacheRef = useRef<CachedTestsPayload | undefined>(undefined);
  const [hasHydratedClientCache, setHasHydratedClientCache] = useState(false);
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [uniquePeriods, setUniquePeriods] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [testsRefreshing, setTestsRefreshing] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  const [moduleFilter, setModuleFilter] = useState<"reading" | "math">("reading");
  const [totalPages, setTotalPages] = useState(1);
  const [userResults, setUserResults] = useState<UserResultSummary[]>([]);

  const hasCachedSectionalView = hasHydratedClientCache && Boolean(initialTestsCacheRef.current);

  useEffect(() => {
    const cachedTests = getClientCache<CachedTestsPayload>(
      getTestsClientCacheKey(1, pageSize, "newest", {
        selectedPeriod: "All",
        subject: "reading",
      }),
    );
    initialTestsCacheRef.current = cachedTests;

    if (cachedTests) {
      setTests(cachedTests.tests);
      setUniquePeriods(cachedTests.availablePeriods);
      setTotalPages(cachedTests.totalPages);
      setLoading(false);
    }

    setHasHydratedClientCache(true);
  }, [pageSize]);

  useEffect(() => {
    setSelectedPeriod("All");
    setPage(1);
  }, [moduleFilter]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!hasHydratedClientCache) {
      return;
    }

    let cancelled = false;

    const loadTests = async () => {
      const filters = {
        selectedPeriod,
        subject: moduleFilter,
      } as const;
      const cacheKey = getTestsClientCacheKey(page, pageSize, sortOption, filters);
      const cachedTests = getClientCache<CachedTestsPayload>(cacheKey);

      if (cachedTests) {
        setTests(cachedTests.tests);
        setUniquePeriods(cachedTests.availablePeriods);
        setTotalPages(cachedTests.totalPages);
        setLoading(false);
        setTestsRefreshing(false);
        return;
      }

      setLoading(true);
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
          setLoading(false);
          setTestsRefreshing(false);
        }
      }
    };

    void loadTests();

    return () => {
      cancelled = true;
    };
  }, [hasHydratedClientCache, page, pageSize, selectedPeriod, sortOption, moduleFilter]);

  useEffect(() => {
    fetchDashboardUserResults(30).then((res) => {
      setUserResults(res);
    });
  }, []);

  return {
    hasCachedSectionalView,
    loading,
    testsRefreshing,
    userResults,
    sortOption,
    page,
    totalPages,
    selectedPeriod,
    moduleFilter,
    uniquePeriods,
    filteredTests: tests,
    setSortOption,
    setPage,
    setSelectedPeriod,
    setModuleFilter,
  };
}
