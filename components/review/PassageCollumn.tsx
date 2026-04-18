"use client";

import QuestionVisualBlock from "@/components/question/QuestionVisualBlock";
import RichTextWithLatex from "@/components/RichTextWithLatex";
import type { ReviewQuestion } from "@/types/review";

interface PassageColumnProps {
  q: ReviewQuestion;
}

export default function PassageColumn({ q }: PassageColumnProps) {
  if (!q.passage) {
    return null;
  }

  return (
    <div className="h-full w-1/2 overflow-y-auto border-r-4 border-ink-fg bg-surface-white">
      <div className="p-8 lg:p-10">
        <QuestionVisualBlock
          extra={q.extra}
          className="mb-6 rounded-2xl border-2 border-ink-fg bg-paper-bg p-4 brutal-shadow-sm"
          titleClassName="mb-2 text-center text-[16px] font-normal leading-[1.35] text-ink-fg font-[Georgia,serif]"
        />

        <div className="workbook-sticker bg-accent-1 text-ink-fg">Passage</div>
        <div className="mt-5 rounded-2xl border-2 border-ink-fg bg-paper-bg p-6 text-[16px] leading-[1.85] text-ink-fg selection:bg-primary">
          <RichTextWithLatex text={q.passage} loosenTallInlineMath />
        </div>
      </div>
    </div>
  );
}
