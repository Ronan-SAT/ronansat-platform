export const TEST_MANAGER_COLUMN_COLOR_KEYS = ["sky", "mint", "lavender", "peach", "sand"] as const;

export type TestManagerColumnColorKey = (typeof TEST_MANAGER_COLUMN_COLOR_KEYS)[number];

export type TestManagerReportEntry = {
  id: string;
  reporterId?: string;
  reporterName?: string;
  reporterEmail?: string;
  errorType: "Question" | "Answers" | "Missing Graph/Image";
  note?: string;
  source: "test" | "review";
  createdAt: string;
};

export type TestManagerCard = {
  id: string;
  text: string;
  createdAt: string;
  testId: string;
  questionId: string;
  testTitle: string;
  section: string;
  module: number;
  questionNumber: number;
  reportCount: number;
  reports: TestManagerReportEntry[];
};

export type TestManagerColumn = {
  id: string;
  title: string;
  cardIds: string[];
  colorKey: TestManagerColumnColorKey;
};

export type TestManagerBoardState = {
  inboxIds: string[];
  columns: TestManagerColumn[];
  cards: Record<string, TestManagerCard>;
};

export const emptyTestManagerBoard: TestManagerBoardState = {
  inboxIds: [],
  columns: [],
  cards: {},
};

export function normalizeTestManagerBoard(raw: unknown): TestManagerBoardState {
  if (!raw || typeof raw !== "object") {
    return emptyTestManagerBoard;
  }

  const maybeBoard = raw as Partial<TestManagerBoardState>;
  const cardIdMap = new Map<string, string>();
  const usedCardIds = new Set<string>();
  const cardsEntries = maybeBoard.cards && typeof maybeBoard.cards === "object" ? Object.entries(maybeBoard.cards) : [];
  const normalizedCards: Record<string, TestManagerCard> = {};

  cardsEntries.forEach(([entryKey, rawCard], index) => {
    const value = rawCard as Partial<TestManagerCard> | undefined;
    const rawId = isString(value?.id) ? value.id : entryKey;

    if (
      !isString(rawId) ||
      !isString(value?.text) ||
      !isString(value?.createdAt) ||
      !isString(value?.testId) ||
      !isString(value?.questionId) ||
      !isString(value?.testTitle) ||
      !isString(value?.section) ||
      typeof value?.module !== "number" ||
      typeof value?.questionNumber !== "number"
    ) {
      return;
    }

    const nextId = makeStableUniqueId(rawId, usedCardIds, "test-manager", index);
    const reports = Array.isArray(value.reports)
      ? value.reports
          .filter((report) => Boolean(report && typeof report === "object"))
          .map((report, reportIndex) => ({
            id: isString(report.id) ? report.id : `${nextId}-report-${reportIndex + 1}`,
            reporterId: isString(report.reporterId) ? report.reporterId : undefined,
            reporterName: isString(report.reporterName) ? report.reporterName : undefined,
            reporterEmail: isString(report.reporterEmail) ? report.reporterEmail : undefined,
            errorType: (
              report.errorType === "Answers"
                ? "Answers"
                : report.errorType === "Missing Graph/Image"
                  ? "Missing Graph/Image"
                  : "Question"
            ) as TestManagerReportEntry["errorType"],
            note: isString(report.note) ? report.note : undefined,
            source: (report.source === "review" ? "review" : "test") as TestManagerReportEntry["source"],
            createdAt: isString(report.createdAt) ? report.createdAt : (value.createdAt as string),
          }))
      : [];

    cardIdMap.set(entryKey, nextId);
    cardIdMap.set(rawId, nextId);
    normalizedCards[nextId] = {
      id: nextId,
      text: value.text,
      createdAt: value.createdAt,
      testId: value.testId,
      questionId: value.questionId,
      testTitle: value.testTitle,
      section: value.section,
      module: value.module,
      questionNumber: value.questionNumber,
      reportCount: typeof value.reportCount === "number" ? value.reportCount : reports.length,
      reports,
    };
  });

  const usedColumnIds = new Set<string>();
  const normalizedColumns = Array.isArray(maybeBoard.columns)
    ? maybeBoard.columns
        .filter((column): column is TestManagerColumn => Boolean(column && typeof column === "object"))
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
            colorKey: isColorKey(column.colorKey) ? column.colorKey : TEST_MANAGER_COLUMN_COLOR_KEYS[index % TEST_MANAGER_COLUMN_COLOR_KEYS.length],
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

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isColorKey(value: unknown): value is TestManagerColumnColorKey {
  return typeof value === "string" && TEST_MANAGER_COLUMN_COLOR_KEYS.includes(value as TestManagerColumnColorKey);
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
