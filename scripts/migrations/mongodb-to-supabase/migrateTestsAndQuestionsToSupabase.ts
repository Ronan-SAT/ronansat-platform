import { MongoClient, ObjectId } from "mongodb";
import { normalizeSectionName } from "../../../lib/sections";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

type LeanTest = {
  _id: ObjectId;
  title: string;
  timeLimit: number;
  difficulty?: string;
  sections?: Array<{
    name: string;
    questionsCount: number;
    timeLimit: number;
  }>;
};

type LeanQuestion = {
  _id: ObjectId;
  testId: ObjectId;
  section: string;
  module: number;
  questionType: "multiple_choice" | "spr";
  questionText: string;
  passage?: string;
  choices?: string[];
  correctAnswer?: string;
  sprAnswers?: string[];
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
  points?: number;
  domain?: string;
  skill?: string;
  imageUrl?: string;
  extra?: unknown;
  createdAt?: Date;
};

type MigratedSection = {
  id: string;
  name: string;
  module_number: number | null;
};

type ExistingQuestionRow = {
  test_sections: {
    test_id: string;
  } | null;
};

type MigrationFailure = {
  legacyQuestionId: string;
  legacyTestId: string;
  reason: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeAnswer(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function getOptionCode(index: number) {
  return String.fromCharCode(65 + index);
}

function resolveCorrectAnswerIndex(rawCorrectAnswer: string | undefined, rawChoices: string[]) {
  const normalizedCorrectAnswer = normalizeAnswer(rawCorrectAnswer);

  if (!normalizedCorrectAnswer) {
    return -1;
  }

  if (normalizedCorrectAnswer.startsWith("choice_")) {
    const index = Number.parseInt(normalizedCorrectAnswer.split("_")[1] ?? "", 10);
    return Number.isInteger(index) ? index : -1;
  }

  return rawChoices.findIndex((choice) => normalizeAnswer(choice) === normalizedCorrectAnswer);
}

function buildSectionMetadata(test: LeanTest, questions: LeanQuestion[]) {
  const counts = new Map<string, number>();

  for (const question of questions) {
    const normalizedSection = normalizeSectionName(question.section);
    const key = `${normalizedSection}::${question.module}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, questionCount]) => {
      const [name, moduleString] = key.split("::");
      const sectionTemplate = test.sections?.find((section) => normalizeSectionName(section.name) === name);

      return {
        name,
        moduleNumber: Number.parseInt(moduleString, 10),
        questionCount,
        timeLimitMinutes: sectionTemplate?.timeLimit ?? test.timeLimit,
      };
    })
    .sort((left, right) => {
      const nameDiff = left.name.localeCompare(right.name);
      if (nameDiff !== 0) {
        return nameDiff;
      }

      return left.moduleNumber - right.moduleNumber;
    });
}

async function migrateTestWithQuestions(test: LeanTest, questions: LeanQuestion[], failures: MigrationFailure[]) {
  const supabase = createSupabaseAdminClient();
  const legacyTestId = test._id.toString();

  const { data: savedTest, error: testError } = await supabase
    .from("tests")
    .upsert(
      {
        legacy_mongo_id: legacyTestId,
        title: test.title,
        difficulty: test.difficulty ?? null,
        time_limit_minutes: test.timeLimit,
        visibility: "public",
        status: "published",
      },
      { onConflict: "legacy_mongo_id" }
    )
    .select("id")
    .single();

  if (testError || !savedTest) {
    throw new Error(`Failed to upsert test ${legacyTestId}: ${testError?.message ?? "unknown error"}`);
  }

  const sectionRows = buildSectionMetadata(test, questions).map((section, index) => ({
    test_id: savedTest.id,
    name: section.name,
    module_number: section.moduleNumber,
    display_order: index + 1,
    question_count: section.questionCount,
    time_limit_minutes: section.timeLimitMinutes,
  }));

  const { data: savedSections, error: sectionError } = await supabase
    .from("test_sections")
    .upsert(sectionRows, { onConflict: "test_id,name,module_number" })
    .select("id,name,module_number");

  if (sectionError || !savedSections) {
    throw new Error(`Failed to upsert sections for test ${legacyTestId}: ${sectionError?.message ?? "unknown error"}`);
  }

  const sectionMap = new Map<string, MigratedSection>(
    savedSections.map((section) => [`${section.name}::${section.module_number ?? 0}`, section])
  );

  const groupedQuestions = new Map<string, LeanQuestion[]>();
  for (const question of questions) {
    const key = `${normalizeSectionName(question.section)}::${question.module}`;
    const existing = groupedQuestions.get(key) ?? [];
    existing.push(question);
    groupedQuestions.set(key, existing);
  }

  for (const grouped of groupedQuestions.values()) {
    grouped.sort((left, right) => {
      const leftTime = left.createdAt?.getTime() ?? 0;
      const rightTime = right.createdAt?.getTime() ?? 0;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return left._id.toString().localeCompare(right._id.toString());
    });
  }

  for (const [groupKey, grouped] of groupedQuestions.entries()) {
    const section = sectionMap.get(groupKey);
    if (!section) {
      throw new Error(`Missing migrated section ${groupKey} for test ${legacyTestId}`);
    }

    for (const [index, question] of grouped.entries()) {
      const legacyQuestionId = question._id.toString();
      const { data: savedQuestion, error: questionError } = await supabase
        .from("questions")
        .upsert(
          {
            legacy_mongo_id: legacyQuestionId,
            section_id: section.id,
            position: index + 1,
            question_type: question.questionType,
            question_text: question.questionText,
            passage: question.passage ?? null,
            explanation: question.explanation,
            difficulty: question.difficulty ?? "medium",
            points: question.points ?? 10,
            domain: question.domain ?? null,
            skill: question.skill ?? null,
            image_url: question.imageUrl ?? null,
            extra: question.extra ?? null,
          },
          { onConflict: "legacy_mongo_id" }
        )
        .select("id")
        .single();

      if (questionError || !savedQuestion) {
        throw new Error(`Failed to upsert question ${legacyQuestionId}: ${questionError?.message ?? "unknown error"}`);
      }

      await supabase.from("question_correct_options").delete().eq("question_id", savedQuestion.id);
      await supabase.from("question_spr_accepted_answers").delete().eq("question_id", savedQuestion.id);
      await supabase.from("question_options").delete().eq("question_id", savedQuestion.id);

      if (question.questionType === "multiple_choice") {
        const rawChoices = (question.choices ?? []).map((choice) => choice.trim());
        const choices = rawChoices.filter(Boolean);

        if (choices.length === 0) {
          await supabase.from("questions").delete().eq("id", savedQuestion.id);
          failures.push({
            legacyQuestionId,
            legacyTestId,
            reason: "Multiple-choice question has no importable options.",
          });
          continue;
        }

        const { data: insertedOptions, error: optionError } = await supabase
          .from("question_options")
          .insert(
            choices.map((choice, optionIndex) => ({
              question_id: savedQuestion.id,
              option_code: getOptionCode(optionIndex),
              option_text: choice,
              display_order: optionIndex + 1,
            }))
          )
          .select("id,option_text");

        if (optionError || !insertedOptions) {
          throw new Error(`Failed to insert options for question ${legacyQuestionId}: ${optionError?.message ?? "unknown error"}`);
        }

        const correctAnswerIndex = resolveCorrectAnswerIndex(question.correctAnswer, rawChoices);
        const rawCorrectAnswer = rawChoices[correctAnswerIndex] ?? question.correctAnswer ?? "";
        const matchedOption = insertedOptions.find((option) => normalizeAnswer(option.option_text) === normalizeAnswer(rawCorrectAnswer));

        if (!matchedOption) {
          await supabase.from("question_options").delete().eq("question_id", savedQuestion.id);
          await supabase.from("questions").delete().eq("id", savedQuestion.id);
          failures.push({
            legacyQuestionId,
            legacyTestId,
            reason: "Could not map correct answer to an imported option.",
          });
          continue;
        }

        const { error: correctOptionError } = await supabase.from("question_correct_options").insert({
          question_id: savedQuestion.id,
          option_id: matchedOption.id,
        });

        if (correctOptionError) {
          throw new Error(`Failed to insert correct option for question ${legacyQuestionId}: ${correctOptionError.message}`);
        }
      } else {
        const acceptedAnswers = (question.sprAnswers ?? []).map((answer) => answer.trim()).filter(Boolean);

        if (acceptedAnswers.length === 0) {
          await supabase.from("questions").delete().eq("id", savedQuestion.id);
          failures.push({
            legacyQuestionId,
            legacyTestId,
            reason: "SPR question has no accepted answers.",
          });
          continue;
        }

        const { error: sprError } = await supabase.from("question_spr_accepted_answers").insert(
          acceptedAnswers.map((answer, answerIndex) => ({
            question_id: savedQuestion.id,
            accepted_answer: answer,
            display_order: answerIndex + 1,
          }))
        );

        if (sprError) {
          throw new Error(`Failed to insert SPR answers for question ${legacyQuestionId}: ${sprError.message}`);
        }
      }
    }
  }

  return {
    legacyTestId,
    migratedQuestions: questions.length,
  };
}

async function main() {
  const mongoUri = getRequiredEnv("MONGODB_URI");
  const mongoClient = new MongoClient(mongoUri);
  const supabase = createSupabaseAdminClient();
  await mongoClient.connect();

  try {
    const db = mongoClient.db();
    const tests = (await db.collection("tests").find({}).sort({ createdAt: 1, _id: 1 }).toArray()) as unknown as LeanTest[];
    const questions = (await db.collection("questions").find({}).sort({ createdAt: 1, _id: 1 }).toArray()) as unknown as LeanQuestion[];
    const questionsByTestId = new Map<string, LeanQuestion[]>();
    const failures: MigrationFailure[] = [];

    for (const question of questions) {
      const key = question.testId.toString();
      const existing = questionsByTestId.get(key) ?? [];
      existing.push(question);
      questionsByTestId.set(key, existing);
    }

    const { data: existingTests, error: existingTestsError } = await supabase.from("tests").select("id,legacy_mongo_id");
    if (existingTestsError || !existingTests) {
      throw new Error(`Failed to load existing tests: ${existingTestsError?.message ?? "unknown error"}`);
    }

    const { data: existingQuestions, error: existingQuestionsError } = await supabase
      .from("questions")
      .select(
        `
          id,
          test_sections!inner (
            test_id
          )
        `
      );

    if (existingQuestionsError || !existingQuestions) {
      throw new Error(`Failed to load existing migrated question counts: ${existingQuestionsError?.message ?? "unknown error"}`);
    }

    const existingTestIdByLegacyId = new Map(existingTests.filter((test) => test.legacy_mongo_id).map((test) => [test.legacy_mongo_id!, test.id]));
    const importedQuestionCountsByTestId = new Map<string, number>();

    for (const question of existingQuestions as ExistingQuestionRow[]) {
      const testId = question.test_sections?.test_id;
      if (!testId) {
        continue;
      }

      importedQuestionCountsByTestId.set(testId, (importedQuestionCountsByTestId.get(testId) ?? 0) + 1);
    }

    let migratedTests = 0;
    let migratedQuestions = 0;
    let skippedCompletedTests = 0;

    for (const test of tests) {
      const relatedQuestions = questionsByTestId.get(test._id.toString()) ?? [];
      const existingTestId = existingTestIdByLegacyId.get(test._id.toString());
      const importedQuestionCount = existingTestId ? importedQuestionCountsByTestId.get(existingTestId) ?? 0 : 0;

      if (existingTestId && importedQuestionCount === relatedQuestions.length) {
        skippedCompletedTests += 1;
        console.log(`Skipping already migrated test ${test._id.toString()} with ${importedQuestionCount} questions.`);
        continue;
      }

      const result = await migrateTestWithQuestions(test, relatedQuestions, failures);
      migratedTests += 1;
      migratedQuestions += result.migratedQuestions;
      console.log(`Migrated test ${result.legacyTestId} with ${result.migratedQuestions} questions.`);
    }

    console.log(`Finished migrating ${migratedTests} tests and ${migratedQuestions} questions.`);
    console.log(`Skipped ${skippedCompletedTests} already migrated test(s).`);

    if (failures.length > 0) {
      console.warn(`Skipped ${failures.length} malformed question(s).`);
      failures.slice(0, 20).forEach((failure) => {
        console.warn(`${failure.legacyTestId} / ${failure.legacyQuestionId}: ${failure.reason}`);
      });
    }
  } finally {
    await mongoClient.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
