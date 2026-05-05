"use client";

import { Fragment, createElement, type ReactNode } from "react";
import Latex from "react-latex-next";

const TALL_MATH_PATTERN = /\\(?:d?frac)|\^(?:\{[^}]+\}|\S)/;
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
  // Regex \s bao gồm cả dấu cách, tab, xuống dòng và khoảng trắng ảo \xA0
  return char !== undefined && /\s/.test(char);
}

function isValidInlineMathOpener(text: string, index: number) {
  const nextChar = text[index + 1];
  const previousChar = text[index - 1];

  // FIX 1: Chặn trường hợp gõ dính giá tiền (VD: Giá 100$và)
  if (previousChar !== undefined && /[0-9]/.test(previousChar)) {
    return false;
  }

  return nextChar !== undefined && !isWhitespaceChar(nextChar);
}

function isValidInlineMathCloser(text: string, index: number) {
  const previousChar = text[index - 1];
  return previousChar !== undefined && !isWhitespaceChar(previousChar) && previousChar !== "\\";
}


// THÊM HÀM NÀY VÀO TRONG FILE CỦA BẠN (để phía trên hàm tokenizeLatexSegments)
function isLikelyPlainText(mathContent: string) {
  // Nếu có chứa lệnh LaTeX xịn (như \frac, \text) thì chắc chắn là toán
  if (mathContent.includes("\\")) return false;

  // Kiểm tra xem có chứa 3 từ tiếng Anh/Việt liên tiếp cách nhau bởi dấu cách không
  // ([\p{L}] đại diện cho mọi chữ cái có dấu/không dấu)
  const hasConsecutiveWords = /(?:[\p{L}]{2,}\s+){2,}[\p{L}]{2,}/u.test(mathContent);
  
  // Kiểm tra xem có chứa dấu toán học không
  const hasMathOperators = /[+\-=^_*<>\/|]/.test(mathContent);

  // Nếu là một câu văn dài và không có dấu toán học -> Đích thị là text thường bị kẹp nhầm $
  if (hasConsecutiveWords && !hasMathOperators) {
    return true;
  }

  // Nếu có quá nhiều khoảng trắng (>5) mà không có dấu toán học -> Rất đáng ngờ
  const spaceCount = (mathContent.match(/\s/g) || []).length;
  if (spaceCount > 5 && !hasMathOperators) {
    return true;
  }

  return false;
}

// 1. Hàm kiểm tra cực kỳ khắt khe để phân biệt Toán và Văn bản
function isActuallyMath(content: string) {
  // Nếu có lệnh LaTeX (\frac, \sqrt, ...) thì chắc chắn là toán
  if (content.includes("\\")) return true;
  
  // Nếu quá dài (hơn 150 ký tự) thì không thể là inline math
  if (content.length > 150) return false;

  const words = content.trim().split(/\s+/);
  const hasMathOperators = /[+\-=^_*<>\/|]/.test(content);
  
  // Nếu có hơn 5 từ mà không có dấu toán học (+, -, =) -> Đây là văn bản
  if (words.length > 5 && !hasMathOperators) return false;

  return true;
}


function isMathContent(inner: string) {
  const text = inner.trim();
  if (!text) return false;

  // Nếu có lệnh LaTeX (bắt đầu bằng \) -> Chắc chắn là toán
  if (text.includes("\\")) return true;

  // Nếu chứa các ký hiệu toán học đặc trưng -> Là toán
  // Bao gồm: cộng, trừ, bằng, lớn/nhỏ hơn, mũ, căn, gạch dưới, ngoặc nhọn
  const mathMarkers = /[+\-=><^_*\/]/;
  if (mathMarkers.test(text)) return true;

  // Nếu nội dung bắt đầu bằng số (như 17) nhưng lại chứa khoảng trắng 
  // mà KHÔNG có dấu toán học ở trên -> Đây là tiền tệ trong văn bản
  // Ví dụ: "17 for the first book" -> Không phải toán
  if (/^[0-9]/.test(text) && /\s/.test(text)) {
    return false;
  }

  // Nếu chỉ có vài chữ cái (biến số như x, y, n) -> Là toán
  if (text.length <= 5 && !/\s/.test(text)) return true;

  // Mặc định: Nếu có khoảng trắng rộng mà không có ký hiệu toán -> Là văn bản
  if (text.split(/\s+/).length > 2) return false;

  return true;
}

export function tokenizeLatexSegments(text: string): LatexSegment[] {
  const segments: LatexSegment[] = [];
  let cursor = 0;
  let textBuffer = "";

  const pushTextBuffer = () => {
    if (!textBuffer) return;
    segments.push({ type: "text", value: textBuffer });
    textBuffer = "";
  };

  while (cursor < text.length) {
    const char = text[cursor];

    // Xử lý Escape \$
    if (char === "$" && isEscapedDollar(text, cursor)) {
      textBuffer = textBuffer.slice(0, -1) + "$";
      cursor += 1;
      continue;
    }

    if (char !== "$") {
      textBuffer += char;
      cursor += 1;
      continue;
    }

    // Xử lý Display Math $$
    if (text[cursor + 1] === "$") {
      let closingIndex = text.indexOf("$$", cursor + 2);
      if (closingIndex !== -1) {
        pushTextBuffer();
        segments.push({
          type: "math",
          value: text.slice(cursor, closingIndex + 2),
          delimiter: "$$",
        });
        cursor = closingIndex + 2;
        continue;
      }
    }

    // Xử lý Inline Math $
    // Tìm dấu $ tiếp theo nhưng phải thỏa mãn quy tắc toán học
    let nextDollarIndex = -1;
    let searchIdx = cursor + 1;

    while (searchIdx < text.length) {
      // Nếu gặp xuống dòng đôi (ngắt đoạn) -> Không thể là inline math, dừng tìm
      if (text[searchIdx] === "\n" && text[searchIdx + 1] === "\n") break;

      if (text[searchIdx] === "$" && !isEscapedDollar(text, searchIdx)) {
        // Kiểm tra nội dung giữa cursor và searchIdx
        const inner = text.slice(cursor + 1, searchIdx);
        
        // KIỂM TRA QUAN TRỌNG: 
        // 1. Không được bắt đầu/kết thúc bằng khoảng trắng (Quy tắc chuẩn)
        // 2. Phải vượt qua bài kiểm tra isMathContent
        if (!inner.startsWith(" ") && !inner.endsWith(" ") && isMathContent(inner)) {
          nextDollarIndex = searchIdx;
          break;
        }
      }
      searchIdx++;
    }

    if (nextDollarIndex !== -1) {
      pushTextBuffer();
      segments.push({
        type: "math",
        value: text.slice(cursor, nextDollarIndex + 1),
        delimiter: "$",
      });
      cursor = nextDollarIndex + 1;
    } else {
      // Nếu không tìm thấy dấu đóng hợp lệ, coi $ này là text bình thường
      textBuffer += "$";
      cursor += 1;
    }
  }

  pushTextBuffer();
  return segments;
}



function renderLatexText(text: string, keyPrefix: string, loosenTallInlineMath: boolean): ReactNode {
  const segments = tokenizeLatexSegments(text);
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
