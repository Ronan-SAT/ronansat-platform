"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";

export const VOCAB_COLUMN_COLOR_KEYS = ["sky", "mint", "lavender", "peach", "sand"] as const;
export type VocabColumnColorKey = (typeof VOCAB_COLUMN_COLOR_KEYS)[number];

export type VocabCard = {
  id: string;
  text: string;
  createdAt: string;
  sourceQuestionId?: string;
};

export type VocabColumn = {
  id: string;
  title: string;
  cardIds: string[];
  colorKey: VocabColumnColorKey;
};

type VocabBoardState = {
  inboxIds: string[];
  columns: VocabColumn[];
  cards: Record<string, VocabCard>;
};

type VocabBoardContextValue = {
  board: VocabBoardState;
  hydrated: boolean;
  addVocabCard: (text: string, sourceQuestionId?: string, destination?: string) => boolean;
  createColumn: (title: string) => string | null;
  moveCard: (cardId: string, destination: string) => void;
  updateCardText: (cardId: string, text: string) => void;
  removeCard: (cardId: string) => void;
  updateColumnTitle: (columnId: string, title: string) => void;
  updateColumnColor: (columnId: string, colorKey: VocabColumnColorKey) => void;
  removeColumn: (columnId: string) => void;
  reorderColumns: (draggedColumnId: string, targetColumnId: string, position: "before" | "after") => void;
};

const emptyBoard: VocabBoardState = {
  inboxIds: [],
  columns: [],
  cards: {},
};

const VocabBoardContext = createContext<VocabBoardContextValue | null>(null);

export function VocabBoardProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const idRef = useRef(0);
  const [board, setBoard] = useState<VocabBoardState>(emptyBoard);
  const [hydrated, setHydrated] = useState(false);

  const storageKey = useMemo(() => {
    const userKey = session?.user?.email || session?.user?.id || "guest";
    return `ronan-sat-vocab-board:${userKey}`;
  }, [session?.user?.email, session?.user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      setBoard(raw ? normalizeBoard(JSON.parse(raw)) : emptyBoard);
    } catch {
      setBoard(emptyBoard);
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(board));
  }, [board, hydrated, storageKey]);

  const value = useMemo<VocabBoardContextValue>(
    () => ({
      board,
      hydrated,
      addVocabCard: (text, sourceQuestionId, destination = "inbox") => {
        const normalizedText = normalizeText(text);
        if (!normalizedText) {
          return false;
        }

        let added = false;

        setBoard((previous) => {
          const duplicateId = findDuplicateCardId(previous, normalizedText);
          if (duplicateId) {
            return moveCardBetweenBuckets(previous, duplicateId, destination);
          }

          const id = createUniqueId("vocab", idRef);
          const nextBoard: VocabBoardState = {
            ...previous,
            cards: {
              ...previous.cards,
              [id]: {
                id,
                text: normalizedText,
                createdAt: new Date().toISOString(),
                sourceQuestionId,
              },
            },
            inboxIds: previous.inboxIds,
            columns: previous.columns,
          };

          added = true;
          return moveCardBetweenBuckets(
            {
              ...nextBoard,
              inboxIds: [...previous.inboxIds, id],
            },
            id,
            destination,
          );
        });

        return added;
      },
      createColumn: (title) => {
        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
          return null;
        }

        const columnId = createUniqueId("column", idRef);
        setBoard((previous) => ({
          ...previous,
          columns: [
            ...previous.columns,
            {
              id: columnId,
              title: normalizedTitle,
              cardIds: [],
              colorKey: VOCAB_COLUMN_COLOR_KEYS[previous.columns.length % VOCAB_COLUMN_COLOR_KEYS.length],
            },
          ],
        }));
        return columnId;
      },
      moveCard: (cardId, destination) => {
        setBoard((previous) => moveCardBetweenBuckets(previous, cardId, destination));
      },
      updateCardText: (cardId, text) => {
        const normalizedText = normalizeText(text);
        if (!normalizedText) {
          return;
        }

        setBoard((previous) => {
          const card = previous.cards[cardId];
          if (!card) {
            return previous;
          }

          return {
            ...previous,
            cards: {
              ...previous.cards,
              [cardId]: {
                ...card,
                text: normalizedText,
              },
            },
          };
        });
      },
      removeCard: (cardId) => {
        setBoard((previous) => {
          if (!previous.cards[cardId]) {
            return previous;
          }

          const nextCards = { ...previous.cards };
          delete nextCards[cardId];

          return {
            ...previous,
            cards: nextCards,
            inboxIds: previous.inboxIds.filter((id) => id !== cardId),
            columns: previous.columns.map((column) => ({
              ...column,
              cardIds: column.cardIds.filter((id) => id !== cardId),
            })),
          };
        });
      },
      updateColumnTitle: (columnId, title) => {
        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
          return;
        }

        setBoard((previous) => ({
          ...previous,
          columns: previous.columns.map((column) =>
            column.id === columnId ? { ...column, title: normalizedTitle } : column,
          ),
        }));
      },
      updateColumnColor: (columnId, colorKey) => {
        setBoard((previous) => ({
          ...previous,
          columns: previous.columns.map((column) =>
            column.id === columnId ? { ...column, colorKey } : column,
          ),
        }));
      },
      removeColumn: (columnId) => {
        setBoard((previous) => {
          const targetColumn = previous.columns.find((column) => column.id === columnId);
          if (!targetColumn) {
            return previous;
          }

          const movedInboxIds = [...previous.inboxIds, ...targetColumn.cardIds.filter((id) => !previous.inboxIds.includes(id))];

          return {
            ...previous,
            inboxIds: movedInboxIds,
            columns: previous.columns.filter((column) => column.id !== columnId),
          };
        });
      },
      reorderColumns: (draggedColumnId, targetColumnId, position) => {
        if (draggedColumnId === targetColumnId) {
          return;
        }

        setBoard((previous) => {
          const draggedIndex = previous.columns.findIndex((column) => column.id === draggedColumnId);
          const targetIndex = previous.columns.findIndex((column) => column.id === targetColumnId);

          if (draggedIndex === -1 || targetIndex === -1) {
            return previous;
          }

          const nextColumns = [...previous.columns];
          const [draggedColumn] = nextColumns.splice(draggedIndex, 1);
          const adjustedTargetIndex = nextColumns.findIndex((column) => column.id === targetColumnId);
          const insertionIndex = position === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1;
          nextColumns.splice(insertionIndex, 0, draggedColumn);

          return {
            ...previous,
            columns: nextColumns,
          };
        });
      },
    }),
    [board, hydrated],
  );

  return <VocabBoardContext.Provider value={value}>{children}</VocabBoardContext.Provider>;
}

export function useVocabBoard() {
  const context = useContext(VocabBoardContext);
  if (!context) {
    throw new Error("useVocabBoard must be used within VocabBoardProvider");
  }

  return context;
}

function normalizeBoard(raw: unknown): VocabBoardState {
  if (!raw || typeof raw !== "object") {
    return emptyBoard;
  }

  const maybeBoard = raw as Partial<VocabBoardState>;
  const cardIdMap = new Map<string, string>();
  const usedCardIds = new Set<string>();
  const cardsEntries = maybeBoard.cards && typeof maybeBoard.cards === "object" ? Object.entries(maybeBoard.cards) : [];
  const normalizedCards: Record<string, VocabCard> = {};

  cardsEntries.forEach(([entryKey, rawCard], index) => {
    const value = rawCard as Partial<VocabCard> | undefined;
    const rawId = isString(value?.id) ? value.id : entryKey;
    if (!isString(rawId) || !isString(value?.text) || !isString(value?.createdAt)) {
      return;
    }

    const nextId = makeStableUniqueId(rawId, usedCardIds, "vocab", index);
    cardIdMap.set(entryKey, nextId);
    cardIdMap.set(rawId, nextId);
    normalizedCards[nextId] = {
      id: nextId,
      text: value.text,
      createdAt: value.createdAt,
      sourceQuestionId: isString(value.sourceQuestionId) ? value.sourceQuestionId : undefined,
    };
  });

  const usedColumnIds = new Set<string>();
  const normalizedColumns = Array.isArray(maybeBoard.columns)
    ? maybeBoard.columns
        .filter((column): column is VocabColumn => Boolean(column && typeof column === "object"))
        .map((column, index) => {
          const rawId = isString(column.id) ? column.id : `column-restored-${index}`;
          const nextId = makeStableUniqueId(rawId, usedColumnIds, "column", index);
          const remappedCardIds = Array.isArray(column.cardIds)
            ? column.cardIds
                .filter(isString)
                .map((cardId) => cardIdMap.get(cardId) ?? null)
                .filter((cardId): cardId is string => typeof cardId === "string" && Boolean(normalizedCards[cardId]))
            : [];

          return {
            id: nextId,
            title: isString(column.title) ? column.title : "Untitled",
            cardIds: Array.from(new Set(remappedCardIds)),
            colorKey: isColorKey(column.colorKey) ? column.colorKey : VOCAB_COLUMN_COLOR_KEYS[index % VOCAB_COLUMN_COLOR_KEYS.length],
          };
        })
    : [];

  const normalizedInboxIds = Array.isArray(maybeBoard.inboxIds)
    ? Array.from(
        new Set(
          maybeBoard.inboxIds
            .filter(isString)
            .map((cardId) => cardIdMap.get(cardId) ?? null)
            .filter((cardId): cardId is string => typeof cardId === "string" && Boolean(normalizedCards[cardId])),
        ),
      )
    : [];

  return {
    inboxIds: normalizedInboxIds,
    columns: normalizedColumns,
    cards: normalizedCards,
  };
}

function moveCardBetweenBuckets(board: VocabBoardState, cardId: string, destination: string) {
  if (!board.cards[cardId]) {
    return board;
  }

  const nextBoard: VocabBoardState = {
    ...board,
    inboxIds: board.inboxIds.filter((id) => id !== cardId),
    columns: board.columns.map((column) => ({
      ...column,
      cardIds: column.cardIds.filter((id) => id !== cardId),
    })),
  };

  if (destination === "inbox") {
    return {
      ...nextBoard,
      inboxIds: [...nextBoard.inboxIds, cardId],
    };
  }

  return {
    ...nextBoard,
    columns: nextBoard.columns.map((column) =>
      column.id === destination ? { ...column, cardIds: [...column.cardIds, cardId] } : column,
    ),
  };
}

function findDuplicateCardId(board: VocabBoardState, normalizedText: string) {
  return Object.values(board.cards).find((card) => normalizeText(card.text).toLowerCase() === normalizedText.toLowerCase())?.id;
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isColorKey(value: unknown): value is VocabColumnColorKey {
  return typeof value === "string" && VOCAB_COLUMN_COLOR_KEYS.includes(value as VocabColumnColorKey);
}

function createUniqueId(prefix: string, idRef: React.MutableRefObject<number>) {
  idRef.current += 1;
  return `${prefix}-${Date.now()}-${idRef.current}`;
}

function makeStableUniqueId(baseId: string, usedIds: Set<string>, prefix: string, index: number) {
  const candidate = baseId.trim().length > 0 ? baseId : `${prefix}-restored-${index}`;
  if (!usedIds.has(candidate)) {
    usedIds.add(candidate);
    return candidate;
  }

  let suffix = 1;
  while (usedIds.has(`${candidate}-restored-${suffix}`)) {
    suffix += 1;
  }

  const uniqueId = `${candidate}-restored-${suffix}`;
  usedIds.add(uniqueId);
  return uniqueId;
}
