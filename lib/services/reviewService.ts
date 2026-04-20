import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { getDefaultReviewReasonCatalog } from "@/lib/reviewReasonCatalog";
import type { ReviewErrorLogPage, ReviewResult } from "@/types/review";
import type { ReviewReasonItem } from "@/types/reviewReason";

export async function fetchReviewResults() {
  const res = await api.get(API_PATHS.RESULTS);
  return (res.data.results || []) as ReviewResult[];
}

type FetchReviewErrorLogPageOptions = {
  testType: "full" | "sectional";
  status?: "all" | "wrong" | "omitted";
  query?: string;
  offset?: number;
  limit?: number;
};

export async function fetchReviewErrorLogPage({
  testType,
  status = "all",
  query = "",
  offset = 0,
  limit = 20,
}: FetchReviewErrorLogPageOptions) {
  const params = new URLSearchParams({
    testType,
    status,
    query,
    offset: String(offset),
    limit: String(limit),
  });

  const res = await api.get(`${API_PATHS.RESULT_ERROR_LOG}?${params.toString()}`);
  return res.data as ReviewErrorLogPage;
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

export async function fetchReviewReasonCatalog() {
  try {
    const res = await api.get(API_PATHS.USER_REVIEW_REASONS);
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
}

export async function saveReviewReasonCatalog(reasons: ReviewReasonItem[]) {
  const res = await api.put(API_PATHS.USER_REVIEW_REASONS, { reasons });
  return (res.data.reasons || []) as ReviewReasonItem[];
}
