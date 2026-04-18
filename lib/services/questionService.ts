import { z } from "zod";

import dbConnect from "@/lib/mongodb";
import Question from "@/lib/models/Question";
import Test from "@/lib/models/Test";
import { QuestionValidationSchema } from "@/lib/schema/question";
import { clearTestLibraryCache } from "@/lib/services/testService";

type CachedValue<T> = {
  value: T;
  expiresAt: number;
};

const QUESTION_CACHE_TTL_MS = 5 * 60 * 1000;
const QUESTION_CACHE_VERSION = "v2";
const QUESTION_TEST_PROJECTION =
  "_id section module points correctAnswer questionType sprAnswers questionText passage imageUrl choices extra";
const questionCache = new Map<string, CachedValue<unknown>>();

function getQuestionCacheKey(testId: string) {
  return `${QUESTION_CACHE_VERSION}:${testId}`;
}

export function clearQuestionCache(testId?: string) {
  if (!testId) {
    questionCache.clear();
    return;
  }

  questionCache.delete(getQuestionCacheKey(testId));
}

export const questionService = {
  async getQuestions(testId?: string | null) {
    await dbConnect();

    if (!testId) {
      return Question.find({}).lean();
    }

    const cacheKey = getQuestionCacheKey(testId);
    const cached = questionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const questions = await Question.find({ testId })
      .select(QUESTION_TEST_PROJECTION)
      .lean();

    questionCache.set(cacheKey, {
      value: questions,
      expiresAt: Date.now() + QUESTION_CACHE_TTL_MS,
    });

    return questions;
  },

  async createQuestion(data: unknown) {
    try {
      const validatedData = QuestionValidationSchema.parse(data);
      await dbConnect();

      const test = await Test.findById(validatedData.testId);
      if (!test) {
        throw new Error("Test not found");
      }

      const newQuestion = await Question.create(validatedData);

      if (!test.questions) {
        test.questions = [];
      }

      test.questions.push(newQuestion._id as (typeof test.questions)[number]);
      await test.save();

      clearQuestionCache(validatedData.testId);
      clearTestLibraryCache();

      return newQuestion;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const validationError = new Error("Validation Error") as Error & {
          errors: z.ZodIssue[];
          name: string;
        };
        validationError.errors = error.issues;
        validationError.name = "ZodError";
        throw validationError;
      }

      throw error;
    }
  },
};
