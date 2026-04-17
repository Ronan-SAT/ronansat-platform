"use client";

import { createElement, useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import { API_PATHS } from "@/lib/apiPaths";
import toast from "react-hot-toast";
import {
  useVocabBoard,
  type VocabCard,
  type VocabColumn,
  type VocabColumnColorKey,
} from "@/components/vocab/VocabBoardProvider";
import { parseDraftToCardFields, parseFlashCard } from "@/components/vocab/flashCardUtils";
import type { DropIndicatorState, FlashCardModalState } from "@/components/vocab/vocabPage.types";

type DictionaryLookupState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
};

function isVocabCard(card: VocabCard | undefined): card is VocabCard {
  return Boolean(card);
}

function shuffleCards(cards: VocabCard[]) {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function useVocabPageController() {
  const {
    board,
    hydrated,
    addVocabCard,
    createColumn,
    moveCard,
    removeCard,
    updateCard,
    updateColumnTitle,
    updateColumnColor,
    removeColumn,
    reorderColumns,
  } = useVocabBoard();

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [draftByBucket, setDraftByBucket] = useState<Record<string, string>>({});
  const [openComposerByBucket, setOpenComposerByBucket] = useState<Record<string, boolean>>({});
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardTerm, setEditingCardTerm] = useState("");
  const [editingCardDefinition, setEditingCardDefinition] = useState("");
  const [editingCardAudioUrl, setEditingCardAudioUrl] = useState<string | undefined>(undefined);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null);
  const [flashCardModal, setFlashCardModal] = useState<FlashCardModalState | null>(null);
  const [flashCardIndex, setFlashCardIndex] = useState(0);
  const [isFlashCardAnswerVisible, setIsFlashCardAnswerVisible] = useState(false);
  const [dictionaryLookupByCardId, setDictionaryLookupByCardId] = useState<Record<string, DictionaryLookupState>>({});

  const menuRef = useRef<HTMLDivElement | null>(null);
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const dragClientXRef = useRef<number | null>(null);

  const inboxCards = useMemo(() => board.inboxIds.map((id) => board.cards[id]).filter(isVocabCard), [board.cards, board.inboxIds]);

  useEffect(() => {
    if (!openMenuColumnId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) {
        return;
      }

      setOpenMenuColumnId(null);
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [openMenuColumnId]);

  useEffect(() => {
    if (!flashCardModal) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFlashCardModal(null);
        return;
      }

      if (event.key === "ArrowRight") {
        setFlashCardIndex((current) => {
          const nextIndex = Math.min(current + 1, flashCardModal.cards.length - 1);
          if (nextIndex !== current) {
            setIsFlashCardAnswerVisible(false);
          }

          return nextIndex;
        });
      }

      if (event.key === "ArrowLeft") {
        setFlashCardIndex((current) => {
          const nextIndex = Math.max(current - 1, 0);
          if (nextIndex !== current) {
            setIsFlashCardAnswerVisible(false);
          }

          return nextIndex;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flashCardModal]);

  useEffect(() => {
    if (!draggingColumnId) {
      return;
    }

    let frameId = 0;
    const tick = () => {
      const container = boardScrollRef.current;
      const clientX = dragClientXRef.current;
      if (container && clientX !== null) {
        const rect = container.getBoundingClientRect();
        const threshold = 72;
        const maxSpeed = 18;

        if (clientX < rect.left + threshold) {
          const strength = 1 - Math.max(0, clientX - rect.left) / threshold;
          container.scrollLeft -= Math.ceil(maxSpeed * strength);
        } else if (clientX > rect.right - threshold) {
          const strength = 1 - Math.max(0, rect.right - clientX) / threshold;
          container.scrollLeft += Math.ceil(maxSpeed * strength);
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [draggingColumnId]);

  useEffect(() => {
    if (!draggingColumnId) {
      return;
    }

    const cleanup = () => {
      window.setTimeout(() => {
        setDraggingColumnId(null);
        setDropIndicator(null);
        dragClientXRef.current = null;
        if (dragPreviewRef.current) {
          dragPreviewRef.current.remove();
          dragPreviewRef.current = null;
        }
      }, 0);
    };

    window.addEventListener("dragend", cleanup);
    window.addEventListener("drop", cleanup);

    return () => {
      window.removeEventListener("dragend", cleanup);
      window.removeEventListener("drop", cleanup);
    };
  }, [draggingColumnId]);

  const resetBucketComposer = (bucketId: string) => {
    setDraftByBucket((previous) => ({ ...previous, [bucketId]: "" }));
    setOpenComposerByBucket((previous) => ({ ...previous, [bucketId]: false }));
  };

  const handleCreateColumn = () => {
    const createdId = createColumn(newColumnTitle);
    if (!createdId) {
      return;
    }

    setIsAddingColumn(false);
    setNewColumnTitle("");
  };

  const cancelCreateColumn = () => {
    setNewColumnTitle("");
    setIsAddingColumn(false);
  };

  const openBucketComposer = (bucketId: string) => {
    setOpenComposerByBucket((previous) => ({ ...previous, [bucketId]: true }));
  };

  const handleAddCard = (destination: string) => {
    const text = draftByBucket[destination] ?? "";
    const parsedDraft = parseDraftToCardFields(text);
    const normalizedTerm = parsedDraft.term.trim();
    const normalizedDefinition = parsedDraft.definition.trim();
    const cardId = addVocabCard(text, undefined, destination);
    if (!cardId) {
      return;
    }

    resetBucketComposer(destination);

    if (normalizedTerm) {
      void fetchDictionaryDataForCard(cardId, normalizedTerm, normalizedDefinition);
    }
  };

  const startEditCard = (card: VocabCard) => {
    setEditingCardId(card.id);
    setEditingCardTerm(card.term);
    setEditingCardDefinition(card.definition);
    setEditingCardAudioUrl(card.audioUrl);
  };

  const saveCardEdit = () => {
    if (!editingCardId) {
      return;
    }

    updateCard(editingCardId, {
      term: editingCardTerm,
      definition: editingCardDefinition,
      audioUrl: editingCardAudioUrl,
    });
    setEditingCardId(null);
    setEditingCardTerm("");
    setEditingCardDefinition("");
    setEditingCardAudioUrl(undefined);
  };

  const cancelCardEdit = () => {
    setEditingCardId(null);
    setEditingCardTerm("");
    setEditingCardDefinition("");
    setEditingCardAudioUrl(undefined);
  };

  const fetchDefinitionForCard = async (card: VocabCard) => {
    const activeTerm = editingCardId === card.id ? editingCardTerm : card.term;
    const normalizedTerm = activeTerm.trim();
    if (!normalizedTerm) {
      setDictionaryLookupByCardId((previous) => ({
        ...previous,
        [card.id]: {
          status: "error",
          message: "Add a word first.",
        },
      }));
      return;
    }

    await fetchDictionaryDataForCard(card.id, normalizedTerm, editingCardId === card.id ? editingCardDefinition.trim() : card.definition);
  };

  const fetchDictionaryDataForCard = async (cardId: string, normalizedTerm: string, existingDefinition = "") => {
    const currentCard = board.cards[cardId];
    const preservedDefinition = existingDefinition.trim() || currentCard?.definition || "";

    setDictionaryLookupByCardId((previous) => ({
      ...previous,
      [cardId]: {
        status: "loading",
        message: "Fetching definition...",
      },
    }));
    const loadingToastId = toast.loading(`Fetching definition for ${normalizedTerm}...`);

    try {
      const response = await fetch(`${API_PATHS.VOCAB_DICTIONARY}?term=${encodeURIComponent(normalizedTerm)}`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as { definition?: string; audioUrl?: string; error?: string };
      if (!response.ok || !payload.definition) {
        throw new Error(payload.error || "Definition not found");
      }

      const nextDefinition = preservedDefinition || payload.definition || "";

      if (editingCardId === cardId) {
        setEditingCardDefinition(nextDefinition);
        setEditingCardAudioUrl(payload.audioUrl);
      } else {
        updateCard(cardId, {
          term: normalizedTerm,
          definition: nextDefinition,
          audioUrl: payload.audioUrl,
        });
      }

      setDictionaryLookupByCardId((previous) => ({
        ...previous,
        [cardId]: {
          status: "success",
          message: payload.definition && payload.audioUrl ? "Definition and audio added." : payload.definition ? "Definition added." : "Audio added.",
        },
      }));
      if (payload.definition) {
        const toastTitle = payload.audioUrl ? "Definition and audio added." : "Definition added.";
        toast.success(
          createElement(
            "div",
            { className: "min-w-0" },
            createElement("div", { className: "text-[13px] font-black" }, toastTitle),
            createElement(
              "div",
              {
                className: "mt-1 overflow-hidden whitespace-pre-wrap break-words text-[12px] font-medium leading-5 text-ink-fg/80",
                style: {
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                },
              },
              payload.definition,
            ),
          ),
          { id: loadingToastId, duration: 3600 },
        );
      } else {
        toast.success(`Audio added for ${normalizedTerm}.`, { id: loadingToastId });
      }
    } catch (error) {
      setDictionaryLookupByCardId((previous) => ({
        ...previous,
        [cardId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Definition not found",
        },
      }));
      const errorMessage = error instanceof Error ? error.message : "Definition not found";
      toast.error(errorMessage, { id: loadingToastId });
    }
  };

  const startEditColumn = (column: VocabColumn) => {
    setEditingColumnId(column.id);
    setEditingColumnTitle(column.title);
    setOpenMenuColumnId(null);
  };

  const saveColumnEdit = () => {
    if (!editingColumnId) {
      return;
    }

    updateColumnTitle(editingColumnId, editingColumnTitle);
    setEditingColumnId(null);
    setEditingColumnTitle("");
  };

  const cancelColumnEdit = () => {
    setEditingColumnId(null);
    setEditingColumnTitle("");
  };

  const toggleColumnMenu = (columnId: string) => {
    setOpenMenuColumnId((current) => (current === columnId ? null : columnId));
  };

  const openCollectionPractice = (collectionId: string) => {
    const selectedCards =
      collectionId === "inbox"
        ? inboxCards
        : board.columns.find((column) => column.id === collectionId)?.cardIds.map((cardId) => board.cards[cardId]).filter(isVocabCard) ?? [];

    if (selectedCards.length === 0) {
      return;
    }

    const shuffledCards = shuffleCards(selectedCards);

    const title = collectionId === "inbox" ? "Practice Inbox" : `Practice ${board.columns.find((column) => column.id === collectionId)?.title ?? "Collection"}`;

    setFlashCardModal({
      columnId: collectionId,
      title,
      cards: shuffledCards,
    });
    setFlashCardIndex(0);
    setIsFlashCardAnswerVisible(false);
  };

  const showPreviousFlashCard = () => {
    setFlashCardIndex((current) => Math.max(current - 1, 0));
    setIsFlashCardAnswerVisible(false);
  };

  const showNextFlashCard = () => {
    if (!flashCardModal) {
      return;
    }

    setFlashCardIndex((current) => Math.min(current + 1, flashCardModal.cards.length - 1));
    setIsFlashCardAnswerVisible(false);
  };

  const updateBucketDraft = (bucketId: string, value: string) => {
    setDraftByBucket((previous) => ({ ...previous, [bucketId]: value }));
  };

  const handleChangeColumnColor = (columnId: string, colorKey: VocabColumnColorKey) => {
    updateColumnColor(columnId, colorKey);
    setOpenMenuColumnId(null);
  };

  const handleRemoveColumn = (columnId: string) => {
    removeColumn(columnId);
    setOpenMenuColumnId(null);
  };

  const handleDropCardToBucket = (destination: string) => {
    if (draggingCardId) {
      moveCard(draggingCardId, destination);
    }
  };

  const handleColumnDragStart = (event: DragEvent, columnId: string) => {
    const shell = (event.currentTarget as HTMLElement).closest("[data-column-shell]") as HTMLElement | null;
    if (!shell) {
      return;
    }

    setDraggingColumnId(columnId);
    dragClientXRef.current = event.clientX;

    const preview = shell.cloneNode(true) as HTMLElement;
    preview.style.position = "fixed";
    preview.style.top = "-10000px";
    preview.style.left = "-10000px";
    preview.style.width = `${shell.offsetWidth}px`;
    preview.style.pointerEvents = "none";
    preview.style.transform = "rotate(5deg)";
    preview.style.opacity = "0.9";
    preview.style.filter = "saturate(0.92)";
    preview.style.boxShadow = "0 28px 60px rgba(15, 23, 42, 0.28)";
    preview.style.zIndex = "9999";
    document.body.appendChild(preview);
    dragPreviewRef.current = preview;

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", columnId);
    event.dataTransfer.setDragImage(preview, 90, 36);
  };

  const clearColumnDragState = () => {
    setDraggingColumnId(null);
    setDropIndicator(null);
    dragClientXRef.current = null;
    if (dragPreviewRef.current) {
      dragPreviewRef.current.remove();
      dragPreviewRef.current = null;
    }
  };

  const handleColumnDragOver = (event: DragEvent, columnId: string) => {
    if (!draggingColumnId || draggingColumnId === columnId) {
      return;
    }

    event.preventDefault();
    dragClientXRef.current = event.clientX;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
    setDropIndicator({ columnId, position });
  };

  const handleColumnDrop = (columnId: string) => {
    if (!draggingColumnId || draggingColumnId === columnId || !dropIndicator) {
      clearColumnDragState();
      return;
    }

    reorderColumns(draggingColumnId, columnId, dropIndicator.position);
    clearColumnDragState();
  };

  const handleBoardDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (draggingColumnId) {
      event.preventDefault();
      dragClientXRef.current = event.clientX;
    }
  };

  const handleBoardDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingColumnId || !dropIndicator) {
      return;
    }

    event.preventDefault();
    handleColumnDrop(dropIndicator.columnId);
  };

  const activeFlashCard = flashCardModal?.cards[flashCardIndex] ?? null;
  const activeFlashCardContent = activeFlashCard ? parseFlashCard(activeFlashCard) : null;

  return {
    board,
    hydrated,
    inboxCards,
    draggingCardId,
    draggingColumnId,
    dropIndicator,
    isAddingColumn,
    newColumnTitle,
    draftByBucket,
    openComposerByBucket,
    editingCardId,
    editingCardTerm,
    editingCardDefinition,
    editingColumnId,
    editingColumnTitle,
    openMenuColumnId,
    flashCardModal,
    flashCardIndex,
    isFlashCardAnswerVisible,
    dictionaryLookupByCardId,
    activeFlashCard,
    activeFlashCardContent,
    menuRef,
    boardScrollRef,
    setDraggingCardId,
    setEditingCardTerm,
    setEditingCardDefinition,
    setEditingColumnTitle,
    setIsAddingColumn,
    setNewColumnTitle,
    updateBucketDraft,
    openBucketComposer,
    resetBucketComposer,
    handleCreateColumn,
    cancelCreateColumn,
    handleAddCard,
    startEditCard,
    saveCardEdit,
    cancelCardEdit,
    fetchDefinitionForCard,
    startEditColumn,
    saveColumnEdit,
    cancelColumnEdit,
    toggleColumnMenu,
    openCollectionPractice,
    showPreviousFlashCard,
    showNextFlashCard,
    setIsFlashCardAnswerVisible,
    setFlashCardModal,
    handleChangeColumnColor,
    handleRemoveColumn,
    handleDropCardToBucket,
    handleColumnDragStart,
    clearColumnDragState,
    handleColumnDragOver,
    handleColumnDrop,
    handleBoardDragOver,
    handleBoardDrop,
    removeCard,
  };
}
