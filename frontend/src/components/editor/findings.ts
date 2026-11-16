import type { Issue } from "@/lib/types";

export const SEVERITY_DOT: Record<string, string> = {
  red: "bg-severity-contradiction",
  yellow: "bg-severity-warning",
  blue: "bg-severity-knowledge",
};

export const SEVERITY_WORD: Record<string, string> = {
  red: "pulls the story apart",
  yellow: "worth a look",
  blue: "a matter of style",
};

const TYPE_LABELS: Record<string, string> = {
  contradiction: "Contradiction",
  knowledge_violation: "Knowledge violation",
  dangling_object: "Dangling object",
  spatiotemporal_conflict: "Timeline conflict",
  custody_paradox: "Custody paradox",
  world_rule_violation: "World-rule violation",
  continuity_note: "Continuity note",
};

const STATUS_SENTENCE: Record<string, string> = {
  open: "open",
  accepted: "a slip to fix",
  intentional: "kept on purpose",
  rejected: "not an issue",
  resolved: "resolved",
  ignored: "dismissed",
};

export const isOpen = (issue: Issue) => !issue.status || issue.status === "open";

export const typeLabel = (issue: Issue) =>
  TYPE_LABELS[issue.type] ?? (issue.type || "issue").replace(/_/g, " ");

export const statusSentence = (issue: Issue) =>
  STATUS_SENTENCE[issue.status || "open"] ?? issue.status;

/** The quotation that belongs to a given chapter, not just the first recorded. */
export function quoteForChapter(issue: Issue, chapter: number) {
  return (
    issue.evidence?.find((item) => item.chapter === chapter)?.quote ??
    issue.evidence?.[0]?.quote ??
    ""
  );
}

/** The evidence chapter to open first: this one if the issue touches it. */
export function chapterFor(issue: Issue, current: number) {
  return (
    issue.evidence?.find((item) => item.chapter === current)?.chapter ??
    issue.evidence?.[0]?.chapter ??
    current
  );
}

export function evidenceChapters(issue: Issue) {
  return Array.from(
    new Set(
      (issue.evidence ?? [])
        .map((item) => item.chapter)
        .filter((chapter): chapter is number => typeof chapter === "number")
    )
  ).sort((a, b) => a - b);
}

/** Which paragraph of the chapter holds the quote — 1-based, null if unfound. */
export function paragraphOfQuote(content: string, quote?: string | null): number | null {
  if (!content || !quote) return null;
  const normalized = quote.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized) return null;

  const attempts = [
    normalized.slice(0, 48),
    normalized.slice(0, 32),
    normalized.split(" ").slice(0, 7).join(" "),
  ].filter((attempt) => attempt.length >= 14);

  if (attempts.length === 0) return null;

  const paragraphs = content.split(/\n\s*\n/);
  for (let index = 0; index < paragraphs.length; index += 1) {
    const text = paragraphs[index].replace(/\s+/g, " ").toLowerCase();
    if (attempts.some((attempt) => text.includes(attempt))) return index + 1;
  }

  return null;
}

/** Margin notes follow the page, so findings are ordered by where they land. */
export function orderByParagraph(issues: Issue[], content: string, chapter: number) {
  return issues
    .map((issue) => ({
      issue,
      paragraph: paragraphOfQuote(content, quoteForChapter(issue, chapter)),
    }))
    .sort(
      (a, b) =>
        (a.paragraph ?? Number.MAX_SAFE_INTEGER) - (b.paragraph ?? Number.MAX_SAFE_INTEGER)
    )
    .map((entry) => entry.issue);
}
