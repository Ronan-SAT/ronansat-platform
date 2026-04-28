"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";

type LibraryPaginationProps = {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  intentKeyPrefix?: string;
  onPreviousIntent?: () => Promise<void> | void;
  onNextIntent?: () => Promise<void> | void;
};

export function LibraryPagination({
  page,
  totalPages,
  onPrevious,
  onNext,
  intentKeyPrefix,
  onPreviousIntent,
  onNextIntent,
}: LibraryPaginationProps) {
  const previousIntentHandlers = useIntentPrefetch<HTMLButtonElement>({
    key: `${intentKeyPrefix ?? "library-pagination"}:previous:${page - 1}`,
    enabled: page > 1 && Boolean(onPreviousIntent),
    onPrefetch: () => onPreviousIntent?.(),
  });
  const nextIntentHandlers = useIntentPrefetch<HTMLButtonElement>({
    key: `${intentKeyPrefix ?? "library-pagination"}:next:${page + 1}`,
    enabled: page < totalPages && Boolean(onNextIntent),
    onPrefetch: () => onNextIntent?.(),
  });

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mx-auto mt-8 flex w-full max-w-md items-center justify-center gap-3 sm:max-w-none">
      <button
        type="button"
        onClick={onPrevious}
        disabled={page === 1}
        aria-label="Previous page"
        className="workbook-button workbook-button-secondary h-14 w-14 shrink-0 px-0 disabled:opacity-50 sm:w-auto sm:min-w-32 sm:px-4"
        {...previousIntentHandlers}
      >
        <ChevronLeft className="h-5 w-5 sm:hidden" />
        <span className="hidden sm:inline">Previous</span>
      </button>
      <div className="workbook-sticker h-14 min-w-0 flex-1 justify-center self-center bg-surface-white px-4 sm:flex-none sm:px-7">
        Page {page} of {totalPages}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={page === totalPages}
        aria-label="Next page"
        className="workbook-button workbook-button-secondary h-14 w-14 shrink-0 px-0 disabled:opacity-50 sm:w-auto sm:min-w-32 sm:px-4"
        {...nextIntentHandlers}
      >
        <ChevronRight className="h-5 w-5 sm:hidden" />
        <span className="hidden sm:inline">Next</span>
      </button>
    </div>
  );
}
