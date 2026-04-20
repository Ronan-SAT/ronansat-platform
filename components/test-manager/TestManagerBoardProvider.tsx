"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { API_PATHS } from "@/lib/apiPaths";
import {
  emptyTestManagerBoard,
  normalizeTestManagerBoard,
  TEST_MANAGER_COLUMN_COLOR_KEYS,
  type TestManagerBoardState,
  type TestManagerColumnColorKey,
} from "@/lib/testManagerBoard";

export {
  TEST_MANAGER_COLUMN_COLOR_KEYS,
  type TestManagerBoardState,
  type TestManagerCard,
  type TestManagerColumn,
  type TestManagerColumnColorKey,
} from "@/lib/testManagerBoard";

type TestManagerBoardContextValue = {
  board: TestManagerBoardState;
  hydrated: boolean;
  createColumn: (title: string) => string | null;
  moveCard: (cardId: string, destination: string) => void;
  removeCard: (cardId: string) => void;
  updateColumnTitle: (columnId: string, title: string) => void;
  updateColumnColor: (columnId: string, colorKey: TestManagerColumnColorKey) => void;
  removeColumn: (columnId: string) => void;
  reorderColumns: (draggedColumnId: string, targetColumnId: string, position: "before" | "after") => void;
};

const TestManagerBoardContext = createContext<TestManagerBoardContextValue | null>(null);

async function persistBoardToServer(nextBoard: TestManagerBoardState) {
  const response = await fetch(API_PATHS.TEST_MANAGER_BOARD, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ board: nextBoard }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save test manager board: ${response.status}`);
  }
}

export function TestManagerBoardProvider({ children }: { children: ReactNode }) {
  const idRef = useRef(0);
  const lastPersistedRef = useRef("");
  const [board, setBoard] = useState<TestManagerBoardState>(emptyTestManagerBoard);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadBoard = async () => {
      setHydrated(false);

      try {
        const response = await fetch(API_PATHS.TEST_MANAGER_BOARD, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to load test manager board: ${response.status}`);
        }

        const payload = (await response.json()) as { board?: unknown };
        const nextBoard = normalizeTestManagerBoard(payload.board);

        if (!cancelled) {
          setBoard(nextBoard);
          lastPersistedRef.current = JSON.stringify(nextBoard);
          setHydrated(true);
        }
      } catch (error) {
        console.error("Failed to hydrate test manager board:", error);
        if (!cancelled) {
          setBoard(emptyTestManagerBoard);
          lastPersistedRef.current = JSON.stringify(emptyTestManagerBoard);
          setHydrated(true);
        }
      }
    };

    void loadBoard();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const serializedBoard = JSON.stringify(board);
    if (serializedBoard === lastPersistedRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistBoardToServer(board)
        .then(() => {
          lastPersistedRef.current = serializedBoard;
        })
        .catch((error) => {
          console.error("Failed to persist test manager board:", error);
        });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [board, hydrated]);

  const value = useMemo<TestManagerBoardContextValue>(
    () => ({
      board,
      hydrated,
      createColumn: (title) => {
        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
          return null;
        }

        const columnId = createUniqueId("test-manager-column", idRef);
        setBoard((previous) => ({
          ...previous,
          columns: [
            ...previous.columns,
            {
              id: columnId,
              title: normalizedTitle,
              cardIds: [],
              colorKey: TEST_MANAGER_COLUMN_COLOR_KEYS[previous.columns.length % TEST_MANAGER_COLUMN_COLOR_KEYS.length],
            },
          ],
        }));
        return columnId;
      },
      moveCard: (cardId, destination) => {
        setBoard((previous) => moveCardBetweenBuckets(previous, cardId, destination));
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

  return <TestManagerBoardContext.Provider value={value}>{children}</TestManagerBoardContext.Provider>;
}

export function useTestManagerBoard() {
  const context = useContext(TestManagerBoardContext);
  if (!context) {
    throw new Error("useTestManagerBoard must be used within TestManagerBoardProvider");
  }

  return context;
}

function moveCardBetweenBuckets(board: TestManagerBoardState, cardId: string, destination: string) {
  if (!board.cards[cardId]) {
    return board;
  }

  const nextBoard: TestManagerBoardState = {
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

function createUniqueId(prefix: string, idRef: React.MutableRefObject<number>) {
  idRef.current += 1;
  return `${prefix}-${Date.now()}-${idRef.current}`;
}
