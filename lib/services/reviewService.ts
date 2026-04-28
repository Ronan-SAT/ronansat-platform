import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { readThroughClientCache, setClientCache } from "@/lib/clientCache";
import { getDefaultReviewReasonCatalog } from "@/lib/reviewReasonCatalog";
import type { ReviewAnswer, ReviewErrorLogPage, ReviewResult } from "@/types/review";
import type { ReviewReasonItem } from "@/types/reviewReason";

type FetchOptions = {
  forceRefresh?: boolean;
  ttlMs?: number;
  persistForSession?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
};

type FetchReviewErrorLogPageOptions = {
  testType: "full" | "sectional";
  status?: "all" | "wrong" | "omitted";
  query?: string;
  offset?: number;
  limit?: number;
};

export const REVIEW_CACHE_KEYS = {
  results: "review:results",
  result: (resultId: string) => `review:result:${resultId}`,
  question: (resultId: string, questionId: string) => `review:question:${resultId}:${questionId}`,
  errorLog: ({
    testType,
    status = "all",
    query = "",
    offset = 0,
    limit = 20,
  }: FetchReviewErrorLogPageOptions) => `review:error-log:${testType}:${status}:${query}:${offset}:${limit}`,
  reasonCatalog: "review:reason-catalog",
} as const;

export const REVIEW_RESULTS_CACHE_KEY = REVIEW_CACHE_KEYS.results;

function withSessionCache(options?: FetchOptions): FetchOptions {
  return {
    ...options,
    persistForSession: options?.persistForSession ?? true,
  };
}

export async function fetchReviewResults(options?: FetchOptions) {
  return readThroughClientCache(
    REVIEW_CACHE_KEYS.results,
    async () => {
      const res = await api.get(`${API_PATHS.RESULTS}?summary=1`, { signal: options?.signal });
      return (res.data.results || []) as ReviewResult[];
    },
    withSessionCache(options),
  );
}

export async function fetchReviewResult(resultId: string, options?: FetchOptions) {
  return readThroughClientCache(
    REVIEW_CACHE_KEYS.result(resultId),
    async () => {
      const res = await api.get(API_PATHS.getReviewResult(resultId), { signal: options?.signal });
      return res.data.result as ReviewResult;
    },
    withSessionCache(options),
  );
}

export async function fetchReviewQuestion(resultId: string, questionId: string, options?: FetchOptions) {
  return readThroughClientCache(
    REVIEW_CACHE_KEYS.question(resultId, questionId),
    async () => {
      const res = await api.get(API_PATHS.getReviewQuestion(resultId, questionId), { signal: options?.signal });
      return res.data.answer as ReviewAnswer;
    },
    withSessionCache(options),
  );
}

export async function fetchReviewErrorLogPage({
  testType,
  status = "all",
  query = "",
  offset = 0,
  limit = 20,
}: FetchReviewErrorLogPageOptions) {
  const options = { testType, status, query, offset, limit };
  return readThroughClientCache(
    REVIEW_CACHE_KEYS.errorLog(options),
    async () => {
      const params = new URLSearchParams({
        testType,
        status,
        query,
        offset: String(offset),
        limit: String(limit),
      });

      const res = await api.get(`${API_PATHS.RESULT_ERROR_LOG}?${params.toString()}`);
      return res.data as ReviewErrorLogPage;
    },
    { persistForSession: true },
  );
}

export async function updateReviewAnswerReason(resultId: string, questionId: string, reason?: string) {
  const res = await api.patch(API_PATHS.RESULT_REASON, {
    resultId,
    questionId,
    reason,
  });

  return res.data as {
    resultId: string;
    questionId: string;
    reason?: string;
  };
}

export async function fetchQuestionExplanation(questionId: string) {
  const res = await api.get(API_PATHS.getQuestionExplanation(questionId));
  return (res.data.explanation || "") as string;
}

export async function fetchReviewReasonCatalog(options?: FetchOptions) {
  return readThroughClientCache(
    REVIEW_CACHE_KEYS.reasonCatalog,
    async () => {
      try {
        const res = await api.get(API_PATHS.USER_REVIEW_REASONS, { signal: options?.signal });
        return (res.data.reasons || []) as ReviewReasonItem[];
      } catch (error) {
        if (typeof error === "object" && error !== null && "response" in error) {
          const response = (error as { response?: { status?: number } }).response;
          if (response?.status === 401) {
            return getDefaultReviewReasonCatalog();
          }
        }

        if (error instanceof Error && error.message.includes("401")) {
          return getDefaultReviewReasonCatalog();
        }

        throw error;
      }
    },
    withSessionCache(options),
  );
}

export async function saveReviewReasonCatalog(reasons: ReviewReasonItem[]) {
  const res = await api.put(API_PATHS.USER_REVIEW_REASONS, { reasons });
  const savedReasons = (res.data.reasons || []) as ReviewReasonItem[];
  setClientCache(REVIEW_CACHE_KEYS.reasonCatalog, savedReasons, { persistForSession: true });
  return savedReasons;
}
