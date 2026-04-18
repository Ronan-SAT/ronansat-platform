import test from "node:test";
import assert from "node:assert/strict";

import { normalizeRenderableLatexSegments, tokenizeLatexSegments } from "@/components/RichTextWithLatex";

test("treats invalid inline dollars as plain text", () => {
  assert.deepEqual(tokenizeLatexSegments("Cost is $17 and $ 13"), [
    { type: "text", value: "Cost is $17 and $ 13" },
  ]);
});

test("turns escaped dollars into literal text", () => {
  assert.deepEqual(tokenizeLatexSegments("He deposited \\$3,600"), [
    { type: "text", value: "He deposited $3,600" },
  ]);
});

test("preserves math formulas that begin with numbers", () => {
  assert.deepEqual(tokenizeLatexSegments("$100x + y = 200$"), [
    { type: "math", value: "$100x + y = 200$", delimiter: "$" },
  ]);
});

test("rejects inline math when the opener is followed by whitespace", () => {
  assert.deepEqual(tokenizeLatexSegments("$ 100$"), [
    { type: "text", value: "$ 100$" },
  ]);
});

test("splits mixed text and inline math", () => {
  assert.deepEqual(tokenizeLatexSegments("The cost is $17$ per book"), [
    { type: "text", value: "The cost is " },
    { type: "math", value: "$17$", delimiter: "$" },
    { type: "text", value: " per book" },
  ]);
});

test("parses alternating inline math segments", () => {
  assert.deepEqual(tokenizeLatexSegments("Use $x$ and $y$"), [
    { type: "text", value: "Use " },
    { type: "math", value: "$x$", delimiter: "$" },
    { type: "text", value: " and " },
    { type: "math", value: "$y$", delimiter: "$" },
  ]);
});

test("parses display math with surrounding text", () => {
  assert.deepEqual(tokenizeLatexSegments("Before $$x + y$$ after"), [
    { type: "text", value: "Before " },
    { type: "math", value: "$$x + y$$", delimiter: "$$" },
    { type: "text", value: " after" },
  ]);
});

test("downgrades mismatched display math to plain text", () => {
  assert.deepEqual(tokenizeLatexSegments("Before $$x + y after"), [
    { type: "text", value: "Before $$x + y after" },
  ]);
});

test("keeps escaped dollars as text and still parses later math", () => {
  assert.deepEqual(tokenizeLatexSegments("Price is \\$5 and math is $x+1$"), [
    { type: "text", value: "Price is $5 and math is " },
    { type: "math", value: "$x+1$", delimiter: "$" },
  ]);
});

test("rejects inline math when the closer is preceded by whitespace", () => {
  assert.deepEqual(tokenizeLatexSegments("abc $x $"), [
    { type: "text", value: "abc $x $" },
  ]);
});

test("rejects inline math when the opener is followed by whitespace later in the string", () => {
  assert.deepEqual(tokenizeLatexSegments("abc $ x$"), [
    { type: "text", value: "abc $ x$" },
  ]);
});

test("parses display math even when surrounded by whitespace", () => {
  assert.deepEqual(tokenizeLatexSegments("$$  x + y  $$"), [
    { type: "math", value: "$$  x + y  $$", delimiter: "$$" },
  ]);
});

test("keeps a literal dollar before later inline math", () => {
  assert.deepEqual(tokenizeLatexSegments("\\$ $x$"), [
    { type: "text", value: "$ " },
    { type: "math", value: "$x$", delimiter: "$" },
  ]);
});

test("renders malformed currency-like inline numbers as literal dollars in prose", () => {
  assert.deepEqual(
    normalizeRenderableLatexSegments(
      tokenizeLatexSegments(
        "A book-of-the-month club charges $17$ for the first book purchased during the month and an additional $13$ for each book after the first. Which equation describes this situation, where $y$ is the total cost and $x > 0$?",
      ),
    ),
    [
      {
        type: "text",
        value:
          "A book-of-the-month club charges $17 for the first book purchased during the month and an additional $13 for each book after the first. Which equation describes this situation, where ",
      },
      { type: "math", value: "$y$", delimiter: "$" },
      { type: "text", value: " is the total cost and " },
      { type: "math", value: "$x > 0$", delimiter: "$" },
      { type: "text", value: "?" },
    ],
  );
});

test("renders deposited total amounts as literal currency while keeping variables as math", () => {
  assert.deepEqual(
    normalizeRenderableLatexSegments(
      tokenizeLatexSegments(
        "Micah deposited a total of $3,600$ into two retirement accounts last year by depositing $x$ dollars once each month into one account and $y$ dollars twice each month into the other account.",
      ),
    ),
    [
      {
        type: "text",
        value:
          "Micah deposited a total of $3,600 into two retirement accounts last year by depositing ",
      },
      { type: "math", value: "$x$", delimiter: "$" },
      { type: "text", value: " dollars once each month into one account and " },
      { type: "math", value: "$y$", delimiter: "$" },
      { type: "text", value: " dollars twice each month into the other account." },
    ],
  );
});

test("keeps plain numeric quantities as non-currency text in prose", () => {
  assert.deepEqual(
    normalizeRenderableLatexSegments(
      tokenizeLatexSegments(
        "To win a game show, a contestant needs to score at least $70$ total points from two rounds.",
      ),
    ),
    [
      {
        type: "text",
        value: "To win a game show, a contestant needs to score at least 70 total points from two rounds.",
      },
    ],
  );
});

test("does not turn sold quantities into currency when followed by count nouns", () => {
  assert.deepEqual(
    normalizeRenderableLatexSegments(
      tokenizeLatexSegments(
        "During the first three days of a week, the store sold $128$ bottles of water.",
      ),
    ),
    [
      {
        type: "text",
        value: "During the first three days of a week, the store sold 128 bottles of water.",
      },
    ],
  );
});
