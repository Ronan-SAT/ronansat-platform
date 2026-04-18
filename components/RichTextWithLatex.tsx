"use client";

import { Fragment, createElement, type ReactNode } from "react";
import Latex from "react-latex-next";

const TALL_MATH_PATTERN = /\\(?:d?frac)|\^(?:\{[^}]+\}|\S)/;
const INLINE_NUMERIC_PATTERN = /^[+-]?\d[\d,]*(?:\.\d+)?$/;
const MONEY_CONTEXT_PATTERN =
  /\b(charge|charges|charged|cost|costs|price|prices|priced|deposit|deposits|deposited|account|accounts|savings|profit|profits|revenue|revenues|salary|income|payment|payments|paid|fee|fees|purchase|purchased|purchases|buy|buys|bought|selling)\b/i;
const QUANTITY_CONTEXT_PATTERN =
  /^\s*(?:bacteria|books?|bottles?|coins?|costumes?|days?|degrees?|feet|foot|grams?|hours?|inches?|meters?|millimeters?|minutes?|months?|people|pieces?|points?|pounds?|products?|radians?|responses?|rounds?|seconds?|skaters?|square|students?|surveys?|times?|units?|voters?|weeks?|yards?|years?)\b/i;
const ALLOWED_TAGS = new Set([
  "b",
  "br",
  "div",
  "em",
  "figcaption",
  "figure",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);
const HTML_TAG_PATTERN = /<\/?(?:b|br|div|em|figcaption|figure|i|img|li|ol|p|span|strong|sub|sup|table|tbody|td|th|thead|tr|u|ul)\b/i;

function hasTallMath(text: string | undefined) {
  if (!text) {
    return false;
  }

  return TALL_MATH_PATTERN.test(text);
}

function loosenInlineLatex(text: string | undefined) {
  if (!text) {
    return "";
  }

  return text.replace(/(\$\$?)(.*?)\1/gs, (match, delimiter, mathText) => {
    if (delimiter === "$$") {
      return match;
    }

    const normalizedMath = mathText.trim();
    if (!hasTallMath(normalizedMath)) {
      return match;
    }

    return `$\\displaystyle ${normalizedMath.replace(/\\frac/g, "\\dfrac")}$`;
  });
}

type LatexSegment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; delimiter: "$" | "$$" };

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

function isValidInlineMathOpener(text: string, index: number) {
  const nextChar = text[index + 1];
  return nextChar !== undefined && !isWhitespaceChar(nextChar);
}

function isValidInlineMathCloser(text: string, index: number) {
  const previousChar = text[index - 1];
  return previousChar !== undefined && !isWhitespaceChar(previousChar) && previousChar !== "\\";
}

export function tokenizeLatexSegments(text: string): LatexSegment[] {
  const segments: LatexSegment[] = [];
  let cursor = 0;
  let textBuffer = "";

  const pushTextBuffer = () => {
    if (!textBuffer) {
      return;
    }

    segments.push({ type: "text", value: textBuffer });
    textBuffer = "";
  };

  while (cursor < text.length) {
    const currentChar = text[cursor];

    if (currentChar === "\\" && text[cursor + 1] === "$") {
      textBuffer += "$";
      cursor += 2;
      continue;
    }

    if (currentChar !== "$" || isEscapedDollar(text, cursor)) {
      textBuffer += text[cursor];
      cursor += 1;
      continue;
    }

    if (text[cursor + 1] === "$") {
      let closingIndex = cursor + 2;

      while (closingIndex < text.length - 1) {
        if (
          text[closingIndex] === "$" &&
          text[closingIndex + 1] === "$" &&
          !isEscapedDollar(text, closingIndex)
        ) {
          pushTextBuffer();
          segments.push({
            type: "math",
            value: text.slice(cursor, closingIndex + 2),
            delimiter: "$$",
          });
          cursor = closingIndex + 2;
          break;
        }

        closingIndex += 1;
      }

      if (closingIndex >= text.length - 1) {
        textBuffer += "$$";
        cursor += 2;
      }
      continue;
    }

    if (!isValidInlineMathOpener(text, cursor)) {
      textBuffer += "$";
      cursor += 1;
      continue;
    }

    let closingIndex = cursor + 1;
    let foundClosingDelimiter = false;

    while (closingIndex < text.length) {
      if (
        text[closingIndex] === "$" &&
        !isEscapedDollar(text, closingIndex) &&
        text[closingIndex + 1] !== "$" &&
        isValidInlineMathCloser(text, closingIndex)
      ) {
        pushTextBuffer();
        segments.push({
          type: "math",
          value: text.slice(cursor, closingIndex + 1),
          delimiter: "$",
        });
        cursor = closingIndex + 1;
        foundClosingDelimiter = true;
        break;
      }

      closingIndex += 1;
    }

    if (!foundClosingDelimiter) {
      textBuffer += "$";
      cursor += 1;
    }
  }

  pushTextBuffer();
  return segments;
}

function isPlainInlineNumericSegment(segment: LatexSegment) {
  if (segment.type !== "math" || segment.delimiter !== "$") {
    return false;
  }

  const innerValue = segment.value.slice(1, -1).trim();
  return INLINE_NUMERIC_PATTERN.test(innerValue);
}

function isLikelyCurrencyContext(previousText: string, nextText: string) {
  const leftWindow = previousText.slice(-48);
  const rightWindow = nextText.slice(0, 48);

  if (QUANTITY_CONTEXT_PATTERN.test(rightWindow)) {
    return false;
  }

  return MONEY_CONTEXT_PATTERN.test(`${leftWindow} ${rightWindow}`);
}

function mergeAdjacentTextSegments(segments: LatexSegment[]) {
  return segments.reduce<LatexSegment[]>((merged, segment) => {
    const previous = merged[merged.length - 1];
    if (segment.type === "text" && previous?.type === "text") {
      previous.value += segment.value;
      return merged;
    }

    merged.push(segment.type === "text" ? { ...segment } : segment);
    return merged;
  }, []);
}

export function normalizeRenderableLatexSegments(segments: LatexSegment[]) {
  const normalized = segments.map<LatexSegment>((segment, index) => {
    if (!isPlainInlineNumericSegment(segment)) {
      return segment;
    }

    const previousText = index > 0 && segments[index - 1]?.type === "text" ? segments[index - 1].value : "";
    const nextText = index < segments.length - 1 && segments[index + 1]?.type === "text" ? segments[index + 1].value : "";
    const numericValue = segment.value.slice(1, -1).trim();

    return {
      type: "text",
      value: isLikelyCurrencyContext(previousText, nextText) ? `$${numericValue}` : numericValue,
    };
  });

  return mergeAdjacentTextSegments(normalized);
}

function renderLatexText(text: string, keyPrefix: string, loosenTallInlineMath: boolean): ReactNode {
  const segments = normalizeRenderableLatexSegments(tokenizeLatexSegments(text));
  if (segments.length === 1 && segments[0]?.type === "text") {
    return <Fragment key={keyPrefix}>{segments[0].value}</Fragment>;
  }

  return segments.map((segment, index) => {
    if (segment.type === "text") {
      return <Fragment key={`${keyPrefix}-text-${index}`}>{segment.value}</Fragment>;
    }

    const mathValue =
      loosenTallInlineMath && segment.delimiter === "$"
        ? loosenInlineLatex(segment.value)
        : segment.value;

    return <Latex key={`${keyPrefix}-math-${index}`}>{mathValue}</Latex>;
  });
}

function getTagClassName(tagName: string) {
  switch (tagName) {
    case "p":
      return "mb-4 last:mb-0";
    case "ul":
      return "my-4 list-disc pl-6";
    case "ol":
      return "my-4 list-decimal pl-6";
    case "li":
      return "mb-1";
    case "table":
      return "my-4 w-full border-collapse overflow-hidden rounded-xl border-2 border-ink-fg bg-surface-white";
    case "thead":
      return "border-b-2 border-ink-fg bg-paper-bg";
    case "th":
      return "border-2 border-ink-fg px-3 py-2 text-left font-bold";
    case "td":
      return "border-2 border-ink-fg px-3 py-2 align-top";
    case "img":
      return "max-w-full h-auto rounded-lg";
    case "figure":
      return "my-4";
    case "figcaption":
      return "mt-2 text-center text-sm text-ink-fg/70 italic";
    default:
      return undefined;
  }
}

function renderRichNode(node: Node, key: string, loosenTallInlineMath: boolean): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text) {
      return null;
    }

    return <Fragment key={key}>{renderLatexText(text, key, loosenTallInlineMath)}</Fragment>;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map((child, index) =>
    renderRichNode(child, `${key}-${index}`, loosenTallInlineMath),
  );

  if (!ALLOWED_TAGS.has(tagName)) {
    return <Fragment key={key}>{children}</Fragment>;
  }

  if (tagName === "br") {
    return <br key={key} />;
  }

  const props: Record<string, string | number | boolean> & { key: string; className?: string } = { key };
  const defaultClassName = getTagClassName(tagName);
  
  if (defaultClassName) {
    props.className = defaultClassName;
  }

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    let name = attr.name;
    
    if (name === "class") {
      if (!props.className) {
        props.className = attr.value;
      } else {
        props.className = `${props.className} ${attr.value}`;
      }
      continue;
    }
    
    if (name === "colspan") name = "colSpan";
    if (name === "rowspan") name = "rowSpan";
    if (name === "style") continue;
    if (name.startsWith("on")) continue; 
    
    props[name] = attr.value;
  }

  if (tagName === "img") {
    return createElement(tagName, props);
  }

  return createElement(tagName, props, children);
}

function containsAllowedHtml(text: string) {
  return HTML_TAG_PATTERN.test(text);
}

export default function RichTextWithLatex({
  text,
  loosenTallInlineMath = false,
}: {
  text?: string;
  loosenTallInlineMath?: boolean;
}) {
  if (!text) {
    return null;
  }

  let content: ReactNode;

  if (!containsAllowedHtml(text)) {
    content = renderLatexText(text, "plain", loosenTallInlineMath);
  } else if (typeof window === "undefined") {
    content = renderLatexText(text, "server", loosenTallInlineMath);
  } else {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${text}</div>`, "text/html");
    const root = doc.body.firstElementChild;
    content = root
      ? Array.from(root.childNodes).map((node, index) =>
          renderRichNode(node, `rich-${index}`, loosenTallInlineMath),
        )
      : null;
  }

  return <>{content}</>;
}
