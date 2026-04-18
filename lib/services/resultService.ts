import mongoose from "mongoose";

import dbConnect from "@/lib/mongodb";
import Question from "@/lib/models/Question";
import Result from "@/lib/models/Result";
import { isVerbalSection } from "@/lib/sections";
import Test from "@/lib/models/Test";
import User from "@/lib/models/User";
import { clearLeaderboardCache } from "@/lib/services/leaderboardService";
import { ResultValidationSchema } from "@/lib/schema/result";
import type { QuestionExtra } from "@/lib/questionExtra";
import type { ReviewAnswer, ReviewQuestion, ReviewResult } from "@/types/review";
import type { UserResultSummary } from "@/types/testLibrary";

type ValidatedAnswer = {
  questionId: string;
  userAnswer?: string | null;
};

type ResultView = "summary" | "detail";

type GetUserResultsOptions = {
  days?: number;
  view?: ResultView;
};

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getChoiceIndexFromCode(value?: string | null) {
  const match = value?.match(/^choice_(\d+)$/i);
  return match ? Number(match[1]) : -1;
}

function normalizeAnswer(value?: string | null) {
  return value?.trim() || "Omitted";
}

function isAnswerCorrect(
  question: {
    questionType?: string;
    correctAnswer?: string;
    choices?: string[];
    sprAnswers?: string[];
  },
  userAnswer: string
) {
  if (!userAnswer || userAnswer === "Omitted") {
    return false;
  }

  if (question.questionType === "spr") {
    return (
      question.sprAnswers?.some((accepted) => accepted.trim().toLowerCase() === userAnswer.trim().toLowerCase()) ??
      false
    );
  }

  const correctAnswer = question.correctAnswer ?? "";
  const choices = Array.isArray(question.choices) ? question.choices : [];
  const userChoiceIndex = getChoiceIndexFromCode(userAnswer);
  const correctChoiceIndex = getChoiceIndexFromCode(correctAnswer);

  if (userChoiceIndex >= 0 && correctChoiceIndex >= 0) {
    return userChoiceIndex === correctChoiceIndex;
  }

  if (userChoiceIndex >= 0 && correctChoiceIndex < 0) {
    return normalizeText(choices[userChoiceIndex]) === normalizeText(correctAnswer);
  }

  if (userChoiceIndex < 0 && correctChoiceIndex >= 0) {
    return normalizeText(userAnswer) === normalizeText(choices[correctChoiceIndex]);
  }

  return normalizeText(userAnswer) === normalizeText(correctAnswer);
}

function buildDateFilter(days?: number) {
  if (!days || !Number.isFinite(days) || days <= 0 || days > 365) {
    return undefined;
  }

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  return { $gte: dateLimit };
}

function clampFullLengthSectionScore(score: number, hasSection: boolean) {
  if (!hasSection) {
    return 0;
  }

  return Math.max(200, Math.min(800, score));
}

function toSerializedId(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === "object" && value !== null && "_id" in value) {
    const nestedId = (value as { _id?: unknown })._id;
    return toSerializedId(nestedId);
  }

  return undefined;
}

function toSerializedDate(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

function normalizeTestReference(testId: unknown) {
  if (!testId) {
    return null;
  }

  if (typeof testId === "string" || testId instanceof mongoose.Types.ObjectId) {
    return toSerializedId(testId) ?? null;
  }

  if (typeof testId === "object") {
    return {
      _id: toSerializedId(testId),
      title: "title" in testId && typeof testId.title === "string" ? testId.title : undefined,
    };
  }

  return null;
}

function normalizeSummaryResult(result: Record<string, unknown>): UserResultSummary {
  return {
    _id: toSerializedId(result._id),
    testId: normalizeTestReference(result.testId),
    sectionalSubject: typeof result.sectionalSubject === "string" ? result.sectionalSubject : undefined,
    sectionalModule: typeof result.sectionalModule === "number" ? result.sectionalModule : undefined,
    answers: Array.isArray(result.answers)
      ? result.answers.map((answer) => ({
          isCorrect: Boolean((answer as { isCorrect?: unknown }).isCorrect),
        }))
      : undefined,
    score: typeof result.score === "number" ? result.score : undefined,
    isSectional: Boolean(result.isSectional),
    totalScore: typeof result.totalScore === "number" ? result.totalScore : undefined,
    readingScore: typeof result.readingScore === "number" ? result.readingScore : undefined,
    mathScore: typeof result.mathScore === "number" ? result.mathScore : undefined,
    createdAt: toSerializedDate(result.createdAt),
    date: toSerializedDate(result.date),
    updatedAt: toSerializedDate(result.updatedAt),
  };
}

function normalizeReviewQuestion(question: unknown): ReviewQuestion | null | undefined {
  if (question === null) {
    return null;
  }

  if (!question || typeof question !== "object") {
    return undefined;
  }

  const source = question as Record<string, unknown>;

  return {
    _id: toSerializedId(question) ?? "",
    section: typeof source.section === "string" ? source.section : undefined,
    module: typeof source.module === "number" ? source.module : undefined,
    domain: typeof source.domain === "string" ? source.domain : undefined,
    skill: typeof source.skill === "string" ? source.skill : undefined,
    questionType:
      source.questionType === "multiple_choice" || source.questionType === "spr"
        ? source.questionType
        : undefined,
    questionText: typeof source.questionText === "string" ? source.questionText : undefined,
    correctAnswer: typeof source.correctAnswer === "string" ? source.correctAnswer : undefined,
    choices: Array.isArray(source.choices) ? source.choices.filter((choice): choice is string => typeof choice === "string") : undefined,
    sprAnswers: Array.isArray(source.sprAnswers)
      ? source.sprAnswers.filter((answer): answer is string => typeof answer === "string")
      : undefined,
    passage: typeof source.passage === "string" ? source.passage : undefined,
    imageUrl: typeof source.imageUrl === "string" ? source.imageUrl : undefined,
    extra: "extra" in source ? (source.extra as QuestionExtra) : undefined,
  };
}

function normalizeReviewAnswer(answer: unknown): ReviewAnswer {
  if (!answer || typeof answer !== "object") {
    return {
      isCorrect: false,
    };
  }

  const source = answer as Record<string, unknown>;

  return {
    questionId: normalizeReviewQuestion(source.questionId),
    userAnswer: typeof source.userAnswer === "string" ? source.userAnswer : undefined,
    isCorrect: Boolean(source.isCorrect),
  };
}

function normalizeDetailResult(result: Record<string, unknown>): ReviewResult {
  const testReference = normalizeTestReference(result.testId);

  return {
    _id: toSerializedId(result._id) ?? "",
    testId: testReference && typeof testReference === "object" ? testReference : null,
    date: toSerializedDate(result.date),
    createdAt: toSerializedDate(result.createdAt),
    score: typeof result.score === "number" ? result.score : undefined,
    totalScore: typeof result.totalScore === "number" ? result.totalScore : undefined,
    readingScore: typeof result.readingScore === "number" ? result.readingScore : undefined,
    mathScore: typeof result.mathScore === "number" ? result.mathScore : undefined,
    isSectional: Boolean(result.isSectional),
    sectionalSubject: typeof result.sectionalSubject === "string" ? result.sectionalSubject : undefined,
    sectionalModule: typeof result.sectionalModule === "number" ? result.sectionalModule : undefined,
    answers: Array.isArray(result.answers) ? result.answers.map(normalizeReviewAnswer) : [],
  };
}

export const resultService = {
  async createResult(userId: string, data: unknown) {
    const validatedData = ResultValidationSchema.parse(data);

    if (!mongoose.Types.ObjectId.isValid(validatedData.testId)) {
      throw new Error("Invalid test ID");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const testObjectId = new mongoose.Types.ObjectId(validatedData.testId);

    await dbConnect();

    const [test, userExists] = await Promise.all([
      Test.findById(validatedData.testId).lean(),
      User.exists({ _id: userObjectId }),
    ]);

    if (!test) {
      throw new Error("Test not found");
    }

    if (!userExists) {
      throw new Error("User not found");
    }

    const answerIds = validatedData.answers.map((answer) => answer.questionId);
    if (answerIds.length === 0 || answerIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      throw new Error("Invalid answers payload");
    }

    const questions = await Question.find({
      _id: { $in: answerIds },
      testId: validatedData.testId,
    }).lean();

    if (questions.length !== answerIds.length) {
      throw new Error("One or more questions are invalid for this test");
    }

    const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));

    const gradedAnswers = validatedData.answers.map((answer: ValidatedAnswer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new Error("Question mismatch detected");
      }

      const normalizedUserAnswer = normalizeAnswer(answer.userAnswer);
      const isCorrect = isAnswerCorrect(question, normalizedUserAnswer);

      return {
        questionId: question._id,
        userAnswer: normalizedUserAnswer,
        isCorrect,
      };
    });

    const isSectional = Boolean(validatedData.isSectional);
    const correctCount = gradedAnswers.filter((answer) => answer.isCorrect).length;

    let score: number | undefined;
    let sectionBreakdown: { readingAndWriting?: number; math?: number } | undefined;
    let totalScore: number | undefined;
    let readingScore: number | undefined;
    let mathScore: number | undefined;

    if (isSectional) {
      totalScore = correctCount;
      readingScore = isVerbalSection(validatedData.sectionalSubject) ? correctCount : 0;
      mathScore = validatedData.sectionalSubject === "Math" ? correctCount : 0;
    } else {
      let readingWrongPoints = 0;
      let mathWrongPoints = 0;
      let hasReadingSection = false;
      let hasMathSection = false;

      gradedAnswers.forEach((answer) => {
        const question = questionMap.get(answer.questionId.toString());
        const points = question?.points ?? 0;

        if (isVerbalSection(question?.section)) {
          hasReadingSection = true;
          if (!answer.isCorrect) {
            readingWrongPoints += points;
          }
        } else if (question?.section === "Math") {
          hasMathSection = true;
          if (!answer.isCorrect) {
            mathWrongPoints += points;
          }
        }
      });

      readingScore = clampFullLengthSectionScore(800 - readingWrongPoints, hasReadingSection);
      mathScore = clampFullLengthSectionScore(800 - mathWrongPoints, hasMathSection);
      score = readingScore + mathScore;
      totalScore = score;
      sectionBreakdown = {
        readingAndWriting: readingScore,
        math: mathScore,
      };
    }

    const newResult = await Result.create({
      userId: userObjectId,
      testId: testObjectId,
      isSectional,
      sectionalSubject: validatedData.sectionalSubject,
      sectionalModule: validatedData.sectionalModule,
      answers: gradedAnswers,
      score,
      sectionBreakdown,
      totalScore,
      readingScore,
      mathScore,
    });

    const wrongIds = gradedAnswers.filter((answer) => !answer.isCorrect).map((answer) => answer.questionId);
    const userUpdate: {
      $set: { lastTestDate: Date };
      $push: { testsTaken: mongoose.Types.ObjectId };
      $addToSet?: { wrongQuestions: { $each: mongoose.Types.ObjectId[] } };
      $max?: { highestScore: number };
    } = {
      $set: { lastTestDate: new Date() },
      $push: { testsTaken: testObjectId },
    };

    if (!isSectional && typeof score === "number") {
      userUpdate.$max = { highestScore: score };
    }

    if (wrongIds.length > 0) {
      userUpdate.$addToSet = {
        wrongQuestions: {
          $each: wrongIds,
        },
      };
    }

    try {
      await User.updateOne({ _id: userObjectId }, userUpdate);
    } catch (userUpdateError) {
      console.error("User stats update failed after result creation", userUpdateError);
    }

    clearLeaderboardCache();

    return newResult;
  },

  async getUserResults(userId: string, options: GetUserResultsOptions = {}) {
    await dbConnect();

    const query: {
      userId: string;
      createdAt?: { $gte: Date };
    } = { userId };

    const createdAtFilter = buildDateFilter(options.days);
    if (createdAtFilter) {
      query.createdAt = createdAtFilter;
    }

    const resultQuery = Result.find(query).sort({ createdAt: -1 }).populate("testId", "title");

    if (options.view === "summary") {
      const results = await resultQuery
        .select(
          "_id testId isSectional sectionalSubject sectionalModule answers.isCorrect score totalScore readingScore mathScore createdAt date updatedAt",
        )
        .lean();

      return { results: ((results as unknown) as Record<string, unknown>[]).map(normalizeSummaryResult) };
    }

    const results = await resultQuery
      .populate({
        path: "answers.questionId",
        model: "Question",
        select: "questionText correctAnswer _id imageUrl choices passage domain skill questionType sprAnswers section module extra",
      })
      .lean();

    return { results: ((results as unknown) as Record<string, unknown>[]).map(normalizeDetailResult) };
  },
};
