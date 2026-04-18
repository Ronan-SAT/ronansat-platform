import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { readThroughClientCache } from "@/lib/clientCache";
import { normalizeQuestionExtra, type QuestionExtra } from "@/lib/questionExtra";
import { normalizeSectionName } from "@/lib/sections";

const QUESTION_CACHE_TTL_MS = 5 * 60 * 1000;
const QUESTION_CACHE_VERSION = "v2";

export type TestQuestionPayload = {
  _id: string;
  section: string;
  module: number;
  points?: number;
  correctAnswer?: string;
  questionType?: string;
  sprAnswers?: string[];
  questionText?: string;
  passage?: string;
  imageUrl?: string;
  choices?: string[];
  extra?: QuestionExtra | null;
};

export async function fetchQuestionsByTestId(testId: string, options?: { forceRefresh?: boolean }) {
  return readThroughClientCache(
    `api:questions:${QUESTION_CACHE_VERSION}:${testId}`,
    async () => {
      const res = await api.get(API_PATHS.getQuestionsByTestId(testId));
      return ((res.data.questions || []) as TestQuestionPayload[]).map((question) => ({
        ...question,
        section: normalizeSectionName(question.section),
        extra: normalizeQuestionExtra(question.extra),
      }));
    },
    {
      forceRefresh: options?.forceRefresh,
      ttlMs: QUESTION_CACHE_TTL_MS,
    },
  );
}
