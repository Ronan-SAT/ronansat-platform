import assert from "node:assert/strict";

import { normalizeScrapedMarkdownHtml, repairScrapedMojibake } from "@/lib/scrapedQuestionContent";

assert.equal(repairScrapedMojibake("student\u00e2\u20ac\u2122s score is 90\u00c2\u00b0"), "student\u2019s score is 90\u00b0");
assert.equal(normalizeScrapedMarkdownHtml("> quoted\n> text"), "<blockquote>quoted<br>text</blockquote>");
assert.equal(normalizeScrapedMarkdownHtml("First paragraph\n\nSecond paragraph"), "First paragraph<br><br>Second paragraph");
assert.equal(normalizeScrapedMarkdownHtml("A **underlined** and *italic* word"), "A <u>underlined</u> and <em>italic</em> word");
assert.equal(normalizeScrapedMarkdownHtml("**Text 1**"), "<strong>Text 1</strong>");
assert.equal(normalizeScrapedMarkdownHtml("**KING HENRY:** line"), "<strong>KING HENRY:</strong> line");
assert.equal(normalizeScrapedMarkdownHtml("A __underlined__ phrase"), "A <u>underlined</u> phrase");
assert.equal(normalizeScrapedMarkdownHtml("This is ___ blank"), "This is <u class=\"question-blank\">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> blank");
assert.equal(normalizeScrapedMarkdownHtml("This is <strong><em></strong></em> blank"), "This is <u class=\"question-blank\">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> blank");
assert.equal(normalizeScrapedMarkdownHtml("Intro<br>\\nLine one\\nLine two"), "Intro<br>Line one<br>Line two");
assert.equal(normalizeScrapedMarkdownHtml("\\(x^2\\) and **text**"), "\\(x^2\\) and <u>text</u>");
assert.equal(normalizeScrapedMarkdownHtml("\\(x \\neq 1\\)"), "\\(x \\neq 1\\)");

console.log("Scraped question content normalization checks passed.");
