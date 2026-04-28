"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import ReviewPageSkeleton from "@/components/ReviewPageSkeleton";
import { ReviewErrorLog } from "@/components/review/ReviewErrorLog";
import { ReviewReport } from "@/components/review/ReviewReport";
import { ReviewResultsSidebar } from "@/components/review/ReviewResultsSidebar";
import { useReviewPageController } from "@/components/review/useReviewPageController";
import { fetchReviewQuestion, fetchReviewResult } from "@/lib/services/reviewService";

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") === "error-log" ? "error-log" : "results";
  const {
    status,
    loading,
    testType,
    activeTestId,
    filteredResults,
    activeTest,
    setTestType,
    setActiveTestId,
    handleUpdateAnswerReason,
  } = useReviewPageController({ activeView });

  if ((loading && filteredResults.length === 0) || (status === "loading" && filteredResults.length === 0)) {
    return <ReviewPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-paper-bg lg:flex">
      <InitialTabBootReady />
      {activeView === "results" ? (
        <ReviewResultsSidebar
          testType={testType}
          activeTestId={activeTestId}
          filteredResults={filteredResults}
          onChangeType={setTestType}
          onSelectTest={setActiveTestId}
          onPrefetchTest={(resultId) => fetchReviewResult(resultId).then(() => undefined)}
        />
      ) : null}

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="workbook-sticker bg-primary text-ink-fg">Review Studio</div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg md:text-5xl">
              {activeView === "error-log" ? "Error log." : "Learn from your mistakes."}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-fg md:text-base">
              {activeView === "error-log"
                ? "Browse every wrong and skipped question in one table, filter the list, tag a reason, and jump into the exact question when needed."
                : "Open a result from the left shelf, scan your miss patterns, and jump directly into the questions that need correction."}
            </p>
          </div>
        </section>

        {activeView === "results" ? (
          <ReviewReport
            testType={testType}
            activeTest={activeTest}
            onSelectAnswer={({ resultId, answer, questionNumber, testId }) => {
              const questionId = answer.questionId?._id;
              if (!questionId) {
                return;
              }

              const params = new URLSearchParams({
                source: "results",
                mode: testType,
                resultId,
                questionId,
                questionNumber: String(questionNumber),
              });

              if (testId) {
                params.set("testId", testId);
              }

              router.push(`/review/question?${params.toString()}`);
            }}
            onPrefetchAnswer={({ resultId, answer }) => {
              const questionId = answer.questionId?._id;
              if (!questionId) {
                return;
              }

              return fetchReviewQuestion(resultId, questionId).then(() => undefined);
            }}
          />
        ) : (
          <ReviewErrorLog
            testType={testType}
            onUpdateReason={handleUpdateAnswerReason}
            onViewQuestion={({ resultId, testId, answer, questionNumber }) => {
              const params = new URLSearchParams();
              params.set("source", "error-log");
              params.set("resultId", resultId);
              params.set("questionId", answer.questionId?._id || "");
              params.set("questionNumber", String(questionNumber));
              params.set("mode", testType);

              if (testId) {
                params.set("testId", testId);
              }

              router.push(`/review/question?${params.toString()}`);
            }}
          />
        )}
      </main>
    </div>
  );
}

export default function GridReviewPage() {
  return (
    <Suspense fallback={<ReviewPageSkeleton />}>
      <ReviewContent />
    </Suspense>
  );
}
