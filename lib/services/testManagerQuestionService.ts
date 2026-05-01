import { z } from "zod";

import type { AppSession } from "@/lib/auth/session";
import { QuestionValidationSchema } from "@/lib/schema/question";
import { normalizeSectionName } from "@/lib/sections";
import { getReportedQuestionCard } from "@/lib/services/testManagerReportService";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type TestManagerCard } from "@/lib/testManagerReports";

const PUBLIC_EXAM_EDIT_PERMISSION = "edit_public_exams";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type QuestionRow = {
  id: string;
  legacy_mongo_id: string | null;
  section_id: string;
  question_type: "multiple_choice" | "spr";
  question_text: string;
  passage: string | null;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  domain: string | null;
  skill: string | null;
  image_url: string | null;
  extra: unknown;
  position: number;
  question_options:
    | Array<{
        id: string;
        option_text: string;
        display_order: number;
      }>
    | null;
  question_correct_options:
    | {
        option_id: string;
      }
    | null;
  question_spr_accepted_answers:
    | Array<{
        accepted_answer: string;
        display_order: number;
      }>
    | null;
  test_sections:
    | {
        id: string;
        test_id: string;
        name: string;
        module_number: number | null;
      }
    | null;
};

type TestRow = {
  id: string;
  legacy_mongo_id: string | null;
  title: string;
  visibility: "public" | "private";
  status: string;
};

type EditableQuestionPayload = z.infer<typeof QuestionValidationSchema>;

export type ReportedQuestionEditorData = {
  card: TestManagerCard;
  question: EditableQuestionPayload & {
    questionId: string;
    testTitle: string;
    visibility: "public" | "private";
    status: string;
  };
};

class TestManagerQuestionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function requirePublicExamEditor(session: AppSession) {
  if (session.user.permissions.includes(PUBLIC_EXAM_EDIT_PERMISSION)) {
    return;
  }

  throw new TestManagerQuestionError(403, "You do not have permission to edit public exams.");
}

async function getQuestionRow(questionId: string) {
  const supabase = createSupabaseAdminClient();
  const query = supabase
    .from("questions")
    .select(
      `
        id,
        legacy_mongo_id,
        section_id,
        question_type,
        question_text,
        passage,
        explanation,
        difficulty,
        points,
        domain,
        skill,
        image_url,
        extra,
        position,
        question_options (
          id,
          option_text,
          display_order
        ),
        question_correct_options (
          option_id
        ),
        question_spr_accepted_answers (
          accepted_answer,
          display_order
        ),
        test_sections!inner (
          id,
          test_id,
          name,
          module_number
        )
      `,
    );
  const { data, error } = await (isUuid(questionId)
    ? query.eq("id", questionId)
    : query.eq("legacy_mongo_id", questionId)).maybeSingle<QuestionRow>();

  if (error || !data) {
    throw new TestManagerQuestionError(404, "Question not found.");
  }

  return data;
}

async function getTestRow(testId: string) {
  const supabase = createSupabaseAdminClient();
  const query = supabase
    .from("tests")
    .select("id,legacy_mongo_id,title,visibility,status")
  const { data, error } = await (isUuid(testId) ? query.eq("id", testId) : query.eq("legacy_mongo_id", testId)).maybeSingle<TestRow>();

  if (error || !data) {
    throw new TestManagerQuestionError(404, "Test not found.");
  }

  return data;
}

function buildEditorQuestion(question: QuestionRow, test: TestRow): ReportedQuestionEditorData["question"] {
  const sortedOptions = [...(question.question_options ?? [])].sort((left, right) => left.display_order - right.display_order);
  const sortedSprAnswers = [...(question.question_spr_accepted_answers ?? [])].sort(
    (left, right) => left.display_order - right.display_order,
  );
  const correctOption = question.question_correct_options
    ? sortedOptions.find((option) => option.id === question.question_correct_options?.option_id)
    : null;

  return {
    questionId: question.id,
    testId: question.test_sections?.test_id ?? test.id,
    testTitle: test.title,
    visibility: test.visibility,
    status: test.status,
    section: question.test_sections?.name ?? "Reading and Writing",
    domain: question.domain ?? "",
    skill: question.skill ?? "",
    module: question.test_sections?.module_number ?? 1,
    questionType: question.question_type,
    questionText: question.question_text,
    passage: question.passage ?? "",
    choices: sortedOptions.map((option) => option.option_text),
    correctAnswer: correctOption?.option_text ?? "",
    sprAnswers: sortedSprAnswers.map((answer) => answer.accepted_answer),
    explanation: question.explanation,
    difficulty: question.difficulty,
    points: question.points,
    imageUrl: question.image_url ?? "",
    extra: (question.extra as EditableQuestionPayload["extra"] | null | undefined) ?? undefined,
  };
}

function assertEditablePublicTest(test: TestRow) {
  if (test.visibility !== "public") {
    throw new TestManagerQuestionError(403, "Only public tests can be opened from the reported questions board.");
  }
}

async function resolveEditorTarget(cardId: string, session: AppSession) {
  requirePublicExamEditor(session);

  const question = await getQuestionRow(cardId);
  const testSection = question.test_sections;
  if (!testSection?.test_id) {
    throw new TestManagerQuestionError(404, "Question test section not found.");
  }

  const test = await getTestRow(testSection.test_id);

  assertEditablePublicTest(test);

  let card: TestManagerCard;

  try {
    card = await getReportedQuestionCard(question.id, session);
  } catch (error) {
    if (typeof error !== "object" || error === null || !("status" in error) || error.status !== 404) {
      throw error;
    }

    card = {
      id: question.id,
      questionId: question.id,
      text: test.title,
      createdAt: new Date().toISOString(),
      testId: test.id,
      testTitle: test.title,
      section: question.test_sections?.name ?? "Reading and Writing",
      module: question.test_sections?.module_number ?? 1,
      questionNumber: question.position,
      reportCount: 0,
      isResolved: false,
      reports: [],
    };
  }

  return { card, question, test };
}

async function ensureSectionId(testId: string, sectionName: string, module: number, timeLimitMinutes = 32) {
  const supabase = createSupabaseAdminClient();
  const normalizedSection = normalizeSectionName(sectionName);
  const { data: existing, error: existingError } = await supabase
    .from("test_sections")
    .select("id")
    .eq("test_id", testId)
    .eq("name", normalizedSection)
    .eq("module_number", module)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw new TestManagerQuestionError(500, existingError.message);
  }

  if (existing) {
    return existing.id;
  }

  const { count, error: countError } = await supabase
    .from("test_sections")
    .select("id", { count: "exact", head: true })
    .eq("test_id", testId);

  if (countError) {
    throw new TestManagerQuestionError(500, countError.message);
  }

  const { data: created, error: createError } = await supabase
    .from("test_sections")
    .insert({
      test_id: testId,
      name: normalizedSection,
      module_number: module,
      display_order: (count ?? 0) + 1,
      question_count: 0,
      time_limit_minutes: timeLimitMinutes,
    })
    .select("id")
    .single<{ id: string }>();

  if (createError || !created) {
    throw new TestManagerQuestionError(500, createError?.message ?? "Failed to create test section.");
  }

  return created.id;
}

function normalizeQuestionPayload(payload: EditableQuestionPayload) {
  return {
    ...payload,
    section: normalizeSectionName(payload.section),
    domain: payload.domain?.trim() ? payload.domain.trim() : undefined,
    skill: payload.skill?.trim() ? payload.skill.trim() : undefined,
    passage: payload.passage?.trim() ? payload.passage.trim() : undefined,
    imageUrl: payload.imageUrl?.trim() ? payload.imageUrl.trim() : undefined,
    choices: payload.choices?.map((choice) => choice.trim()).filter(Boolean),
    correctAnswer: payload.correctAnswer?.trim() ? payload.correctAnswer.trim() : undefined,
    sprAnswers: payload.sprAnswers?.map((answer) => answer.trim()).filter(Boolean),
  };
}

function resolveMultipleChoiceCorrectAnswer(question: QuestionRow, payload: ReturnType<typeof normalizeQuestionPayload>) {
  const choices = payload.choices ?? [];
  const submittedCorrectAnswer = payload.correctAnswer ?? "";
  if (choices.includes(submittedCorrectAnswer)) {
    return submittedCorrectAnswer;
  }

  const sortedOptions = [...(question.question_options ?? [])].sort((left, right) => left.display_order - right.display_order);
  const currentCorrectIndex = question.question_correct_options
    ? sortedOptions.findIndex((option) => option.id === question.question_correct_options?.option_id)
    : -1;

  if (currentCorrectIndex >= 0 && choices[currentCorrectIndex]) {
    return choices[currentCorrectIndex];
  }

  const normalizedSubmitted = submittedCorrectAnswer.replace(/\s+/g, " ").trim();
  const choiceCodeMatch = normalizedSubmitted.match(/^choice_(\d+)$/i);
  if (choiceCodeMatch) {
    const choiceIndex = Number.parseInt(choiceCodeMatch[1] ?? "", 10);
    if (Number.isInteger(choiceIndex) && choices[choiceIndex]) {
      return choices[choiceIndex];
    }
  }

  const labelIndex = "ABCDEF".indexOf(normalizedSubmitted.toUpperCase());
  if (labelIndex >= 0 && choices[labelIndex]) {
    return choices[labelIndex];
  }

  const normalizedMatch = choices.find((choice) => choice.replace(/\s+/g, " ").trim() === normalizedSubmitted);
  return normalizedMatch ?? null;
}

async function replaceQuestionAnswers(question: QuestionRow, payload: ReturnType<typeof normalizeQuestionPayload>) {
  const supabase = createSupabaseAdminClient();
  const questionId = question.id;

  const { error: deleteSprError } = await supabase.from("question_spr_accepted_answers").delete().eq("question_id", questionId);
  if (deleteSprError) {
    throw new TestManagerQuestionError(500, deleteSprError.message);
  }

  if (payload.questionType === "multiple_choice") {
    const choices = payload.choices ?? [];
    const correctAnswer = resolveMultipleChoiceCorrectAnswer(question, payload);

    if (choices.length === 0) {
      throw new TestManagerQuestionError(400, "Multiple-choice questions need at least one choice.");
    }

    const existingOptions = [...(question.question_options ?? [])].sort((left, right) => left.display_order - right.display_order);
    const surplusOptions = existingOptions.slice(choices.length);
    if (surplusOptions.length > 0) {
      const { count, error: attemptCountError } = await supabase
        .from("attempt_answers")
        .select("id", { count: "exact", head: true })
        .eq("question_id", questionId)
        .in("selected_option_id", surplusOptions.map((option) => option.id));

      if (attemptCountError) {
        throw new TestManagerQuestionError(500, attemptCountError.message);
      }

      if ((count ?? 0) > 0) {
        throw new TestManagerQuestionError(
          400,
          "This question has student attempts tied to removed choices. Edit the existing choices instead of deleting them.",
        );
      }

      const { error: surplusDeleteError } = await supabase
        .from("question_options")
        .delete()
        .eq("question_id", questionId)
        .in("id", surplusOptions.map((option) => option.id));

      if (surplusDeleteError) {
        throw new TestManagerQuestionError(500, surplusDeleteError.message);
      }
    }

    const savedOptions: Array<{ id: string; option_text: string }> = [];
    for (const [index, choice] of choices.entries()) {
      const existingOption = existingOptions[index];
      if (existingOption) {
        const { data: updatedOption, error: optionError } = await supabase
          .from("question_options")
          .update({
            option_code: `choice_${index}`,
            option_text: choice,
            display_order: index + 1,
          })
          .eq("id", existingOption.id)
          .select("id,option_text")
          .single<{ id: string; option_text: string }>();

        if (optionError || !updatedOption) {
          throw new TestManagerQuestionError(500, optionError?.message ?? "Failed to save choices.");
        }

        savedOptions.push(updatedOption);
        continue;
      }

      const { data: insertedOption, error: optionError } = await supabase
        .from("question_options")
        .insert({
          question_id: questionId,
          option_code: `choice_${index}`,
          option_text: choice,
          display_order: index + 1,
        })
        .select("id,option_text")
        .single<{ id: string; option_text: string }>();

      if (optionError || !insertedOption) {
        throw new TestManagerQuestionError(500, optionError?.message ?? "Failed to save choices.");
      }

      savedOptions.push(insertedOption);
    }

    const matchedOption = savedOptions.find((option) => option.option_text === correctAnswer)
      ?? savedOptions.find((option) => option.id === question.question_correct_options?.option_id);
    if (!matchedOption) {
      throw new TestManagerQuestionError(400, "Select a correct answer before saving this multiple-choice question.");
    }

    const { error: correctOptionError } = await supabase.from("question_correct_options").upsert({
      question_id: questionId,
      option_id: matchedOption.id,
    });

    if (correctOptionError) {
      throw new TestManagerQuestionError(500, correctOptionError.message);
    }

    return;
  }

  const { error: deleteCorrectError } = await supabase.from("question_correct_options").delete().eq("question_id", questionId);
  if (deleteCorrectError) {
    throw new TestManagerQuestionError(500, deleteCorrectError.message);
  }

  const sprAnswers = payload.sprAnswers ?? [];
  if (sprAnswers.length === 0) {
    throw new TestManagerQuestionError(400, "SPR questions need at least one accepted answer.");
  }

  const { error: sprError } = await supabase.from("question_spr_accepted_answers").insert(
    sprAnswers.map((answer, index) => ({
      question_id: questionId,
      accepted_answer: answer,
      display_order: index + 1,
    })),
  );

  if (sprError) {
    throw new TestManagerQuestionError(500, sprError.message);
  }
}

export const testManagerQuestionService = {
  async getEditorData(cardId: string, session: AppSession): Promise<ReportedQuestionEditorData> {
    const { card, question, test } = await resolveEditorTarget(cardId, session);

    return {
      card,
      question: buildEditorQuestion(question, test),
    };
  },

  async updateQuestion(cardId: string, data: unknown, session: AppSession): Promise<ReportedQuestionEditorData> {
    const payload = normalizeQuestionPayload(QuestionValidationSchema.parse(data));
    const { card, question, test } = await resolveEditorTarget(cardId, session);
    const supabase = createSupabaseAdminClient();

    const { data: currentSection } = await supabase
      .from("test_sections")
      .select("time_limit_minutes")
      .eq("id", question.section_id)
      .maybeSingle<{ time_limit_minutes: number | null }>();

    const sectionId = await ensureSectionId(test.id, payload.section, payload.module, currentSection?.time_limit_minutes ?? 32);

    const { error: updateError } = await supabase
      .from("questions")
      .update({
        section_id: sectionId,
        question_type: payload.questionType,
        question_text: payload.questionText,
        passage: payload.passage ?? null,
        explanation: payload.explanation,
        difficulty: payload.difficulty,
        points: payload.points,
        domain: payload.domain ?? null,
        skill: payload.skill ?? null,
        image_url: payload.imageUrl ?? null,
        extra: payload.extra ?? null,
      })
      .eq("id", question.id);

    if (updateError) {
      throw new TestManagerQuestionError(500, updateError.message);
    }

    await replaceQuestionAnswers(question, payload);

    const nextCard: TestManagerCard = {
      ...card,
      section: payload.section,
      module: payload.module,
    };

    const nextQuestion = await getQuestionRow(nextCard.questionId);
    return {
      card: nextCard,
      question: buildEditorQuestion(nextQuestion, test),
    };
  },
};

export function getTestManagerQuestionErrorStatus(error: unknown) {
  return error instanceof TestManagerQuestionError ? error.status : 500;
}

export function getTestManagerQuestionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return "Invalid question payload.";
  }

  return error instanceof Error ? error.message : "Failed to load reported question.";
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}
