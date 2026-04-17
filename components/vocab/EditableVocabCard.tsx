import { BookOpenCheck, CheckCircle2 } from "lucide-react";

import type { VocabCard } from "@/components/vocab/VocabBoardProvider";

type EditableVocabCardProps = {
  card: VocabCard;
  isEditing: boolean;
  dictionaryStatus?: {
    status: "idle" | "loading" | "success" | "error";
    message?: string;
  };
  onEdit: () => void;
  onFetchDefinition: () => void;
  onRemove: () => void;
  onDragStart: (cardId: string) => void;
};

export function EditableVocabCard({
  card,
  isEditing,
  dictionaryStatus,
  onEdit,
  onFetchDefinition,
  onRemove,
  onDragStart,
}: EditableVocabCardProps) {
  return (
    <article
      draggable={!isEditing}
      onDragStart={() => onDragStart(card.id)}
      className="group rounded-[16px] border-2 border-ink-fg bg-surface-white px-3 py-2.5 text-ink-fg brutal-shadow-sm transition workbook-press"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex flex-1 items-center gap-1.5">
          <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <div className="truncate text-[16px] font-black leading-6 tracking-[-0.02em] text-ink-fg">{card.term}</div>
          </div>
          </button>
        </div>

        <div className="flex items-center gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onFetchDefinition}
            disabled={dictionaryStatus?.status === "loading"}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink-fg bg-accent-1 text-ink-fg transition workbook-press disabled:cursor-not-allowed disabled:opacity-60"
            title="Fetch definition"
          >
            <BookOpenCheck className="h-4.5 w-4.5" />
          </button>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={onRemove}
            title="Mark as complete"
            className="rounded-full border-2 border-ink-fg bg-paper-bg p-0.5 text-ink-fg opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <CheckCircle2 className="h-5.5 w-5.5" />
          </button>
        ) : null}
      </div>

      <button type="button" onClick={onEdit} className="-mt-0.5 block w-full text-left">
        <div className={`truncate text-[12px] leading-4 ${card.definition ? "text-ink-fg/65" : "italic text-ink-fg/40"}`}>
          {card.definition || "No definition yet"}
        </div>
      </button>
    </article>
  );
}
