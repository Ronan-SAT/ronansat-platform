import type { UserResultSummary } from "@/types/testLibrary";

export function getDisplayScore(result: UserResultSummary) {
  if (result.isSectional) {
    return result.score || result.totalScore || 0;
  }

  return Math.max(400, result.totalScore || result.score || 0);
}

export function getResultDateValue(result: UserResultSummary) {
  return result.createdAt || result.updatedAt || result.date || null;
}

export function getResultTimestamp(result: UserResultSummary) {
  const rawDate = getResultDateValue(result);
  return rawDate ? new Date(rawDate).getTime() : 0;
}
