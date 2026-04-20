import { Inbox } from "lucide-react";

import { TestManagerCardTile } from "@/components/test-manager/TestManagerCardTile";
import { type TestManagerCard } from "@/components/test-manager/TestManagerBoardProvider";
import { BoardColumnShell, BoardEmptyState, ColumnHeader } from "@/components/vocab/VocabBoardPrimitives";

type TestManagerInboxColumnProps = {
  hydrated: boolean;
  cards: TestManagerCard[];
  expandedCardIds: Record<string, boolean>;
  onCardDragStart: (cardId: string) => void;
  onDropCard: () => void;
  onToggleExpanded: (cardId: string) => void;
  onResolve: (cardId: string) => void;
};

export function TestManagerInboxColumn({
  hydrated,
  cards,
  expandedCardIds,
  onCardDragStart,
  onDropCard,
  onToggleExpanded,
  onResolve,
}: TestManagerInboxColumnProps) {
  return (
    <BoardColumnShell
      accentClass="bg-paper-bg text-ink-fg"
      shellClass="border-ink-fg bg-surface-white"
      widthClass="w-[375px]"
      eyebrow={null}
      title={<ColumnHeader icon={<Inbox className="h-4 w-4" />} title="Inbox" subtitle={`${cards.length} grouped reports`} hideDefaultMenu />}
      onDrop={onDropCard}
    >
      {!hydrated ? (
        <BoardEmptyState text="Loading..." />
      ) : cards.length === 0 ? (
        <BoardEmptyState text="No active reports." />
      ) : (
        cards.map((card) => (
          <TestManagerCardTile
            key={card.id}
            card={card}
            expanded={!!expandedCardIds[card.id]}
            draggable
            showDetails
            onDragStart={onCardDragStart}
            onToggleExpanded={() => onToggleExpanded(card.id)}
            onResolve={() => onResolve(card.id)}
          />
        ))
      )}
    </BoardColumnShell>
  );
}
