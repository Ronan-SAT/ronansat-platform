import { getQuestionExtraSvgMarkup, normalizeQuestionExtra, parseQuestionExtraTable } from "@/lib/questionExtra";

export type TestManagerReviewFilter =
  | "all"
  | "has_figure_or_table"
  | "keyword_needs_figure"
  | "markdown_table_payload"
  | "bad_extra_payload"
  | "math_dollar_latex"
  | "missing_math_delimiters"
  | "rhetorical_notes_format"
  | "has_keyword_any";

export type TestManagerReviewFlag =
  | "has_figure_or_table"
  | "keyword_needs_figure"
  | "keyword_manual_check"
  | "markdown_table_payload"
  | "bad_extra_payload"
  | "math_dollar_latex"
  | "missing_math_delimiters"
  | "rhetorical_notes_format"
  | "keyword_with_shared_figure";

export type ReviewKeywordMatch = {
  keyword: string;
  confidence: "high" | "medium";
  source: "questionText" | "passage" | "choices" | "explanation" | "domain" | "skill";
};

export type ReviewReplacement = {
  field: string;
  original: string;
  suggested: string;
  start: number;
  end: number;
};

export type ReviewSuggestion = {
  kind: "math_dollar_latex" | "missing_math_delimiters" | "markdown_table_payload" | "rhetorical_notes_format";
  safe: boolean;
  summary: string;
  updatedFields: Record<string, string>;
  updatedChoices?: string[];
  updatedExtra?: unknown;
  replacements: ReviewReplacement[];
};

export type ReviewQuestionInput = {
  questionText: string;
  passage?: string;
  choices?: string[];
  explanation?: string;
  domain?: string;
  skill?: string;
  section?: string;
  imageUrl?: string;
  extra?: unknown;
  hasSharedPassageFigure?: boolean;
};

const RHETORICAL_SYNTHESIS_DOMAIN = "Expression of Ideas";
const RHETORICAL_SYNTHESIS_SKILL = "Rhetorical Synthesis";
export const RHETORICAL_SYNTHESIS_INTRO = "While researching a topic, a student has taken the following notes:";

export type ReviewDiagnostics = {
  flags: TestManagerReviewFlag[];
  matchedKeywords: ReviewKeywordMatch[];
  keywordConfidence?: "high" | "medium";
  suspicionLevel?: "tier1" | "tier2" | "tier3";
  extraType: string | null;
  hasImageUrl: boolean;
  hasQuestionExtra: boolean;
  hasPassageFigure: boolean;
  contentSnippet: string;
};

const HIGH_CONFIDENCE_KEYWORDS = [
  "according to the table",
  "according to the graph",
  "according to the chart",
  "data from the table",
  "which choice best describes data",
  "summarize the data",
  "most likely true based on the data",
  "scatterplot",
  "line of best fit",
  "histogram",
  "bar chart",
  "box plot",
  "dot plot",
  "circle graph",
  "pie chart",
  "two-way table",
  "table of values",
  "graph of the function",
  "graph of the equation",
];

const MEDIUM_CONFIDENCE_KEYWORDS = [
  "survey",
  "poll",
  "percentage",
  "proportion",
  "rate",
  "projected",
  "estimated",
  "correlate",
  "correlation",
  "increase",
  "decrease",
  "decline",
  "peak",
  "lowest point",
  "represented by",
  "findings",
  "results of the study",
  "illustrate",
  "demonstrate",
  "support the claim",
  "support the hypothesis",
  "weaken the argument",
  "trend",
  "pattern",
  "compared to",
  "standard deviation",
  "outlier",
  "margin of error",
  "sample size",
  "range",
  "origin",
  "quadrant",
  "system of equations",
  "system of inequalities",
  "intersect",
  "intersection",
  "parallel",
  "perpendicular",
  "vertex",
  "minimum value",
  "maximum value",
  "axis of symmetry",
  "exponential growth",
  "exponential decay",
  "shaded region",
  "function f",
  "$f(x)$",
  "xy-plane",
  "x-intercept",
  "y-intercept",
  "slope",
  "parabola",
  "frequency",
  "distribution",
  "mean",
  "median",
];

const EXPLICIT_FIGURE_TERMS = ["graph", "table", "figure", "chart"];

const FIELD_LABELS: Array<{
  key: keyof Pick<ReviewQuestionInput, "questionText" | "passage" | "explanation" | "domain" | "skill">;
  source: ReviewKeywordMatch["source"];
}> = [
  { key: "questionText", source: "questionText" },
  { key: "passage", source: "passage" },
  { key: "explanation", source: "explanation" },
  { key: "domain", source: "domain" },
  { key: "skill", source: "skill" },
];

export const FINANCIAL_KEYWORDS = [
  "price",
  "cost",
  "tax",
  "sale",
  "discount",
  "markdown",
  "off",
  "tip",
  "gratuity",
  "change",
  "refund",
  "purchase",
  "bought",
  "wage",
  "salary",
  "paycheck",
  "earnings",
  "income",
  "commission",
  "bonus",
  "reward",
  "profit",
  "revenue",
  "expense",
  "overhead",
  "budget",
  "break-even",
  "interest",
  "principal",
  "account balance",
  "invest",
  "investment",
  "loan",
  "borrow",
  "mortgage",
  "fee",
  "charge",
  "surcharge",
  "rent",
  "lease",
  "fine",
  "penalty",
  "toll",
  "fund",
  "raised",
  "donation",
  "down payment",
  "installment",
  "grant",
  "funding",
  "endowment",
  "subsidies",
  "allocation",
  "GDP",
  "economic",
  "expenditure",
  "tariff",
  "million",
  "billion",
  "trillion",
];

const FINANCIAL_KEYWORD_PATTERNS = FINANCIAL_KEYWORDS.map((keyword) => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i");
});

function isEscaped(value: string, index: number) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function findClosingDelimiter(value: string, startIndex: number, delimiter: "$" | "$$") {
  for (let index = startIndex; index < value.length; index += 1) {
    if (value.startsWith(delimiter, index) && !isEscaped(value, index)) {
      return index;
    }
  }
  return -1;
}

function hasUnsafeMathPairContent(content: string) {
  return /\r|\n/.test(content) || /[?!]/.test(content) || /(^|[^0-9])\.(\s|$)/.test(content);
}

function isStandaloneNumber(content: string) {
  return /^[+-]?\d[\d,]*(?:\.\d+)?$/.test(content.trim());
}

function hasMathSignal(content: string) {
  const trimmed = content.trim();
  return (
    isStandaloneNumber(trimmed) ||
    /\\[a-zA-Z]+/.test(trimmed) ||
    /[=+*/^_]/.test(trimmed) ||
    /(^|[^a-zA-Z])[xyabmn](?:[^a-zA-Z]|$)/.test(trimmed) ||
    /\bf\s*\(/.test(trimmed)
  );
}

function hasRiskyLeadingNumberEquation(content: string) {
  return /^\s*[+-]?\d[\d,]*(?:\.\d+)?\s*(?:=|[+\-*/^]|\\(?:cdot|times|div)\b)/.test(content);
}

const NAKED_LATEX_PATTERN = /(?:\b\d+(?:\.\d+)?\s*)?(?:\^\{[^}]+\}|_\{[^}]+\}|\\(?:circ|frac|dfrac|sqrt|pi|theta|alpha|beta|gamma|Delta|delta|angle|degree|cdot|times|leq|geq|neq)\b(?:\{[^}]*\}){0,2})/g;

function getDelimitedRanges(text: string) {
  const ranges: Array<{ start: number; end: number }> = [];
  const pattern = /(?<!\\)(\$\$?)([\s\S]*?)(?<!\\)\1|\\\(([\s\S]*?)(?<!\\)\\\)|\\\[([\s\S]*?)(?<!\\)\\\]/g;
  for (const match of text.matchAll(pattern)) {
    ranges.push({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
  }
  return ranges;
}

function isInsideRange(index: number, ranges: Array<{ start: number; end: number }>) {
  return ranges.some((range) => index >= range.start && index < range.end);
}

function expandNakedLatexMatch(text: string, start: number, end: number) {
  let nextStart = start;
  let nextEnd = end;

  while (nextStart > 0 && /[A-Za-z0-9.()+\-*/=,\s\\{}]/.test(text[nextStart - 1]) && text[nextStart - 1] !== "\n") {
    nextStart -= 1;
    if (/[.!?;]/.test(text[nextStart])) {
      nextStart += 1;
      break;
    }
  }

  while (nextEnd < text.length && /[A-Za-z0-9.()+\-*/=,\s\\{}]/.test(text[nextEnd]) && text[nextEnd] !== "\n") {
    if (/[.!?;]/.test(text[nextEnd])) {
      break;
    }
    nextEnd += 1;
  }

  return {
    start: nextStart,
    end: nextEnd,
    content: text.slice(nextStart, nextEnd).trim(),
  };
}

export function getMissingMathDelimiterSuggestion(text: string, field = "text"): ReviewSuggestion | null {
  const ranges = getDelimitedRanges(text);
  const replacements: ReviewReplacement[] = [];
  let result = "";
  let cursor = 0;
  let lastConsumedEnd = -1;

  for (const match of text.matchAll(NAKED_LATEX_PATTERN)) {
    const matchStart = match.index ?? 0;
    const matchEnd = matchStart + match[0].length;
    if (isInsideRange(matchStart, ranges) || matchStart < lastConsumedEnd) {
      continue;
    }

    const expanded = expandNakedLatexMatch(text, matchStart, matchEnd);
    if (!expanded.content || /\\\(|\\\[|(?<!\\)\$/.test(expanded.content)) {
      continue;
    }

    const suggested = `\\(${expanded.content}\\)`;
    result += text.slice(cursor, expanded.start) + suggested;
    replacements.push({
      field,
      original: text.slice(expanded.start, expanded.end),
      suggested,
      start: expanded.start,
      end: expanded.end,
    });
    cursor = expanded.end;
    lastConsumedEnd = expanded.end;
  }

  if (replacements.length === 0) {
    return null;
  }

  result += text.slice(cursor);
  return {
    kind: "missing_math_delimiters",
    safe: true,
    summary: "Wrap naked LaTeX fragments in \\(...\\).",
    updatedFields: { [field]: result },
    replacements,
  };
}

function getTextFields(input: ReviewQuestionInput) {
  return [input.questionText, input.passage, input.explanation, input.domain, input.skill, ...(input.choices ?? [])].filter((value): value is string => Boolean(value));
}

export function hasFinancialKeywordContext(input: ReviewQuestionInput) {
  const combined = getTextFields(input).join("\n");
  return FINANCIAL_KEYWORD_PATTERNS.some((pattern) => pattern.test(combined));
}

export function hasRiskyDollarMath(input: ReviewQuestionInput) {
  return getTextFields(input).some((text) => getMathDollarSuggestion(text, "text", { onlyRiskyLeadingNumberEquation: true }) !== null);
}

export function isTierOneMathDollarAutoFixCandidate(input: ReviewQuestionInput) {
  const fieldsWithDollar = getTextFields(input).filter((field) => /(?<!\\)\$/.test(field));
  if (fieldsWithDollar.length === 0 || hasFinancialKeywordContext(input) || hasRiskyDollarMath(input)) {
    return false;
  }

  return fieldsWithDollar.some((field) => getMathDollarSuggestion(field, "text", { requireMathSignal: false }) !== null);
}

export function isTierTwoMathDollarReviewCandidate(input: ReviewQuestionInput) {
  const fieldsWithDollar = getTextFields(input).filter((field) => /(?<!\\)\$/.test(field));
  if (fieldsWithDollar.length === 0) {
    return false;
  }

  return hasFinancialKeywordContext(input) || hasRiskyDollarMath(input);
}

export function getMathDollarSuggestion(
  text: string,
  field = "text",
  options: { requireMathSignal?: boolean; onlyRiskyLeadingNumberEquation?: boolean } = {},
): ReviewSuggestion | null {
  const requireMathSignal = options.requireMathSignal ?? true;
  const replacements: ReviewReplacement[] = [];
  let result = "";
  let cursor = 0;

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "$" || isEscaped(text, index)) {
      continue;
    }

    const delimiter: "$" | "$$" = text[index + 1] === "$" ? "$$" : "$";
    const contentStart = index + delimiter.length;
    const closeIndex = findClosingDelimiter(text, contentStart, delimiter);
    if (closeIndex < 0) {
      continue;
    }

    const content = text.slice(contentStart, closeIndex);
    const isValidCandidate = content.trim()
      && !hasUnsafeMathPairContent(content)
      && (options.onlyRiskyLeadingNumberEquation ? hasRiskyLeadingNumberEquation(content) : !requireMathSignal || hasMathSignal(content));
    if (isValidCandidate) {
      const original = text.slice(index, closeIndex + delimiter.length);
      const suggested = delimiter === "$$" ? `\\[${content.trim()}\\]` : `\\(${content.trim()}\\)`;
      result += text.slice(cursor, index) + suggested;
      replacements.push({ field, original, suggested, start: index, end: closeIndex + delimiter.length });
      cursor = closeIndex + delimiter.length;
      index = closeIndex + delimiter.length - 1;
    }
  }

  if (replacements.length === 0) {
    return null;
  }

  result += text.slice(cursor);
  return {
    kind: "math_dollar_latex",
    safe: true,
    summary: "Convert dollar-delimited math to \\(...\\) or \\[...\\].",
    updatedFields: { [field]: result },
    replacements,
  };
}

function parseMarkdownTableRows(value: string): string[][] | null {
  const lines = value
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3 || !lines.every((line) => line.includes("|"))) {
    return null;
  }

  const rows = lines.map((line) => {
    const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
    return trimmed.split("|").map((cell) => cell.trim());
  });

  const separatorIndex = rows.findIndex((row) => row.every((cell) => /^:?-{3,}:?$/.test(cell)));
  if (separatorIndex !== 1) {
    return null;
  }

  const tableRows = [rows[0], ...rows.slice(2)];
  const width = tableRows[0]?.length ?? 0;
  if (width === 0 || !tableRows.every((row) => row.length === width)) {
    return null;
  }

  return tableRows;
}

function csvEscapeCell(cell: string) {
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

function getTableContent(extra: unknown) {
  const normalized = normalizeQuestionExtra(extra);
  if (!normalized || normalized.type !== "table") {
    return null;
  }

  if (typeof normalized.content === "string") {
    return { title: null as string | null, content: normalized.content, rawContent: normalized.content };
  }

  if (normalized.content && typeof normalized.content === "object") {
    const content = normalized.content as { title?: unknown; content?: unknown };
    return {
      title: typeof content.title === "string" && content.title.trim() ? content.title.trim() : null,
      content: typeof content.content === "string" ? content.content : "",
      rawContent: normalized.content,
    };
  }

  return { title: null, content: "", rawContent: normalized.content };
}

export function getMarkdownTableSuggestion(extra: unknown): ReviewSuggestion | null {
  const tableContent = getTableContent(extra);
  if (!tableContent) {
    return null;
  }

  const rows = parseMarkdownTableRows(tableContent.content);
  if (!rows) {
    return null;
  }

  const csv = rows.map((row) => row.map(csvEscapeCell).join(",")).join("\n");
  const updatedExtra = {
    type: "table",
    content:
      tableContent.title || typeof tableContent.rawContent === "object"
        ? { title: tableContent.title ?? undefined, content: csv }
        : csv,
  };

  return {
    kind: "markdown_table_payload",
    safe: true,
    summary: "Convert Markdown table payload to CSV.",
    updatedFields: {},
    updatedExtra,
    replacements: [
      {
        field: "extra",
        original: tableContent.content,
        suggested: csv,
        start: 0,
        end: tableContent.content.length,
      },
    ],
  };
}

function normalizeWhitespaceSnippet(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function hasRenderableExtra(extra: unknown) {
  return parseQuestionExtraTable(extra) !== null || getQuestionExtraSvgMarkup(extra) !== null;
}

function hasTableExtra(extra: unknown) {
  return parseQuestionExtraTable(extra) !== null;
}

function hasSvgExtra(extra: unknown) {
  return getQuestionExtraSvgMarkup(extra) !== null;
}

function hasPassageFigureMarkup(passage?: string) {
  return Boolean(passage && /<svg\b|<table\b|<img\b|!\[[^\]]*\]\([^)]+\)/i.test(passage));
}

function getExtraType(extra: unknown) {
  const normalized = normalizeQuestionExtra(extra);
  if (normalized) {
    return normalized.type;
  }
  return extra == null ? null : "invalid";
}

function isBadExtraPayload(extra: unknown) {
  if (extra == null) {
    return false;
  }

  const normalized = normalizeQuestionExtra(extra);
  if (!normalized) {
    return true;
  }

  if (normalized.type === "table") {
    return getMarkdownTableSuggestion(extra) === null && parseQuestionExtraTable(extra) === null;
  }

  return typeof normalized.content !== "string" || getQuestionExtraSvgMarkup(extra) === null;
}

function fieldMatches(value: string | undefined, source: ReviewKeywordMatch["source"], keywords: string[], confidence: "high" | "medium") {
  if (!value) {
    return [];
  }

  const lower = value.toLowerCase();
  return keywords
    .filter((keyword) => lower.includes(keyword.toLowerCase()))
    .map((keyword) => ({ keyword, confidence, source }));
}

function getSearchableContent(input: ReviewQuestionInput) {
  return [
    input.questionText,
    input.passage,
    input.explanation,
    input.domain,
    input.skill,
    ...(input.choices ?? []),
  ].filter(Boolean).join("\n").toLowerCase();
}

function hasAnyTerm(content: string, terms: string[]) {
  return terms.some((term) => new RegExp(`\\b${term}\\b`, "i").test(content));
}

function getSuspicionLevel(input: ReviewQuestionInput, matchedKeywords: ReviewKeywordMatch[]) {
  const content = getSearchableContent(input);
  const mentionsExplicitFigure = hasAnyTerm(content, EXPLICIT_FIGURE_TERMS);
  const mentionsTable = /\btable\b/i.test(content);
  const mentionsGraph = /\b(?:graph|chart|figure|scatterplot|histogram|plot)\b/i.test(content);
  const hasImageUrl = Boolean(input.imageUrl?.trim());
  const hasTable = hasTableExtra(input.extra);
  const hasSvg = hasSvgExtra(input.extra);
  const hasAnyFigure = hasImageUrl || hasTable || hasSvg || hasPassageFigureMarkup(input.passage) || Boolean(input.hasSharedPassageFigure);

  if (mentionsExplicitFigure && !hasAnyFigure) {
    return "tier1" as const;
  }

  if ((mentionsTable && hasImageUrl && !hasTable) || (mentionsGraph && hasTable && !hasImageUrl && !hasSvg)) {
    return "tier2" as const;
  }

  return matchedKeywords.length > 0 ? "tier3" as const : undefined;
}

export function findReviewKeywordMatches(input: ReviewQuestionInput): ReviewKeywordMatch[] {
  const matches: ReviewKeywordMatch[] = [];

  for (const field of FIELD_LABELS) {
    matches.push(...fieldMatches(input[field.key], field.source, HIGH_CONFIDENCE_KEYWORDS, "high"));
    matches.push(...fieldMatches(input[field.key], field.source, MEDIUM_CONFIDENCE_KEYWORDS, "medium"));
  }

  for (const choice of input.choices ?? []) {
    matches.push(...fieldMatches(choice, "choices", HIGH_CONFIDENCE_KEYWORDS, "high"));
    matches.push(...fieldMatches(choice, "choices", MEDIUM_CONFIDENCE_KEYWORDS, "medium"));
  }

  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.keyword}:${match.confidence}:${match.source}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isRhetoricalNotesCandidate(input: ReviewQuestionInput) {
  const combined = [input.questionText, input.passage].filter(Boolean).join("\n");
  return /while researching a topic, a student has taken the following notes/i.test(combined)
    || /which choice most effectively uses information from the given sentences/i.test(combined)
    || /following notes|given sentences|student.?s notes/i.test(combined)
    || /(?:^|\n|<br\s*\/?>)\s*[-*]\s+/.test(combined);
}

export function isStrictRhetoricalSynthesis(input: ReviewQuestionInput) {
  return input.domain === RHETORICAL_SYNTHESIS_DOMAIN && input.skill === RHETORICAL_SYNTHESIS_SKILL;
}

function hasFormattedRhetoricalNotes(passage?: string) {
  return Boolean(passage && /(?:^|\n|<br\s*\/?>)\s*[-*]\s+/i.test(passage));
}

function cleanRhetoricalNoteLine(value: string) {
  return value
    .trim()
    .replace(/^[\s\-\u2022*.]+/u, "")
    .trim();
}

function normalizeRhetoricalNotesText(text: string) {
  const intro = RHETORICAL_SYNTHESIS_INTRO;
  const introRegex = new RegExp(intro.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const introMatch = text.match(introRegex);
  const hasIntro = Boolean(introMatch);
  const introEnd = introMatch?.index !== undefined ? introMatch.index + introMatch[0].length : -1;
  const prefix = hasIntro && introMatch?.index ? text.slice(0, introMatch.index).trim() : "";
  const rawNotes = hasIntro ? text.slice(introEnd) : text;
  const notes = rawNotes
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\n+/)
    .map(cleanRhetoricalNoteLine)
    .filter(Boolean);

  if (notes.length === 0) {
    return null;
  }

  const normalized = `${prefix ? `${prefix}\n` : ""}${intro}<br>${notes.map((note) => `- ${note}`).join("<br>")}`;
  return normalized;
}

export function getRhetoricalNotesSuggestion(text: string, field = "questionText"): ReviewSuggestion | null {
  const introRegex = new RegExp(RHETORICAL_SYNTHESIS_INTRO.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const hasIntro = introRegex.test(text);
  const hasBullet = /(?:^|\n|<br\s*\/?>)\s*[-*]\s+/.test(text);

  if (hasIntro && !hasBullet) {
    return null;
  }

  if (!hasIntro && !hasBullet) {
    return null;
  }

  const suggested = normalizeRhetoricalNotesText(text);

  if (!suggested || suggested === text) {
    return null;
  }

  return {
    kind: "rhetorical_notes_format",
    safe: true,
    summary: "Normalize Rhetorical Synthesis intro and note line breaks.",
    updatedFields: { [field]: suggested },
    replacements: [{ field, original: text, suggested, start: 0, end: text.length }],
  };
}

export function getReviewDiagnostics(input: ReviewQuestionInput): ReviewDiagnostics {
  const matchedKeywords = findReviewKeywordMatches(input);
  const suspicionLevel = getSuspicionLevel(input, matchedKeywords);
  const hasHighConfidenceKeyword = matchedKeywords.some((match) => match.confidence === "high");
  const hasMediumConfidenceKeyword = matchedKeywords.some((match) => match.confidence === "medium");
  const hasImageUrl = Boolean(input.imageUrl?.trim());
  const hasQuestionExtra = hasRenderableExtra(input.extra);
  const hasPassageFigure = hasPassageFigureMarkup(input.passage) || Boolean(input.hasSharedPassageFigure);
  const hasAnyFigure = hasImageUrl || hasQuestionExtra || hasPassageFigure;
  const flags: TestManagerReviewFlag[] = [];

  if (hasImageUrl || hasQuestionExtra) {
    flags.push("has_figure_or_table");
  }

  if (getMarkdownTableSuggestion(input.extra)) {
    flags.push("markdown_table_payload");
  }

  if (isBadExtraPayload(input.extra)) {
    flags.push("bad_extra_payload");
  }

  if (hasHighConfidenceKeyword && !hasAnyFigure) {
    flags.push("keyword_needs_figure");
  } else if (hasHighConfidenceKeyword && hasPassageFigure && !hasImageUrl && !hasQuestionExtra) {
    flags.push("keyword_with_shared_figure");
  }

  if (hasMediumConfidenceKeyword) {
    flags.push("keyword_manual_check");
  }

  if (isTierTwoMathDollarReviewCandidate(input)) {
    flags.push("math_dollar_latex");
  }

  if (getTextFields(input).some((value) => getMissingMathDelimiterSuggestion(value))) {
    flags.push("missing_math_delimiters");
  }

  if (isRhetoricalNotesCandidate(input) || isStrictRhetoricalSynthesis(input)) {
    const rhetoricalSuggestion = getRhetoricalNotesSuggestion(input.questionText, "questionText") ?? (input.passage ? getRhetoricalNotesSuggestion(input.passage, "passage") : null);
    if (
      rhetoricalSuggestion
      || (
        isStrictRhetoricalSynthesis(input)
        && input.passage
        && (!input.passage.includes(RHETORICAL_SYNTHESIS_INTRO) || !hasFormattedRhetoricalNotes(input.passage))
      )
    ) {
      flags.push("rhetorical_notes_format");
    }
  }

  return {
    flags,
    matchedKeywords,
    keywordConfidence: hasHighConfidenceKeyword ? "high" : hasMediumConfidenceKeyword ? "medium" : undefined,
    suspicionLevel,
    extraType: getExtraType(input.extra),
    hasImageUrl,
    hasQuestionExtra,
    hasPassageFigure,
    contentSnippet: normalizeWhitespaceSnippet([input.passage, input.questionText].filter(Boolean).join(" ")).slice(0, 220),
  };
}

export function matchesReviewFilter(diagnostics: ReviewDiagnostics, filter: TestManagerReviewFilter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "has_keyword_any") {
    return diagnostics.matchedKeywords.length > 0;
  }
  if (filter === "keyword_needs_figure") {
    return diagnostics.flags.includes("keyword_needs_figure") || diagnostics.flags.includes("keyword_manual_check");
  }
  return diagnostics.flags.includes(filter);
}

export function buildQuestionReviewSuggestions(input: ReviewQuestionInput): ReviewSuggestion[] {
  const suggestions: ReviewSuggestion[] = [];
  const fieldEntries: Array<[string, string | undefined]> = [
    ["questionText", input.questionText],
    ["passage", input.passage],
    ["explanation", input.explanation],
  ];

  for (const [field, value] of fieldEntries) {
    if (!value) {
      continue;
    }
    const mathSuggestion = getMathDollarSuggestion(value, field);
    if (mathSuggestion) {
      suggestions.push(mathSuggestion);
    }
    const missingDelimiterSuggestion = getMissingMathDelimiterSuggestion(value, field);
    if (missingDelimiterSuggestion) {
      suggestions.push(missingDelimiterSuggestion);
    }
  }

  const updatedChoices = [...(input.choices ?? [])];
  const choiceReplacements: ReviewReplacement[] = [];
  const missingDelimiterChoiceReplacements: ReviewReplacement[] = [];
  const missingDelimiterUpdatedChoices = [...(input.choices ?? [])];
  updatedChoices.forEach((choice, index) => {
    const suggestion = getMathDollarSuggestion(choice, `choices.${index}`);
    if (suggestion) {
      updatedChoices[index] = suggestion.updatedFields[`choices.${index}`] ?? choice;
      choiceReplacements.push(...suggestion.replacements);
    }

    const missingDelimiterSuggestion = getMissingMathDelimiterSuggestion(choice, `choices.${index}`);
    if (missingDelimiterSuggestion) {
      missingDelimiterUpdatedChoices[index] = missingDelimiterSuggestion.updatedFields[`choices.${index}`] ?? choice;
      missingDelimiterChoiceReplacements.push(...missingDelimiterSuggestion.replacements);
    }
  });
  if (choiceReplacements.length > 0) {
    suggestions.push({
      kind: "math_dollar_latex",
      safe: true,
      summary: "Convert dollar-delimited math in choices.",
      updatedFields: {},
      updatedChoices,
      replacements: choiceReplacements,
    });
  }
  if (missingDelimiterChoiceReplacements.length > 0) {
    suggestions.push({
      kind: "missing_math_delimiters",
      safe: true,
      summary: "Wrap naked LaTeX fragments in choices.",
      updatedFields: {},
      updatedChoices: missingDelimiterUpdatedChoices,
      replacements: missingDelimiterChoiceReplacements,
    });
  }

  const markdownSuggestion = getMarkdownTableSuggestion(input.extra);
  if (markdownSuggestion) {
    suggestions.push(markdownSuggestion);
  }

  const rhetoricalSuggestion = getRhetoricalNotesSuggestion(input.questionText, "questionText") ?? (input.passage ? getRhetoricalNotesSuggestion(input.passage, "passage") : null);
  if (rhetoricalSuggestion) {
    suggestions.push(rhetoricalSuggestion);
  }

  return suggestions;
}
