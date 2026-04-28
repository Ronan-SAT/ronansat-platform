"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Loading from "@/components/Loading";
import ReviewPopup from "@/components/ReviewPopup";
import { normalizeSectionName } from "@/lib/sections";
import { fetchQuestionExplanation, fetchReviewQuestion, fetchReviewResult } from "@/lib/services/reviewService";
import type { ReviewAnswer, ReviewResult } from "@/types/review";

function ReviewQuestionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultId = searchParams.get("resultId") ?? "";
  const questionId = searchParams.get("questionId") ?? "";
  const testId = searchParams.get("testId") ?? undefined;
  const testType = searchParams.get("mode") === "sectional" ? "sectional" : "full";
  const source = searchParams.get("source") === "results" ? "results" : "error-log";
  const questionNumber = Number.parseInt(searchParams.get("questionNumber") ?? "1", 10);
  const [answer, setAnswer] = useState<ReviewAnswer | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const loadQuestion = async () => {
      if (!resultId || !questionId) {
        setLoadingQuestion(false);
        setAnswer(null);
        return;
      }

      setLoadingQuestion(true);

      try {
        const nextAnswer = await fetchReviewQuestion(resultId, questionId);
        if (!cancelled) {
          setAnswer(nextAnswer);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setAnswer(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingQuestion(false);
        }
      }
    };

    void loadQuestion();

    return () => {
      cancelled = true;
    };
  }, [questionId, resultId]);

  useEffect(() => {
    let cancelled = false;

    const loadResult = async () => {
      if (!resultId) {
        setReviewResult(null);
        return;
      }

      try {
        const nextResult = await fetchReviewResult(resultId);
        if (!cancelled) {
          setReviewResult(nextResult);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setReviewResult(null);
        }
      }
    };

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [resultId]);

  const handleExpandExplanation = async (nextQuestionId: string) => {
    if (expandedExplanations[nextQuestionId]) {
      return;
    }

    setLoadingExplanations((current) => ({ ...current, [nextQuestionId]: true }));
    try {
      const explanation = await fetchQuestionExplanation(nextQuestionId);
      if (explanation) {
        setExpandedExplanations((current) => ({ ...current, [nextQuestionId]: explanation }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingExplanations((current) => ({ ...current, [nextQuestionId]: false }));
    }
  };

  const handleBack = () => {
    if (source === "results") {
      const params = new URLSearchParams({ mode: testType, resultId });
      if (testId) {
        params.set("testId", testId);
      }

      router.push(`/review?${params.toString()}`);
      return;
    }

    router.push(`/review?view=error-log&mode=${testType}`);
  };

  const normalizedCurrentSection = normalizeSectionName(answer?.questionId?.section);
  const currentModule = answer?.questionId?.module;
  const scopedModuleAnswers =
    reviewResult?.answers?.filter((candidate) => {
      const candidateQuestion = candidate.questionId;
      if (!candidateQuestion?._id || !candidateQuestion.module) {
        return false;
      }

      return (
        normalizeSectionName(candidateQuestion.section) === normalizedCurrentSection &&
        candidateQuestion.module === currentModule
      );
    }) ?? [];
  const scopedCurrentIndex = scopedModuleAnswers.findIndex(
    (candidate) => candidate.questionId?._id === answer?.questionId?._id,
  );

  const navigateToScopedModuleIndex = (targetIndex: number) => {
    if (scopedCurrentIndex < 0) {
      return;
    }

    if (targetIndex < 0 || targetIndex >= scopedModuleAnswers.length) {
      return;
    }

    const nextAnswer = scopedModuleAnswers[targetIndex];
    const nextQuestionId = nextAnswer.questionId?._id;
    if (!nextQuestionId) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("questionId", nextQuestionId);
    params.set("questionNumber", String(targetIndex + 1));
    router.push(`/review/question?${params.toString()}`);
  };

  const prefetchScopedModuleIndex = async (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= scopedModuleAnswers.length) {
      return;
    }

    const nextQuestionId = scopedModuleAnswers[targetIndex]?.questionId?._id;
    if (!resultId || !nextQuestionId) {
      return;
    }

    await fetchReviewQuestion(resultId, nextQuestionId);
  };

  const navigateWithinScopedModule = (direction: "prev" | "next") => {
    const targetIndex = direction === "next" ? scopedCurrentIndex + 1 : scopedCurrentIndex - 1;
    navigateToScopedModuleIndex(targetIndex);
  };

  const scopedModuleQuestions = scopedModuleAnswers
    .map((candidate) => candidate.questionId)
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate?._id));
  const scopedModuleAnswerMap = scopedModuleAnswers.reduce<Record<string, string>>((map, candidate) => {
    const candidateQuestionId = candidate.questionId?._id;
    const userAnswer = candidate.userAnswer;
    if (candidateQuestionId && userAnswer && userAnswer !== "Omitted") {
      map[candidateQuestionId] = userAnswer;
    }

    return map;
  }, {});
  const scopedModuleStatusMap = scopedModuleAnswers.reduce<Record<string, "correct" | "wrong" | "unanswered">>((map, candidate) => {
    const candidateQuestionId = candidate.questionId?._id;
    if (!candidateQuestionId) {
      return map;
    }

    if (!candidate.userAnswer || candidate.userAnswer === "Omitted") {
      map[candidateQuestionId] = "unanswered";
    } else {
      map[candidateQuestionId] = candidate.isCorrect ? "correct" : "wrong";
    }

    return map;
  }, {});

  if (loadingQuestion && !answer) {
    return <Loading showQuote={false} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-paper-bg">
      <ReviewPopup
        ans={answer ?? { isCorrect: false }}
        onClose={handleBack}
        loadingQuestion={loadingQuestion}
        variant="page"
        closeLabel="Back to error log"
        expandedExplanation={expandedExplanations[answer?.questionId?._id || ""]}
        loadingExplanation={!!loadingExplanations[answer?.questionId?._id || ""]}
        onExpandExplanation={handleExpandExplanation}
        navigation={
          scopedCurrentIndex >= 0 && scopedModuleAnswers.length > 0
            ? {
                moduleName: `Module ${currentModule}: ${normalizedCurrentSection || "Section"}`,
                currentIndex: scopedCurrentIndex,
                totalQuestions: scopedModuleAnswers.length,
                questions: scopedModuleQuestions,
                answers: scopedModuleAnswerMap,
                statuses: scopedModuleStatusMap,
                onPrev: () => navigateWithinScopedModule("prev"),
                onNext: () => navigateWithinScopedModule("next"),
                onJump: navigateToScopedModuleIndex,
                onPrefetchIndex: prefetchScopedModuleIndex,
              }
            : undefined
        }
        reportContext={
          testId && answer?.questionId?._id && answer.questionId.section && answer.questionId.module
            ? {
                testId,
                questionId: answer.questionId._id,
                section: answer.questionId.section,
                module: answer.questionId.module,
                questionNumber: Number.isFinite(questionNumber) && questionNumber > 0 ? questionNumber : 1,
                source: "review",
              }
            : undefined
        }
      />
    </div>
  );
}

export default function ReviewQuestionPage() {
  return (
    <Suspense fallback={<Loading showQuote={false} />}>
      <ReviewQuestionContent />
    </Suspense>
  );
}
