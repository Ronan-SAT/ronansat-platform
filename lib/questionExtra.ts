export type QuestionExtraType = "table" | "figure_math" | "figure_chart" | "figure_other";

export type QuestionExtra = {
  type: QuestionExtraType;
  content: unknown;
};

export type ParsedQuestionExtraTable = {
  title: string | null;
  headers: string[];
  rows: string[][];
};

const QUESTION_EXTRA_TYPES: QuestionExtraType[] = ["table", "figure_math", "figure_chart", "figure_other"];

function isQuestionExtraType(value: unknown): value is QuestionExtraType {
  return typeof value === "string" && QUESTION_EXTRA_TYPES.includes(value as QuestionExtraType);
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvTable(value: string): string[][] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine)
    .filter((row) => row.some((cell) => cell.length > 0));
}

function isMarkdownTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parsePipeLine(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parsePipeTable(value: string): string[][] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isMarkdownTableSeparator(line))
    .map(parsePipeLine)
    .filter((row) => row.length > 1 && row.some((cell) => cell.length > 0));
}

function shouldParseAsPipeTable(value: string): boolean {
  const rows = parsePipeTable(value);
  if (rows.length < 2) {
    return false;
  }

  const columnCount = rows[0].length;
  return columnCount > 1 && rows.every((row) => row.length === columnCount);
}

function parseTableContent(value: string): string[][] {
  if (shouldParseAsPipeTable(value)) {
    return parsePipeTable(value);
  }

  return parseCsvTable(value);
}

export function normalizeQuestionExtra(extra: unknown): QuestionExtra | null {
  if (!extra || typeof extra !== "object") {
    return null;
  }

  const candidate = extra as { type?: unknown; content?: unknown };
  if (!isQuestionExtraType(candidate.type)) {
    return null;
  }

  return {
    type: candidate.type,
    content: candidate.content,
  };
}

export function hasQuestionExtra(extra: unknown): boolean {
  return parseQuestionExtraTable(extra) !== null || getQuestionExtraSvgMarkup(extra) !== null;
}

export function parseQuestionExtraTable(extra: unknown): ParsedQuestionExtraTable | null {
  const normalized = normalizeQuestionExtra(extra);
  if (!normalized || normalized.type !== "table") {
    return null;
  }

  const rawContent = typeof normalized.content === "string" ? parseJsonString(normalized.content) : normalized.content;

  let title: string | null = null;
  let tableContent = "";

  if (typeof rawContent === "string") {
    tableContent = rawContent;
  } else if (rawContent && typeof rawContent === "object") {
    const structuredContent = rawContent as { title?: unknown; content?: unknown };
    title = typeof structuredContent.title === "string" && structuredContent.title.trim() ? structuredContent.title.trim() : null;
    tableContent = typeof structuredContent.content === "string" ? structuredContent.content : "";
  }

  if (!tableContent.trim()) {
    return null;
  }

  const rows = parseTableContent(tableContent);
  if (rows.length === 0) {
    return null;
  }

  const [headers, ...bodyRows] = rows;

  return {
    title,
    headers,
    rows: bodyRows,
  };
}

export function getQuestionExtraSvgMarkup(extra: unknown): string | null {
  const normalized = normalizeQuestionExtra(extra);
  if (!normalized || normalized.type === "table" || typeof normalized.content !== "string") {
    return null;
  }

  const cleaned = normalized.content
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .trim();

  const svgMatch = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
  return svgMatch ? svgMatch[0] : null;
}

export function estimateQuestionExtraUnits(extra: unknown): number {
  const table = parseQuestionExtraTable(extra);
  if (table) {
    return Math.min(16, 5 + table.rows.length + Math.ceil(table.headers.join(" ").length / 24));
  }

  return getQuestionExtraSvgMarkup(extra) ? 8 : 0;
}
