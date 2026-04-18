export const VOCAB_COLUMN_COLOR_KEYS = ["sky", "mint", "lavender", "peach", "sand"] as const;
export const DEFAULT_VOCAB_COLUMN_COLOR_KEYS = VOCAB_COLUMN_COLOR_KEYS.filter((colorKey) => colorKey !== "sand");
export const MAX_VOCAB_DEFINITION_LENGTH = 500;

export type VocabColumnColorKey = (typeof VOCAB_COLUMN_COLOR_KEYS)[number];

export type VocabCard = {
  id: string;
  term: string;
  definition: string;
  audioUrl?: string;
  createdAt: string;
  sourceQuestionId?: string;
};

export type VocabColumn = {
  id: string;
  title: string;
  cardIds: string[];
  colorKey: VocabColumnColorKey;
};

export type VocabBoardState = {
  inboxIds: string[];
  columns: VocabColumn[];
  cards: Record<string, VocabCard>;
};

export type AddVocabCardResult = {
  board: VocabBoardState;
  added: boolean;
  changed: boolean;
};

export const emptyVocabBoard: VocabBoardState = {
  inboxIds: [],
  columns: [],
  cards: {},
};

export function normalizeVocabBoard(raw: unknown): VocabBoardState {
  if (!raw || typeof raw !== "object") {
    return emptyVocabBoard;
  }

  const maybeBoard = raw as Partial<VocabBoardState>;
  const cardIdMap = new Map<string, string>();
  const usedCardIds = new Set<string>();
  const cardsEntries = maybeBoard.cards && typeof maybeBoard.cards === "object" ? Object.entries(maybeBoard.cards) : [];
  const normalizedCards: Record<string, VocabCard> = {};

  cardsEntries.forEach(([entryKey, rawCard], index) => {
    const value = rawCard as Partial<VocabCard> | undefined;
    const rawId = isString(value?.id) ? value.id : entryKey;
    const parsedLegacyCard = parseVocabCardValue(value);
    if (!isString(rawId) || !parsedLegacyCard || !isString(value?.createdAt)) {
      return;
    }

    const nextId = makeStableUniqueId(rawId, usedCardIds, "vocab", index);
    cardIdMap.set(entryKey, nextId);
    cardIdMap.set(rawId, nextId);
    normalizedCards[nextId] = {
      id: nextId,
      term: parsedLegacyCard.term,
      definition: parsedLegacyCard.definition,
      audioUrl: parsedLegacyCard.audioUrl,
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
            colorKey: isColorKey(column.colorKey) ? column.colorKey : DEFAULT_VOCAB_COLUMN_COLOR_KEYS[index % DEFAULT_VOCAB_COLUMN_COLOR_KEYS.length],
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

export function isVocabBoardEmpty(board: VocabBoardState) {
  return board.inboxIds.length === 0 && board.columns.length === 0 && Object.keys(board.cards).length === 0;
}

export function addVocabCardToBoard(
  board: VocabBoardState,
  text: string,
  options?: {
    sourceQuestionId?: string;
    destination?: string;
    idFactory?: () => string;
    createdAt?: string;
  },
): AddVocabCardResult {
  const normalizedText = normalizeVocabText(text);
  if (!normalizedText) {
    return {
      board,
      added: false,
      changed: false,
    };
  }

  const destination = options?.destination ?? "inbox";
  const duplicateId = findDuplicateVocabCardId(board, normalizedText);
  if (duplicateId) {
    const nextBoard = moveVocabCardBetweenBuckets(board, duplicateId, destination);
    return {
      board: nextBoard,
      added: false,
      changed: nextBoard !== board,
    };
  }

  const id = options?.idFactory?.() ?? `vocab-${Date.now()}`;
  const nextBoard: VocabBoardState = {
    ...board,
    cards: {
      ...board.cards,
      [id]: {
        id,
        term: normalizedText,
        definition: "",
        createdAt: options?.createdAt ?? new Date().toISOString(),
        sourceQuestionId: options?.sourceQuestionId,
      },
    },
    inboxIds: [...board.inboxIds, id],
    columns: board.columns,
  };

  return {
    board: moveVocabCardBetweenBuckets(nextBoard, id, destination),
    added: true,
    changed: true,
  };
}

export function moveVocabCardBetweenBuckets(board: VocabBoardState, cardId: string, destination: string) {
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
    if (nextBoard.inboxIds.includes(cardId)) {
      return board;
    }

    return {
      ...nextBoard,
      inboxIds: [...nextBoard.inboxIds, cardId],
    };
  }

  const destinationColumn = nextBoard.columns.find((column) => column.id === destination);
  if (!destinationColumn) {
    return board;
  }

  if (destinationColumn.cardIds.includes(cardId)) {
    return board;
  }

  return {
    ...nextBoard,
    columns: nextBoard.columns.map((column) =>
      column.id === destination ? { ...column, cardIds: [...column.cardIds, cardId] } : column,
    ),
  };
}

export function findDuplicateVocabCardId(board: VocabBoardState, normalizedText: string) {
  return Object.values(board.cards).find((card) => normalizeVocabText(card.term).toLowerCase() === normalizedText.toLowerCase())?.id;
}

export function normalizeVocabText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function parseVocabCardValue(value: Partial<VocabCard> | undefined) {
  if (!value) {
    return null;
  }

  if (isString(value.term)) {
    const term = normalizeVocabField(value.term);
    if (!term) {
      return null;
    }

    return {
      term,
      definition: isString(value.definition) ? normalizeVocabDefinition(value.definition) : "",
      audioUrl: isString(value.audioUrl) ? value.audioUrl.trim() : undefined,
    };
  }

  const legacyText = "text" in value && isString((value as { text?: unknown }).text) ? (value as { text: string }).text : null;
  if (!legacyText) {
    return null;
  }

  return parseLegacyVocabText(legacyText);
}

function parseLegacyVocabText(text: string) {
  const normalized = normalizeVocabField(text);
  if (!normalized) {
    return null;
  }

  const separatorMatch = normalized.match(/\s*[:\uFF1A]\s*/);
  if (!separatorMatch || separatorMatch.index === undefined) {
    return {
      term: normalized,
      definition: "",
      audioUrl: undefined,
    };
  }

  const separatorStart = separatorMatch.index;
  const separatorEnd = separatorStart + separatorMatch[0].length;

  return {
    term: normalizeVocabField(normalized.slice(0, separatorStart)) || normalized,
    definition: normalizeVocabDefinition(normalized.slice(separatorEnd)),
    audioUrl: undefined,
  };
}

function normalizeVocabField(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeVocabDefinition(value: string) {
  return normalizeVocabField(value).slice(0, MAX_VOCAB_DEFINITION_LENGTH);
}

function isColorKey(value: unknown): value is VocabColumnColorKey {
  return typeof value === "string" && VOCAB_COLUMN_COLOR_KEYS.includes(value as VocabColumnColorKey);
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
