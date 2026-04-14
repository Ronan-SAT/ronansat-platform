"use client";

import { Bookmark, Check, MapPin } from "lucide-react";

import { getTestingRoomThemePreset, type TestingRoomTheme } from "@/lib/testingRoomTheme";

interface TestReviewPageProps {
  theme?: TestingRoomTheme;
  moduleName: string;
  currentIndex: number;
  questions: Array<{ _id: string }>;
  answers: Record<string, string>;
  flagged: Record<string, boolean>;
  submitLabel: string;
  onJump: (index: number) => void;
  onReturn: () => void;
  onSubmit: () => void;
}

export default function TestReviewPage({
  theme = "ronan",
  moduleName,
  currentIndex,
  questions,
  answers,
  flagged,
  submitLabel,
  onJump,
  onReturn,
  onSubmit,
}: TestReviewPageProps) {
  const themePreset = getTestingRoomThemePreset(theme);
  const reviewTheme = themePreset.review;
  const answeredCount = questions.filter((question) => !!answers[question._id]).length;
  const flaggedCount = questions.filter((question) => !!flagged[question._id]).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <section className="mx-auto mb-16 mt-14 flex h-[calc(100vh-7rem)] w-full max-w-5xl items-start justify-center overflow-y-auto px-4 py-6 sm:mb-20 sm:mt-20 sm:h-[calc(100vh-10rem)] sm:px-6 sm:py-8">
      <div className={reviewTheme.cardClass}>
        <div className={reviewTheme.headerClass}>
          <div className={reviewTheme.badgeClass}>Review Page</div>
          <h2 className={`mt-4 ${reviewTheme.titleClass}`}>
            {moduleName}
          </h2>
          <p className={reviewTheme.descriptionClass}>
            Check unanswered and marked questions before you continue. Select any number to jump back into that question.
          </p>
        </div>

        <div className={reviewTheme.statsClass}>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>{answeredCount} Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{unansweredCount} Unanswered</span>
          </div>
          <div className="flex items-center gap-2">
            <Bookmark className={`h-4 w-4 ${reviewTheme.flaggedIconClass}`} />
            <span>{flaggedCount} For Review</span>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="flex flex-wrap gap-3">
            {questions.map((question, index) => {
              const isAnswered = !!answers[question._id];
              const isFlagged = !!flagged[question._id];
              const isCurrent = index === currentIndex;

              return (
                <button
                  key={question._id}
                  type="button"
                  onClick={() => onJump(index)}
                  className={`relative flex h-11 w-11 items-center justify-center text-sm font-bold transition-all ${
                    isAnswered ? themePreset.footer.gridAnsweredClass : themePreset.footer.gridUnansweredClass
                  } ${isCurrent ? reviewTheme.currentRingClass : ""}`}
                  aria-label={`Jump to question ${index + 1}`}
                >
                  <span>{index + 1}</span>
                  {isFlagged ? (
                    <Bookmark className={`pointer-events-none absolute -right-1 -top-1 h-3.5 w-3.5 ${reviewTheme.flaggedIconClass}`} strokeWidth={1.9} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className={reviewTheme.actionsClass}>
          <button type="button" onClick={onReturn} className={reviewTheme.secondaryButtonClass}>
            Return to Questions
          </button>
          <button type="button" onClick={onSubmit} className={reviewTheme.primaryButtonClass}>
            {submitLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
