"use client";

import {
  CalendarDays,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";

import { getReviewScoreLabel } from "@/components/review/reviewPage.utils";
import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";
import type { ReviewResult } from "@/types/review";

type ReviewResultsSidebarProps = {
  testType: "full" | "sectional";
  activeTestId: string | null;
  filteredResults: ReviewResult[];
  onChangeType: (value: "full" | "sectional") => void;
  onSelectTest: (testId: string) => void;
  onPrefetchTest?: (testId: string) => Promise<void> | void;
};

export function ReviewResultsSidebar({
  testType,
  activeTestId,
  filteredResults,
  onChangeType,
  onSelectTest,
  onPrefetchTest,
}: ReviewResultsSidebarProps) {
  return (
    <aside className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[22rem] lg:shrink-0 lg:flex-col lg:border-r-4 lg:border-ink-fg lg:bg-surface-white">
      <div className="border-b-4 border-ink-fg bg-paper-bg px-4 py-5 lg:pl-3 lg:pr-4">
        <div className="workbook-sticker bg-primary text-ink-fg">
          <LayoutGrid className="h-3.5 w-3.5" />
          Results Shelf
        </div>
        <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-ink-fg">
          Review Runs
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-fg">
          Pick a completed test, then drill into mistakes, omissions, and performance patterns.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChangeType("full")}
            className={[
              "flex items-center justify-center rounded-2xl border-2 border-ink-fg px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] whitespace-nowrap brutal-shadow-sm workbook-press",
              testType === "full" ? "bg-primary text-ink-fg" : "bg-surface-white text-ink-fg",
            ].join(" ")}
          >
            Full-Length
          </button>
          <button
            type="button"
            onClick={() => onChangeType("sectional")}
            className={[
              "flex items-center justify-center rounded-2xl border-2 border-ink-fg px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] whitespace-nowrap brutal-shadow-sm workbook-press",
              testType === "sectional" ? "bg-accent-2 text-white" : "bg-surface-white text-ink-fg",
            ].join(" ")}
          >
            Sectional
          </button>
        </div>
      </div>

      <div className="bg-dot-pattern flex-1 space-y-3 overflow-y-auto px-3 py-4 lg:pl-2 lg:pr-3">
        {filteredResults.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink-fg bg-surface-white px-4 py-10 text-center text-sm leading-6 text-ink-fg">
            No results found for this category.
          </div>
        ) : null}

        {filteredResults.map((result) => {
          const isActive = activeTestId === result._id;
          const scoreLabel = getReviewScoreLabel(result);
          const sectionalLabel = result.isSectional
            ? [result.sectionalSubject, result.sectionalModule ? `Module ${result.sectionalModule}` : undefined].filter(Boolean).join(" - ")
            : null;

          return (
            <ReviewResultButton
              key={result._id}
              result={result}
              isActive={isActive}
              scoreLabel={scoreLabel}
              sectionalLabel={sectionalLabel}
              onSelectTest={onSelectTest}
              onPrefetchTest={onPrefetchTest}
              className={[
                "group flex w-full items-start justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left brutal-shadow-sm workbook-press",
                isActive ? "border-ink-fg bg-primary text-ink-fg" : "border-ink-fg bg-surface-white text-ink-fg",
              ].join(" ")}
            />
          );
        })}
      </div>
    </aside>
  );
}

function ReviewResultButton({
  result,
  isActive,
  scoreLabel,
  sectionalLabel,
  className,
  onSelectTest,
  onPrefetchTest,
}: {
  result: ReviewResult;
  isActive: boolean;
  scoreLabel: string | number;
  sectionalLabel: string | null;
  className: string;
  onSelectTest: (testId: string) => void;
  onPrefetchTest?: (testId: string) => Promise<void> | void;
}) {
  const intentHandlers = useIntentPrefetch<HTMLButtonElement>({
    key: `review-result:${result._id}`,
    enabled: !isActive && Boolean(onPrefetchTest),
    onPrefetch: () => onPrefetchTest?.(result._id),
  });

  return (
    <button
      type="button"
      onClick={() => onSelectTest(result._id)}
      className={className}
      {...intentHandlers}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-xl font-black tracking-tight">{result.testId?.title}</p>
        {sectionalLabel ? (
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-fg/70">{sectionalLabel}</p>
        ) : null}
        <div className="mt-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-ink-fg/70">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {new Date(result.date || result.createdAt || "").toLocaleDateString()}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="workbook-sticker bg-surface-white text-ink-fg">{scoreLabel}</span>
        <ChevronRight className={`h-4 w-4 transition-opacity ${isActive ? "opacity-70" : "opacity-30 group-hover:opacity-60"}`} />
      </div>
    </button>
  );
}
