import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { QuestionExtra } from "@/lib/questionExtra";
import { ResultValidationSchema } from "@/lib/schema/result";
import { isVerbalSection } from "@/lib/sections";
import type { ReviewAnswer, ReviewErrorLogEntry, ReviewErrorLogPage, ReviewErrorLogStatus, ReviewResult } from "@/types/review";
import type { UserResultSummary } from "@/types/testLibrary";

type ValidatedAnswer = {
  questionId: string;
  userAnswer?: string | null;
};

type QuestionRow = {
  id: string;
  question_type: "multiple_choice" | "spr";
  question_text: string;
  passage: string | null;
  explanation: string;
  points: number;
  difficulty: string | null;
  domain: string | null;
  skill: string | null;
  extra: QuestionExtra | null;
  test_sections: {
    test_id: string;
    name: string;
    module_number: number | null;
  } | null;
  question_options: Array<{
    id: string;
    option_text: string;
    display_order: number;
  }> | null;
  question_correct_options: {
    option_id: string;
  } | null;
  question_spr_accepted_answers: Array<{
    accepted_answer: string;
  }> | null;
};

type AttemptSectionRow = {
  name: string;
  module_number: number | null;
} | null;

function getAttemptSection(section: AttemptSectionRow | AttemptSectionRow[] | undefined) {
  return Array.isArray(section) ? section[0] ?? null : section ?? null;
}

function getQuestionSection(question: QuestionRow) {
  return question.test_sections;
}

async function fetchSectionId(testId: string, sectionName: string, moduleNumber: number) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("test_sections")
    .select("id")
    .eq("test_id", testId)
    .eq("name", sectionName)
    .eq("module_number", moduleNumber)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

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

function clampFullLengthSectionScore(score: number, hasSection: boolean) {
  if (!hasSection) {
    return 0;
  }

  return Math.max(200, Math.min(800, score));
}

function isAnswerOmitted(answer: { userAnswer?: string | null }) {
  return !answer.userAnswer || answer.userAnswer === "" || answer.userAnswer === "Omitted";
}

function getErrorLogOutcome(answer: { isCorrect: boolean; userAnswer?: string | null }) {
  if (isAnswerOmitted(answer)) {
    return "omitted" as const;
  }

  return answer.isCorrect ? ("correct" as const) : ("wrong" as const);
}

function toDifficultyLabel(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return "Unknown";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function matchesErrorLogQuery(row: ReviewErrorLogEntry, query: string) {
  if (!query) {
    return true;
  }

  return [row.questionId, row.testTitle, row.domain, row.skill, row.difficulty, row.reason || ""]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function buildDateFilter(days?: number) {
  if (!days || !Number.isFinite(days) || days <= 0 || days > 365) {
    return undefined;
  }

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  return dateLimit.toISOString();
}

function resolveSelectedOption(question: QuestionRow, userAnswer: string) {
  const options = [...(question.question_options ?? [])].sort((left, right) => left.display_order - right.display_order);
  const choiceIndex = getChoiceIndexFromCode(userAnswer);

  if (choiceIndex >= 0) {
    return options[choiceIndex] ?? null;
  }

  return options.find((option) => normalizeText(option.option_text) === normalizeText(userAnswer)) ?? null;
}

function isAnswerCorrect(question: QuestionRow, userAnswer: string) {
  if (!userAnswer || userAnswer === "Omitted") {
    return false;
  }

  if (question.question_type === "spr") {
    return (question.question_spr_accepted_answers ?? []).some(
      (accepted) => normalizeText(accepted.accepted_answer) === normalizeText(userAnswer)
    );
  }

  const selectedOption = resolveSelectedOption(question, userAnswer);
  return Boolean(selectedOption && selectedOption.id === question.question_correct_options?.option_id);
}

function toStoredAnswer(question: QuestionRow, userAnswer?: string | null) {
  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  if (normalizedUserAnswer === "Omitted") {
    return {
      selectedOptionId: null,
      textAnswer: null,
      userAnswer: normalizedUserAnswer,
    };
  }

  if (question.question_type === "spr") {
    return {
      selectedOptionId: null,
      textAnswer: normalizedUserAnswer,
      userAnswer: normalizedUserAnswer,
    };
  }

  const selectedOption = resolveSelectedOption(question, normalizedUserAnswer);
  if (!selectedOption) {
    throw new Error("Question mismatch detected");
  }

  return {
    selectedOptionId: selectedOption.id,
    textAnswer: null,
    userAnswer: `choice_${selectedOption.display_order - 1}`,
  };
}

async function fetchQuestionMap(questionIds: string[], testId?: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      `
        id,
        question_type,
        question_text,
        passage,
        explanation,
        points,
        difficulty,
        domain,
        skill,
        extra,
        test_sections!inner (
          test_id,
          name,
          module_number
        ),
        question_options (
          id,
          option_text,
          display_order
        ),
        question_correct_options (
          option_id
        ),
        question_spr_accepted_answers (
          accepted_answer
        )
      `
    )
    .in("id", questionIds);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as QuestionRow[];
  if (testId && rows.some((row) => getQuestionSection(row)?.test_id !== testId)) {
    throw new Error("One or more questions are invalid for this test");
  }

  return new Map(rows.map((question) => [question.id, question]));
}

async function fetchResultsView(userId: string, days?: number) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("test_attempts")
    .select("id,test_id,mode,section_id,score,total_score,reading_score,math_score,submitted_at,test_sections:section_id(name,module_number)")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  const dateFilter = buildDateFilter(days);
  if (dateFilter) {
    query = query.gte("submitted_at", dateFilter);
  }

  const { data: attempts, error: attemptsError } = await query;
  if (attemptsError) {
    throw new Error(attemptsError.message);
  }

  const attemptIds = (attempts ?? []).map((attempt) => attempt.id);
  if (attemptIds.length === 0) {
    return [] as ReviewResult[];
  }

  const [{ data: answers, error: answersError }, { data: tests, error: testsError }] = await Promise.all([
    supabase
      .from("attempt_answers")
      .select(
        `
          id,
          attempt_id,
          question_id,
          selected_option_id,
          text_answer,
          is_correct,
          attempt_answer_reasons (
            review_reason_id,
            user_review_reasons (
              label
            )
          )
        `
      )
      .in("attempt_id", attemptIds),
    supabase.from("tests").select("id,title").in("id", (attempts ?? []).map((attempt) => attempt.test_id)),
  ]);

  if (answersError || testsError) {
    throw new Error(answersError?.message ?? testsError?.message ?? "Failed to load review results");
  }

  const questionIds = Array.from(new Set((answers ?? []).map((answer) => answer.question_id)));
  const questionMap = await fetchQuestionMap(questionIds);
  const testMap = new Map((tests ?? []).map((test) => [test.id, test.title]));

  const answersByAttemptId = new Map<string, ReviewAnswer[]>();
  for (const answer of answers ?? []) {
    const question = questionMap.get(answer.question_id);
    if (!question) {
      continue;
    }

    const options = [...(question.question_options ?? [])].sort((left, right) => left.display_order - right.display_order);
    const selectedOption = options.find((option) => option.id === answer.selected_option_id) ?? null;
    const correctOption = options.find((option) => option.id === question.question_correct_options?.option_id) ?? null;
    const reasonRelation = Array.isArray(answer.attempt_answer_reasons) ? answer.attempt_answer_reasons[0] : answer.attempt_answer_reasons;
    const reasonValue = (reasonRelation as { user_review_reasons?: { label?: string } | Array<{ label?: string }> } | undefined)?.user_review_reasons;
    const reasonLabel = Array.isArray(reasonValue) ? reasonValue[0]?.label : reasonValue?.label;
    const section = getQuestionSection(question);

    const normalizedAnswer: ReviewAnswer = {
      questionId: {
        _id: question.id,
        section: section?.name,
        module: section?.module_number ?? undefined,
        domain: question.domain ?? undefined,
        skill: question.skill ?? undefined,
        difficulty: question.difficulty ?? undefined,
        questionType: question.question_type,
        questionText: question.question_text,
        correctAnswer: question.question_type === "multiple_choice" ? correctOption?.option_text : undefined,
        choices: options.map((option) => option.option_text),
        sprAnswers: (question.question_spr_accepted_answers ?? []).map((accepted) => accepted.accepted_answer),
        passage: question.passage ?? undefined,
        extra: question.extra ?? null,
      },
      userAnswer: selectedOption ? `choice_${selectedOption.display_order - 1}` : answer.text_answer ?? "Omitted",
      isCorrect: answer.is_correct,
      errorReason: reasonLabel ?? undefined,
    };

    const existing = answersByAttemptId.get(answer.attempt_id) ?? [];
    existing.push(normalizedAnswer);
    answersByAttemptId.set(answer.attempt_id, existing);
  }

  return (attempts ?? []).map((attempt) => {
    const section = getAttemptSection(attempt.test_sections as AttemptSectionRow | AttemptSectionRow[] | undefined);

    return ({
    _id: attempt.id,
    testId: {
      _id: attempt.test_id,
      title: testMap.get(attempt.test_id) ?? "Untitled Test",
    },
    createdAt: attempt.submitted_at,
    date: attempt.submitted_at,
    score: attempt.score ?? undefined,
    totalScore: attempt.total_score ?? undefined,
    readingScore: attempt.reading_score ?? undefined,
    mathScore: attempt.math_score ?? undefined,
    isSectional: attempt.mode === "sectional",
    sectionalSubject: section?.name ?? undefined,
    sectionalModule: section?.module_number ?? undefined,
    answers: answersByAttemptId.get(attempt.id) ?? [],
  } satisfies ReviewResult);
  });
}

async function fetchResultsSummaryView(userId: string, days?: number) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("test_attempts")
    .select("id,test_id,mode,section_id,score,total_score,reading_score,math_score,submitted_at,test_sections:section_id(name,module_number)")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  const dateFilter = buildDateFilter(days);
  if (dateFilter) {
    query = query.gte("submitted_at", dateFilter);
  }

  const { data: attempts, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (attempts ?? []).map((attempt) => {
    const section = getAttemptSection(attempt.test_sections as AttemptSectionRow | AttemptSectionRow[] | undefined);

    return {
      _id: attempt.id,
      testId: attempt.test_id,
      createdAt: attempt.submitted_at,
      date: attempt.submitted_at,
      score: attempt.score ?? undefined,
      totalScore: attempt.total_score ?? undefined,
      readingScore: attempt.reading_score ?? undefined,
      mathScore: attempt.math_score ?? undefined,
      isSectional: attempt.mode === "sectional",
      sectionalSubject: section?.name ?? undefined,
      sectionalModule: section?.module_number ?? undefined,
    } satisfies UserResultSummary;
  });
}

export const resultService = {
  async createResult(userId: string, data: unknown) {
    const validatedData = ResultValidationSchema.parse(data);
    const questionIds = validatedData.answers.map((answer) => answer.questionId);
    if (questionIds.length === 0) {
      throw new Error("Invalid answers payload");
    }

    const questionMap = await fetchQuestionMap(questionIds, validatedData.testId);
    if (questionMap.size !== questionIds.length) {
      throw new Error("One or more questions are invalid for this test");
    }

    const gradedAnswers = validatedData.answers.map((answer: ValidatedAnswer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new Error("Question mismatch detected");
      }

      const storedAnswer = toStoredAnswer(question, answer.userAnswer);
      return {
        question,
        questionId: question.id,
        userAnswer: storedAnswer.userAnswer,
        selectedOptionId: storedAnswer.selectedOptionId,
        textAnswer: storedAnswer.textAnswer,
        isCorrect: isAnswerCorrect(question, storedAnswer.userAnswer),
      };
    });

    const isSectional = Boolean(validatedData.isSectional);
    const correctCount = gradedAnswers.filter((answer) => answer.isCorrect).length;

    let score: number | undefined;
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
        const points = answer.question.points ?? 0;
        const section = getQuestionSection(answer.question);
        if (isVerbalSection(section?.name)) {
          hasReadingSection = true;
          if (!answer.isCorrect) {
            readingWrongPoints += points;
          }
        } else if (section?.name === "Math") {
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
    }

    const supabase = createSupabaseAdminClient();
    const sectionId = isSectional && validatedData.sectionalSubject && validatedData.sectionalModule
      ? await fetchSectionId(validatedData.testId, validatedData.sectionalSubject, validatedData.sectionalModule)
      : null;

    const { data: attempt, error: attemptError } = await supabase
      .from("test_attempts")
      .insert({
        user_id: userId,
        test_id: validatedData.testId,
        mode: isSectional ? "sectional" : "full",
        section_id: sectionId,
        score: score ?? null,
        total_score: totalScore ?? null,
        reading_score: readingScore ?? null,
        math_score: mathScore ?? null,
      })
      .select("id")
      .single();
    if (attemptError || !attempt) {
      throw new Error(attemptError?.message ?? "Failed to create result");
    }

    const { error: answersError } = await supabase.from("attempt_answers").insert(
      gradedAnswers.map((answer) => ({
        attempt_id: attempt.id,
        question_id: answer.questionId,
        selected_option_id: answer.selectedOptionId,
        text_answer: answer.textAnswer,
        is_correct: answer.isCorrect,
      }))
    );

    if (answersError) {
      throw new Error(answersError.message);
    }

    return {
      _id: attempt.id,
      testId: validatedData.testId,
      isSectional,
      score,
      totalScore,
      readingScore,
      mathScore,
    };
  },

  async getUserResults(userId: string, days?: number, options?: { summaryOnly?: boolean }) {
    return {
      results: options?.summaryOnly ? await fetchResultsSummaryView(userId, days) : await fetchResultsView(userId, days),
    };
  },

  async getUserErrorLogPage(
    userId: string,
    options: {
      testType?: "full" | "sectional";
      status?: "all" | ReviewErrorLogStatus;
      query?: string;
      offset?: number;
      limit?: number;
    } = {}
  ) {
    const testType = options.testType === "sectional" ? "sectional" : "full";
    const statusFilter = options.status === "wrong" || options.status === "omitted" ? options.status : "all";
    const normalizedQuery = options.query?.trim().toLowerCase() ?? "";
    const offset = Number.isFinite(options.offset) ? Math.max(0, options.offset ?? 0) : 0;
    const limit = Number.isFinite(options.limit) ? Math.min(Math.max(1, options.limit ?? 20), 50) : 20;

    const results = (await fetchResultsView(userId)).filter((result) => (testType === "sectional" ? result.isSectional : !result.isSectional));
    const collectedRows: ReviewErrorLogEntry[] = [];

    for (const result of results) {
      for (let index = 0; index < result.answers.length; index += 1) {
        const answer = result.answers[index];
        const questionId = answer.questionId?._id;
        if (!questionId) {
          continue;
        }

        const outcome = getErrorLogOutcome(answer);
        if (outcome === "correct") {
          continue;
        }

        if (statusFilter !== "all" && outcome !== statusFilter) {
          continue;
        }

        const row: ReviewErrorLogEntry = {
          key: `${result._id}-${questionId}-${index}`,
          resultId: result._id,
          questionId,
          questionNumber: index + 1,
          testId: typeof result.testId === "object" ? result.testId?._id : undefined,
          timestamp: result.date || result.createdAt,
          testTitle: typeof result.testId === "object" ? result.testId?.title || "Untitled Test" : "Untitled Test",
          domain: answer.questionId?.domain || answer.questionId?.subject || "Uncategorized",
          skill: answer.questionId?.skill || "General",
          difficulty: toDifficultyLabel(answer.questionId?.difficulty),
          reason: answer.errorReason,
          status: outcome,
          answer,
        };

        if (!matchesErrorLogQuery(row, normalizedQuery)) {
          continue;
        }

        collectedRows.push(row);
      }
    }

    const rows = collectedRows.slice(offset, offset + limit);
    return {
      rows,
      hasMore: collectedRows.length > offset + limit,
      nextOffset: offset + rows.length,
    } satisfies ReviewErrorLogPage;
  },

  async updateAnswerReason(userId: string, resultId: string, questionId: string, reason?: string) {
    const supabase = createSupabaseAdminClient();
    const { data: answer, error: answerError } = await supabase
      .from("attempt_answers")
      .select("id,attempt_id")
      .eq("attempt_id", resultId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (answerError || !answer) {
      throw new Error("Result answer not found");
    }

    const { data: attempt } = await supabase
      .from("test_attempts")
      .select("user_id")
      .eq("id", answer.attempt_id)
      .maybeSingle();

    if (!attempt || attempt.user_id !== userId) {
      throw new Error("Result answer not found");
    }

    const normalizedReason = reason?.trim();
    if (!normalizedReason) {
      await supabase.from("attempt_answer_reasons").delete().eq("attempt_answer_id", answer.id);
      return {
        resultId,
        questionId,
        reason: undefined,
      };
    }

    const { data: reviewReason } = await supabase
      .from("user_review_reasons")
      .select("id")
      .eq("user_id", userId)
      .eq("label", normalizedReason)
      .maybeSingle();

    if (!reviewReason) {
      throw new Error("Invalid result reason payload");
    }

    const { error } = await supabase.from("attempt_answer_reasons").upsert({
      attempt_answer_id: answer.id,
      review_reason_id: reviewReason.id,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      resultId,
      questionId,
      reason: normalizedReason,
    };
  },
};
