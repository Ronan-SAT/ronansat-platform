"use client";

import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Calculator, ChevronDown, ChevronUp, MapPin, X } from "lucide-react";
import "katex/dist/katex.min.css";


import DesmosCalculator from "@/components/DesmosCalculator";
import QuestionExtraBlock from "@/components/question/QuestionExtraBlock";
import { ReportErrorButton } from "@/components/report/ReportErrorButton";
import PassageColumn from "@/components/review/PassageCollumn";
import AnswerDetails from "@/components/review/AnswerDetails";
import SelectableTextPanel, { type TextAnnotation } from "@/components/test/SelectableTextPanel";
import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";
import { getTestingRoomThemePreset } from "@/lib/testingRoomTheme";
import type { ReviewAnswer } from "@/types/review";
import { renderHtmlLatexContent } from "@/utils/renderContent";

interface ReviewPopupProps {
  ans: ReviewAnswer;
  onClose: () => void;
  loadingQuestion: boolean;
  variant?: "modal" | "page";
  closeLabel?: string;
  expandedExplanation: string | undefined;
  loadingExplanation: boolean;
  onExpandExplanation: (qId: string) => void;
  navigation?: {
    moduleName?: string;
    currentIndex: number;
    totalQuestions: number;
    questions: Array<{ _id: string }>;
    answers: Record<string, string>;
    statuses: Record<string, "correct" | "wrong" | "unanswered">;
    onPrev: () => void;
    onNext: () => void;
    onJump: (index: number) => void;
    onPrefetchIndex?: (index: number) => Promise<void> | void;
  };
  reportContext?: {
    testId: string;
    questionId: string;
    section: string;
    module: number;
    questionNumber: number;
    source: "test" | "review";
  };
}

export default function ReviewPopup({
  ans,
  onClose,
  loadingQuestion,
  variant = "modal",
  closeLabel = "Close",
  expandedExplanation,
  loadingExplanation,
  onExpandExplanation,
  navigation,
  reportContext,
}: ReviewPopupProps) {
  const q = ans?.questionId;

  const [showCalculator, setShowCalculator] = useState(false);
  const [isExplanationVisible, setIsExplanationVisible] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);

  const isPageVariant = variant === "page";
  const themePreset = getTestingRoomThemePreset("ronan");
  const viewerTheme = themePreset.viewer;
  const footerTheme = themePreset.footer;

  if (!q || (loadingQuestion && !ans.questionLoaded)) {
    return (
      <div className={isPageVariant ? "flex h-screen items-center justify-center bg-paper-bg p-6 text-center text-ink-fg" : "fixed inset-0 z-[100] flex items-center justify-center bg-ink-fg/20 p-4"}>
        <div className={isPageVariant ? "mx-auto max-w-sm" : "workbook-modal-card max-w-sm p-8 text-center text-ink-fg"}>
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-accent-3" />
          <p className="font-display text-3xl font-black uppercase tracking-tight">
            {!q ? "Question data is missing." : "Loading question."}
          </p>
          {q ? <p className="mt-2 text-sm text-ink-fg/70">Fetching the full prompt, answers, and passage now.</p> : null}
          <button onClick={onClose} className="workbook-button mt-5" type="button">
            {closeLabel}
          </button>
        </div>
      </div>
    );
  }

  const isMath =
    q?.subject?.toLowerCase() === "math" ||
    q?.domain?.toLowerCase()?.includes("math") ||
    q?.section?.toLowerCase()?.includes("math");
  const questionNumber = navigation ? navigation.currentIndex + 1 : reportContext?.questionNumber ?? 1;
  const canGoPrev = Boolean(navigation && navigation.currentIndex > 0);
  const canGoNext = Boolean(navigation && navigation.currentIndex < navigation.totalQuestions - 1);

  const handleToggleExplanation = () => {
    if (!isExplanationVisible && !expandedExplanation) {
      onExpandExplanation(q._id);
    }
    setIsExplanationVisible((current) => !current);
  };

  return (
    <div className={isPageVariant ? "flex min-h-screen flex-col bg-surface-white md:h-screen md:overflow-hidden" : "fixed inset-0 z-[100] flex flex-col bg-paper-bg"}>
      <DesmosCalculator theme="ronan" isOpen={showCalculator} onClose={() => setShowCalculator(false)} />

      <header className="flex shrink-0 flex-col gap-3 border-b-4 border-ink-fg bg-surface-white px-4 py-3 sm:px-6 md:min-h-20 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {q.domain ? <span className={`workbook-sticker ${isMath ? "bg-accent-2 text-white" : "bg-accent-1 text-ink-fg"}`}>{q.domain}</span> : null}
            {q.skill ? <span className="workbook-sticker bg-accent-1 text-ink-fg">{q.skill}</span> : null}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 md:w-auto md:justify-end">
          {isMath ? (
            <button
              onClick={() => setShowCalculator((current) => !current)}
              title="Open Desmos Calculator"
              className={`flex-1 rounded-2xl border-2 border-ink-fg px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] brutal-shadow-sm workbook-press md:flex-none ${showCalculator ? "bg-accent-2 text-white" : "bg-surface-white text-ink-fg"}`}
              type="button"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Calculator className="h-4 w-4" />
                Calc
              </span>
            </button>
          ) : null}

          {reportContext ? <ReportErrorButton context={reportContext} /> : null}

          <button
            onClick={handleToggleExplanation}
            className={`flex-1 rounded-2xl border-2 border-ink-fg px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] brutal-shadow-sm workbook-press md:flex-none ${isExplanationVisible ? "bg-primary text-ink-fg" : "bg-surface-white text-ink-fg"}`}
            type="button"
          >
            <span className="flex items-center justify-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="sm:hidden">Explain</span>
              <span className="hidden sm:inline">{loadingExplanation ? "Loading..." : "Explanation"}</span>
              {isExplanationVisible ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-ink-fg px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] brutal-shadow-sm workbook-press bg-surface-white text-ink-fg md:flex-none"
            type="button"
          >
            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              <X className="h-4 w-4" />
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">{closeLabel}</span>
              </span>
            </button>
          </div>
      </header>

      <SelectableTextPanel
        annotations={annotations}
        onChange={setAnnotations}
        sourceQuestionId={q._id}
        className={`relative mb-16 flex min-h-0 flex-1 bg-surface-white sm:mb-20 md:overflow-hidden ${isPageVariant ? "bg-surface-white" : "bg-paper-bg bg-dot-pattern"}`}
      >
        <div className="flex min-h-0 flex-1 flex-col items-stretch overflow-visible md:h-full md:flex-row md:overflow-hidden">
          <PassageColumn q={q} />

          <div className={`${q.passage ? "w-full md:w-1/2" : "mx-auto w-full max-w-4xl"} min-h-0 overflow-visible bg-surface-white md:h-full md:overflow-y-auto`}>
            <div className="flex flex-col gap-5 px-2 pb-5 pt-2 sm:p-6 lg:p-8">
              {!q.passage ? (
                <QuestionExtraBlock
                  extra={q.extra}
                  className="rounded-2xl bg-surface-white p-4"
                  titleClassName="mb-2 text-center font-sans text-[16px] font-normal leading-[1.35] text-ink-fg"
                />
              ) : null}

              <div className="flex flex-col">
                <QuestionNumberBar questionNumber={questionNumber} viewerTheme={viewerTheme} />

                <div className={`testing-question-copy mt-3 px-4 pb-4 pt-4 text-[14px] leading-relaxed sm:px-6 sm:text-[15px] ${viewerTheme.readingFontClass} ${viewerTheme.promptClass}`}>
                  <p>
                    {renderHtmlLatexContent(q.questionText || "")}
                  </p>
                </div>
              </div>

              <AnswerDetails q={q} ans={ans} />

              {isExplanationVisible ? (
                <div className="overflow-hidden rounded-2xl border-2 border-ink-fg bg-surface-white p-6">
                  <div className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Explanation</div>
                    {expandedExplanation ? (
                      <p className="whitespace-pre-wrap font-[Georgia,serif] text-[15px] leading-relaxed text-ink-fg">
                        {renderHtmlLatexContent(expandedExplanation || "")}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-ink-fg/70">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink-fg/20 border-t-ink-fg" />
                        Loading explanation...
                      </div>
                    )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </SelectableTextPanel>

      {navigation ? (
        <ReviewNavigationFooter
          currentIndex={navigation.currentIndex}
          totalQuestions={navigation.totalQuestions}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onPrev={navigation.onPrev}
          onNext={navigation.onNext}
          onJump={navigation.onJump}
          onPrefetchIndex={navigation.onPrefetchIndex}
          footerTheme={footerTheme}
          isGridOpen={isGridOpen}
          setIsGridOpen={setIsGridOpen}
          moduleName={navigation.moduleName}
          questions={navigation.questions}
          answers={navigation.answers}
          statuses={navigation.statuses}
        />
      ) : null}
    </div>
  );
}

function QuestionNumberBar({
  questionNumber,
  viewerTheme,
}: {
  questionNumber: number;
  viewerTheme: ReturnType<typeof getTestingRoomThemePreset>["viewer"];
}) {
  return (
    <div className="shrink-0">
      <div className="flex h-[30px] items-stretch sm:h-[32px]">
        <div className={`flex w-[30px] shrink-0 select-none items-center justify-center text-sm font-black sm:w-[32px] ${viewerTheme.questionNumberClass}`}>
          {questionNumber}
        </div>
        <div className={`flex flex-1 items-center px-2.5 sm:px-3 ${viewerTheme.questionToolbarClass}`} />
      </div>

      <div className={`mt-[2px] w-full ${viewerTheme.sectionRuleClass}`} />
    </div>
  );
}

function ReviewNavigationFooter({
  currentIndex,
  totalQuestions,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onJump,
  onPrefetchIndex,
  footerTheme,
  isGridOpen,
  setIsGridOpen,
  moduleName,
  questions,
  answers,
  statuses,
}: {
  currentIndex: number;
  totalQuestions: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onJump: (index: number) => void;
  onPrefetchIndex?: (index: number) => Promise<void> | void;
  footerTheme: ReturnType<typeof getTestingRoomThemePreset>["footer"];
  isGridOpen: boolean;
  setIsGridOpen: (isOpen: boolean) => void;
  moduleName?: string;
  questions: Array<{ _id: string }>;
  answers: Record<string, string>;
  statuses: Record<string, "correct" | "wrong" | "unanswered">;
}) {
  const disabledClass = "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none";
  const headerTitle = moduleName ?? "Question Navigator";
  const previousIntentHandlers = useIntentPrefetch<HTMLButtonElement>({
    key: `review-popup-prev:${questions[currentIndex - 1]?._id ?? currentIndex - 1}`,
    enabled: canGoPrev && Boolean(onPrefetchIndex),
    onPrefetch: () => onPrefetchIndex?.(currentIndex - 1),
  });
  const nextIntentHandlers = useIntentPrefetch<HTMLButtonElement>({
    key: `review-popup-next:${questions[currentIndex + 1]?._id ?? currentIndex + 1}`,
    enabled: canGoNext && Boolean(onPrefetchIndex),
    onPrefetch: () => onPrefetchIndex?.(currentIndex + 1),
  });

  return (
    <>
      {isGridOpen ? (
        <>
          <div className="fixed inset-0 z-30 bg-ink-fg/20" onClick={() => setIsGridOpen(false)} />

          <div className={`fixed bottom-[82px] left-1/2 z-40 w-[min(94vw,595px)] -translate-x-1/2 px-4 pb-5 pt-4 transition-all animate-in fade-in zoom-in-95 duration-200 sm:bottom-[98px] sm:px-6 sm:pb-7 sm:pt-5 ${footerTheme.modalClass}`}>
            <div className={`flex items-start justify-between gap-4 pb-4 ${footerTheme.modalHeaderClass}`}>
              <div className="w-8 shrink-0" />
              <h3 className={`flex-1 text-center text-lg leading-[1.05] tracking-tight sm:text-[22px] ${footerTheme.modalTitleClass}`}>
                {headerTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsGridOpen(false)}
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${footerTheme.modalCloseButtonClass}`}
                aria-label="Close question navigator"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-3 text-[11px] font-medium sm:gap-x-6 sm:text-[12px] ${footerTheme.modalLegendClass}`}>
              <div className="flex items-center gap-1.5">
                <MapPin className={`h-4 w-4 ${footerTheme.currentPinClass}`} strokeWidth={2} />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-4 w-4 bg-surface-white ${footerTheme.unansweredLegendClass}`} />
                <span>Unanswered</span>
              </div>
            </div>

            <div className="mx-auto mt-4 flex max-h-[196px] w-full max-w-[500px] flex-wrap justify-start gap-x-3 gap-y-4 overflow-y-auto px-1 pb-1 pt-4 sm:gap-x-[14px] sm:gap-y-[18px] sm:pt-5">
              {questions.map((question, index) => {
                const isAnswered = !!answers[question._id];
                const isCurrent = index === currentIndex;
                const status = statuses[question._id] ?? (isAnswered ? "correct" : "unanswered");
                const statusClass =
                  status === "correct"
                    ? "border-2 border-ink-fg bg-primary text-ink-fg"
                    : status === "wrong"
                      ? "border-2 border-ink-fg bg-[#F4A261] font-bold text-ink-fg"
                      : footerTheme.gridUnansweredClass;

                return (
                  <ReviewGridJumpButton
                    key={question._id}
                    questionId={question._id}
                    index={index}
                    isCurrent={isCurrent}
                    footerTheme={footerTheme}
                    onJump={onJump}
                    onPrefetchIndex={onPrefetchIndex}
                    setIsGridOpen={setIsGridOpen}
                    className={`relative flex h-7 w-7 shrink-0 items-center justify-center overflow-visible text-[13px] font-semibold transition-all sm:h-[30px] sm:w-[30px] sm:text-[14px] ${statusClass}`}
                  />
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      <footer className={`fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-between gap-2 px-3 sm:h-20 sm:px-6 ${footerTheme.barClass}`}>
        <div className="hidden min-w-0 flex-1 sm:block">
          <span className={`hidden max-w-[7rem] truncate text-xs font-semibold sm:block sm:max-w-none sm:text-base ${footerTheme.displayNameClass}`}>
            Ronan SAT
          </span>
        </div>

        <div className="flex flex-1 items-center justify-start sm:justify-center">
          <button
            type="button"
            onClick={() => setIsGridOpen(!isGridOpen)}
            className={`${footerTheme.navigatorButtonClass} inline-flex max-w-full justify-center px-3 py-1.5 text-xs sm:w-auto sm:max-w-none sm:px-4 sm:py-2 sm:text-sm`}
          >
            <span className="sm:hidden">{currentIndex + 1}/{totalQuestions}</span>
            <span className="hidden sm:inline">Question {currentIndex + 1} of {totalQuestions}</span>
            <ChevronDown className={`ml-1.5 inline-block h-3.5 w-3.5 transition-transform sm:ml-2 sm:h-4 sm:w-4 ${isGridOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canGoPrev}
            className={`${footerTheme.secondaryNavButtonClass} ${disabledClass} px-3 py-1.5 text-xs sm:px-6 sm:text-sm`}
            aria-label="Previous question"
            {...previousIntentHandlers}
          >
            <ArrowLeft className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className={`${footerTheme.primaryNavButtonClass} ${disabledClass} px-3 py-1.5 text-xs sm:px-6 sm:text-sm`}
            aria-label="Next question"
            {...nextIntentHandlers}
          >
            <ArrowRight className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Next</span>
          </button>
        </div>
      </footer>
    </>
  );
}

function ReviewGridJumpButton({
  questionId,
  index,
  isCurrent,
  className,
  footerTheme,
  onJump,
  onPrefetchIndex,
  setIsGridOpen,
}: {
  questionId: string;
  index: number;
  isCurrent: boolean;
  className: string;
  footerTheme: ReturnType<typeof getTestingRoomThemePreset>["footer"];
  onJump: (index: number) => void;
  onPrefetchIndex?: (index: number) => Promise<void> | void;
  setIsGridOpen: (isOpen: boolean) => void;
}) {
  const intentHandlers = useIntentPrefetch<HTMLButtonElement>({
    key: `review-popup-grid:${questionId}`,
    enabled: !isCurrent && Boolean(onPrefetchIndex),
    onPrefetch: () => onPrefetchIndex?.(index),
  });

  return (
    <button
      type="button"
      onClick={() => {
        onJump(index);
        setIsGridOpen(false);
      }}
      className={className}
      aria-label={`Jump to question ${index + 1}`}
      {...intentHandlers}
    >
      {isCurrent ? (
        <MapPin className={`pointer-events-none absolute -top-4 left-1/2 h-3.5 w-3.5 -translate-x-1/2 sm:-top-[18px] sm:h-4 sm:w-4 ${footerTheme.currentPinClass}`} strokeWidth={2} />
      ) : null}
      <span>{index + 1}</span>
    </button>
  );
}
