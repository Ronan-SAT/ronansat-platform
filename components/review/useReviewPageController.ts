"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getClientCache, setClientCache } from "@/lib/clientCache";
import { fetchQuestionExplanation } from "@/lib/services/reviewService";
import type { ReviewAnswer, ReviewResult } from "@/types/review";
import { filterReviewResultsByType } from "@/components/review/reviewPage.utils";

import { fetchDashboardUserResults } from "@/lib/services/dashboardService";

const REVIEW_RESULTS_CACHE_KEY = "review:results";

export function useReviewPageController() {
  const searchParams = useSearchParams();
  const urlMode = searchParams.get("mode");
  const urlTestId = searchParams.get("testId");
  const urlResultId = searchParams.get("resultId");
  const initialResultsCacheRef = useRef<ReviewResult[]>([]);
  const cachedResults = typeof window !== "undefined" ? getClientCache<ReviewResult[]>(REVIEW_RESULTS_CACHE_KEY) : undefined;
  const [results, setResults] = useState<ReviewResult[]>(cachedResults ?? []);
  const [loading, setLoading] = useState(!cachedResults);
  const [refreshing, setRefreshing] = useState(false);
  const [testType, setTestType] = useState<"full" | "sectional">(urlMode === "sectional" ? "sectional" : "full");
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [isManuallySelected, setIsManuallySelected] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<{
    answer: ReviewAnswer;
    questionNumber: number;
    testId?: string;
  } | null>(null);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDashboardUserResults(undefined, { view: "detail" }).then((fetchedResults) => {
      const nextResults = fetchedResults as unknown as ReviewResult[];
      initialResultsCacheRef.current = nextResults;
      setResults(nextResults);
      setLoading(false);

      if (nextResults.length > 0) {
        setClientCache(REVIEW_RESULTS_CACHE_KEY, nextResults);
      }
    });
  }, []);

  const filteredResults = useMemo(() => filterReviewResultsByType(results, testType), [results, testType]);

  useEffect(() => {
    if (results.length === 0) {
      setActiveTestId(null);
      return;
    }

    const isValidActiveTest = activeTestId ? filteredResults.some((result) => result._id === activeTestId) : false;

    if (isManuallySelected && isValidActiveTest) {
      return;
    }

    if (urlResultId && !isManuallySelected) {
      const matchForResult = filteredResults.find((result) => result._id === urlResultId);
      if (matchForResult) {
        if (activeTestId !== matchForResult._id) {
          setActiveTestId(matchForResult._id);
        }
        return;
      }
    }

    if (urlTestId && !isManuallySelected) {
      const matchForUrl = filteredResults.find((result) => {
        const tId = typeof result.testId === "object" ? result.testId?._id : result.testId;
        return tId === urlTestId;
      });
      if (matchForUrl) {
        if (activeTestId !== matchForUrl._id) {
          setActiveTestId(matchForUrl._id);
        }
        return;
      }
    }

    if (!isValidActiveTest && filteredResults.length > 0) {
      setActiveTestId(filteredResults[0]._id);
    } else if (filteredResults.length === 0) {
      setActiveTestId(null);
    }
  }, [activeTestId, filteredResults, results.length, urlResultId, urlTestId, isManuallySelected]);

  const activeTest = useMemo(
    () => filteredResults.find((result) => result._id === activeTestId) || filteredResults[0],
    [activeTestId, filteredResults],
  );

  const handleExpandExplanation = async (questionId: string) => {
    if (expandedExplanations[questionId]) {
      return;
    }

    setLoadingExplanations((previous) => ({ ...previous, [questionId]: true }));
    try {
      const explanation = await fetchQuestionExplanation(questionId);
      if (explanation) {
        setExpandedExplanations((previous) => ({ ...previous, [questionId]: explanation }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingExplanations((previous) => ({ ...previous, [questionId]: false }));
    }
  };

  return {
    results,
    loading,
    refreshing,
    testType,
    activeTestId,
    selectedAnswer,
    expandedExplanations,
    loadingExplanations,
    filteredResults,
    activeTest,
    setResults,
    setLoading,
    setRefreshing,
    setTestType,
    setActiveTestId: (id: string | null) => {
      setIsManuallySelected(true);
      setActiveTestId(id);
    },
    setSelectedAnswer,
    handleExpandExplanation,
  };
}
