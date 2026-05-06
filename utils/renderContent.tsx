/**
 * Renders text that may contain a mix of HTML markup and LaTeX math delimiters
 * ($...$, $$...$$, \(...\), \[...\]).
 * Plain-text segments are rendered via dangerouslySetInnerHTML so HTML tags in the database
 * are interpreted by the browser instead of being printed as raw text.
 * Math segments are rendered by react-latex-next.
 */

import type { ReactNode } from "react";
import katex from "katex";

const TALL_MATH_PATTERN = /\\(?:d?frac)|\^(?:\{[^}]+\}|\S)/;

type ContentSegment =
  | { type: "html"; value: string; start: number }
  | { type: "math"; delimiter: "$" | "$$" | "\\(" | "\\["; value: string; start: number; end: number };

export function hasTallMath(text: string | undefined): boolean {
  if (!text) return false;
  return TALL_MATH_PATTERN.test(text);
}

function normalizeMathText(delimiter: string, mathText: string): string {
  const normalizedMath = mathText.trim();
  if ((delimiter === "$" || delimiter === "\\(") && hasTallMath(normalizedMath)) {
    return `\\displaystyle ${normalizedMath.replace(/\\frac/g, "\\dfrac")}`;
  }
  return normalizedMath;
}

function renderKatexMarkup(delimiter: string, mathText: string) {
  return katex.renderToString(normalizeMathText(delimiter, mathText), {
    displayMode: delimiter === "$$" || delimiter === "\\[",
    throwOnError: false,
    strict: "ignore",
  });
}

function isEscapedDollar(text: string, index: number) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function isWhitespaceChar(char?: string) {
  return char !== undefined && /\s/.test(char);
}

function isMathContent(value: string) {
  const text = value.trim();
  if (!text) {
    return false;
  }

  if (text.includes("\\")) {
    return true;
  }

  const hasMathMarkers = /[+\-=><^_*\/|]/.test(text);
  if (hasMathMarkers) {
    return true;
  }

  if (text.length <= 5 && !/\s/.test(text) && /[a-zA-Z]/.test(text)) {
    return true;
  }

  const words = text.split(/\s+/);
  if (words.length > 2) {
    return false;
  }

  return false;
}

function isValidInlineMathCloser(text: string, index: number) {
  const previousChar = text[index - 1];
  return previousChar !== undefined && !isWhitespaceChar(previousChar) && previousChar !== "\\";
}

function findInlineDollarCloser(text: string, openerIndex: number) {
  let cursor = openerIndex + 1;

  while (cursor < text.length) {
    if (text[cursor] === "\n" && text[cursor + 1] === "\n") {
      return -1;
    }

    if (text[cursor] === "$" && !isEscapedDollar(text, cursor) && isValidInlineMathCloser(text, cursor)) {
      const inner = text.slice(openerIndex + 1, cursor);
      if (!inner.startsWith(" ") && !inner.endsWith(" ") && isMathContent(inner)) {
        return cursor;
      }
    }

    cursor += 1;
  }

  return -1;
}

function unescapeLiteralDollars(value: string) {
  return value.replace(/\\\$/g, "$");
}

function tokenizeContent(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let cursor = 0;
  let htmlBuffer = "";
  let htmlStart = 0;

  const pushHtml = () => {
    if (!htmlBuffer) {
      return;
    }

    segments.push({
      type: "html",
      value: unescapeLiteralDollars(htmlBuffer),
      start: htmlStart,
    });
    htmlBuffer = "";
  };

  while (cursor < text.length) {
    if (!htmlBuffer) {
      htmlStart = cursor;
    }

    if (text.startsWith("\\(", cursor)) {
      const closingIndex = text.indexOf("\\)", cursor + 2);
      if (closingIndex >= 0) {
        pushHtml();
        segments.push({
          type: "math",
          delimiter: "\\(",
          value: text.slice(cursor + 2, closingIndex),
          start: cursor,
          end: closingIndex + 2,
        });
        cursor = closingIndex + 2;
        continue;
      }
    }

    if (text.startsWith("\\[", cursor)) {
      const closingIndex = text.indexOf("\\]", cursor + 2);
      if (closingIndex >= 0) {
        pushHtml();
        segments.push({
          type: "math",
          delimiter: "\\[",
          value: text.slice(cursor + 2, closingIndex),
          start: cursor,
          end: closingIndex + 2,
        });
        cursor = closingIndex + 2;
        continue;
      }
    }

    const char = text[cursor];

    if (char === "$" && isEscapedDollar(text, cursor)) {
      htmlBuffer = htmlBuffer.slice(0, -1) + "$";
      cursor += 1;
      continue;
    }

    if (text.startsWith("$$", cursor)) {
      const closingIndex = text.indexOf("$$", cursor + 2);
      if (closingIndex >= 0) {
        pushHtml();
        segments.push({
          type: "math",
          delimiter: "$$",
          value: text.slice(cursor + 2, closingIndex),
          start: cursor,
          end: closingIndex + 2,
        });
        cursor = closingIndex + 2;
        continue;
      }
    }

    if (char === "$") {
      const closingIndex = findInlineDollarCloser(text, cursor);
      if (closingIndex >= 0) {
        pushHtml();
        segments.push({
          type: "math",
          delimiter: "$",
          value: text.slice(cursor + 1, closingIndex),
          start: cursor,
          end: closingIndex + 1,
        });
        cursor = closingIndex + 1;
        continue;
      }
    }

    htmlBuffer += char;
    cursor += 1;
  }

  pushHtml();
  return segments;
}

/**
 * Splits `text` at LaTeX delimiters and returns a React node array where
 * - plain segments are rendered with dangerouslySetInnerHTML (so HTML is parsed),
 * - math segments are rendered with <Latex>.
 */
export function renderHtmlLatexContent(text: string | undefined): ReactNode {
  if (!text) return "";

  const parts: ReactNode[] = [];

  for (const segment of tokenizeContent(text)) {
    if (segment.type === "html") {
      if (!segment.value) {
        continue;
      }

      parts.push(
        <span
          key={`html-${segment.start}`}
          dangerouslySetInnerHTML={{ __html: segment.value }}
        />,
      );
      continue;
    }

    parts.push(
      <span
        key={`math-${segment.start}-${segment.delimiter}`}
        dangerouslySetInnerHTML={{ __html: renderKatexMarkup(segment.delimiter, segment.value) }}
      />,
    );
  }

  return parts.length > 0 ? parts : (
    <span
      dangerouslySetInnerHTML={{ __html: unescapeLiteralDollars(text) }}
    />
  );
}
