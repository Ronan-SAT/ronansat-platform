import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RHETORICAL_SYNTHESIS_INTRO } from "@/lib/testManagerReview";

type QuestionRow = {
  id: string;
  passage: string | null;
  domain: string | null;
  skill: string | null;
  position: number;
  test_sections: {
    name: string;
    module_number: number | null;
    tests: {
      title: string;
      visibility: "public" | "private";
    } | null;
  } | null;
};

type Patch = {
  id: string;
  title: string;
  label: string;
  original: string;
  suggested: string;
  reason: string;
};

const execute = process.argv.includes("--execute");
const showSuggested = process.argv.includes("--show-suggested");
const sampleLimit = Number.parseInt(process.argv.find((arg) => arg.startsWith("--sample="))?.split("=")[1] ?? "12", 10);

function stripIntro(passage: string) {
  return passage.replace(RHETORICAL_SYNTHESIS_INTRO, "").trim();
}

function normalizeExistingBullets(notes: string) {
  if (!/(?:^|\n|<br\s*\/?>)\s*[-*]\s+/i.test(notes)) {
    return null;
  }

  const normalized = notesToCleanHyphenList(
    notes
      .replace(/<br\s*\/?>/gi, "\n")
      .split(/\n+/)
      .map(cleanNoteText)
      .filter(Boolean),
  );

  return normalized || null;
}

function splitSentencesConfidently(notes: string) {
  const normalized = notes.replace(/\s+/g, " ").trim();
  if (!normalized || /(?:Mr|Mrs|Ms|Dr|Prof|U\.S|U\.K|e\.g|i\.e)\./i.test(normalized)) {
    return null;
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length < 2 || sentences.some((sentence) => !/[.!?]$/.test(sentence) || sentence.length < 18)) {
    return null;
  }

  return notesToCleanHyphenList(sentences);
}

function cleanNoteText(value: string) {
  return value
    .trim()
    .replace(/^[\s\-\u2022*.]+/u, "")
    .trim();
}

function notesToCleanHyphenList(notes: string[]) {
  return notes.map(cleanNoteText).filter(Boolean).map((note) => `- ${note}`).join("<br>");
}

function cleanupIntroRemainder(value: string) {
  return value.replace(/^(?:\s|<br\s*\/?>|[\-\u2022*.])+/giu, "").trim();
}

function normalizeBulletSpacing(value: string) {
  const introIndex = value.indexOf(RHETORICAL_SYNTHESIS_INTRO);
  if (introIndex < 0) {
    return value;
  }

  const beforeIntro = value.slice(0, introIndex + RHETORICAL_SYNTHESIS_INTRO.length);
  const afterIntro = cleanupIntroRemainder(value.slice(introIndex + RHETORICAL_SYNTHESIS_INTRO.length));
  const notes = afterIntro
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\n+/)
    .map(cleanNoteText)
    .filter(Boolean);

  return notes.length > 0 ? `${beforeIntro}<br>${notesToCleanHyphenList(notes)}` : beforeIntro;
}

function rebuildCleanIntroList(passage: string) {
  const normalized = passage.trim().replace(/<br\s*\/?>/gi, "<br>");
  const introIndex = normalized.indexOf(RHETORICAL_SYNTHESIS_INTRO);
  const rawNotes = introIndex >= 0
    ? normalized.slice(introIndex + RHETORICAL_SYNTHESIS_INTRO.length)
    : normalized;
  const cleanNotes = rawNotes
    .replace(/<br>/gi, "\n")
    .split(/\n+/)
    .map(cleanNoteText)
    .filter((line) => line.length > 0);

  if (cleanNotes.length === 0) {
    return null;
  }

  return `${RHETORICAL_SYNTHESIS_INTRO}<br>${notesToCleanHyphenList(cleanNotes)}`;
}

function applyAggressiveBrBulletRules(passage: string) {
  const rebuilt = rebuildCleanIntroList(passage);
  if (rebuilt) {
    return {
      suggested: rebuilt,
      confident: true,
    };
  }

  let suggested = passage.trim();
  if (!suggested.includes(RHETORICAL_SYNTHESIS_INTRO)) {
    suggested = `${RHETORICAL_SYNTHESIS_INTRO}<br>- ${suggested}`;
  }

  suggested = suggested.replace(/<br\s*\/?>/gi, "<br>");

  const introIndex = suggested.indexOf(RHETORICAL_SYNTHESIS_INTRO);
  if (introIndex >= 0) {
    const introEnd = introIndex + RHETORICAL_SYNTHESIS_INTRO.length;
    const afterIntro = cleanupIntroRemainder(suggested.slice(introEnd));
    const firstContent = afterIntro.match(/^\s*/)?.[0] ?? "";
    const firstContentIndex = firstContent.length;
    if (afterIntro[firstContentIndex] !== "-") {
      suggested = `${suggested.slice(0, introEnd)}<br>- ${afterIntro.slice(firstContentIndex)}`;
    } else {
      suggested = `${suggested.slice(0, introEnd)}<br>${afterIntro.slice(firstContentIndex)}`;
    }
  }

  suggested = suggested.replace(/<br>\s*(?!-)/gi, "<br>- ");
  suggested = normalizeBulletSpacing(suggested);
  suggested = suggested.replace(/(?:<br>\s*){2,}/gi, "<br>");

  const introPattern = RHETORICAL_SYNTHESIS_INTRO.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hasIntroBullet = new RegExp(`${introPattern}<br>-\\s+`).test(suggested);
  const allBreaksAreBullets = [...suggested.matchAll(/<br>/gi)].every((match) => {
    const afterBreak = suggested.slice((match.index ?? 0) + match[0].length);
    return /^\s*-\s+/.test(afterBreak);
  });

  return {
    suggested,
    confident: hasIntroBullet && allBreaksAreBullets,
  };
}

function buildSuggestedPassage(passage: string) {
  const hadIntro = passage.includes(RHETORICAL_SYNTHESIS_INTRO);
  const notes = hadIntro ? stripIntro(passage) : passage.trim();
  const formattedNotes = normalizeExistingBullets(notes) ?? splitSentencesConfidently(notes);

  if (!formattedNotes) {
    const aggressive = applyAggressiveBrBulletRules(passage);
    if (aggressive.confident && aggressive.suggested !== passage) {
      return {
        suggested: aggressive.suggested,
        confident: true,
        reason: "aggressive-br-bullet-sync",
      };
    }

    return {
      suggested: hadIntro ? passage : `${RHETORICAL_SYNTHESIS_INTRO}\n${notes}`.trim(),
      confident: !hadIntro,
      reason: hadIntro ? "ambiguous-boundaries" : "prepend-intro-only",
    };
  }

  return {
    suggested: `${RHETORICAL_SYNTHESIS_INTRO}<br>${formattedNotes}`,
    confident: true,
    reason: hadIntro ? "format-notes" : "prepend-intro-and-format-notes",
  };
}

function buildPatch(row: QuestionRow): Patch | null {
  const passage = row.passage?.trim() ?? "";
  if (!passage || row.domain !== "Expression of Ideas" || row.skill !== "Rhetorical Synthesis") {
    return null;
  }

  const { suggested, confident, reason } = buildSuggestedPassage(passage);
  if (!confident || suggested === passage) {
    return null;
  }

  return {
    id: row.id,
    title: row.test_sections?.tests?.title ?? "Untitled test",
    label: `${row.test_sections?.name ?? "Unknown"} M${row.test_sections?.module_number ?? "?"} Q${row.position}`,
    original: passage,
    suggested,
    reason,
  };
}

async function main() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      `
        id,
        passage,
        domain,
        skill,
        position,
        test_sections!inner (
          name,
          module_number,
          tests!inner (
            title,
            visibility
          )
        )
      `,
    )
    .eq("domain", "Expression of Ideas")
    .eq("skill", "Rhetorical Synthesis")
    .eq("test_sections.tests.visibility", "public")
    .returns<QuestionRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const patches = rows.map(buildPatch).filter((patch): patch is Patch => Boolean(patch));
  const ambiguous = rows.filter((row) => {
    const passage = row.passage?.trim() ?? "";
    if (!passage) return false;
    const result = buildSuggestedPassage(passage);
    return !result.confident;
  });

  console.log(JSON.stringify({
    mode: execute ? "execute" : "dry-run",
    strictRhetoricalRows: rows.length,
    autoFixRows: patches.length,
    ambiguousManualReviewRows: ambiguous.length,
  }, null, 2));

  for (const patch of patches.slice(0, Number.isFinite(sampleLimit) ? sampleLimit : 12)) {
    console.log(JSON.stringify({
      id: patch.id,
      title: patch.title,
      question: patch.label,
      reason: patch.reason,
      suggested: showSuggested ? patch.suggested : undefined,
    }));
  }

  if (!execute) {
    console.log("Dry run only. Re-run with --execute to update Supabase.");
    return;
  }

  for (const patch of patches) {
    const { error: updateError } = await supabase.from("questions").update({ passage: patch.suggested }).eq("id", patch.id);
    if (updateError) {
      throw new Error(`Failed to update question ${patch.id}: ${updateError.message}`);
    }
  }

  console.log(`Updated ${patches.length} Rhetorical Synthesis passages.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
