"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Bold, Heading2, Italic, Minus, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Markdown <-> rich DOM
 *
 * Chapters are stored as plain markdown (blank line between paragraphs,
 * `## heading`, `> quote`, `***` scene break, **bold**, *italic*), but the
 * writing surface renders that markdown as real formatting.
 * ------------------------------------------------------------------ */

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

function escapeHtml(text: string) {
  return text.replace(/[&<>]/g, (char) => ESCAPES[char] ?? char);
}

function inlineToHtml(text: string) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

const SCENE_GLYPH = "⁂";

export function markdownToHtml(markdown: string) {
  const blocks = markdown
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  return blocks
    .map((block) => {
      if (/^(\*\s*){3}$/.test(block) || /^-\s*-\s*-$/.test(block) || block === "***") {
        return `<p data-scene="true">${SCENE_GLYPH}</p>`;
      }

      const heading = /^(#{1,3})\s+(.*)$/.exec(block);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${inlineToHtml(heading[2])}</h${level}>`;
      }

      if (block.startsWith(">")) {
        const quoted = block
          .split("\n")
          .map((line) => line.replace(/^>\s?/, ""))
          .join("\n");
        return `<blockquote>${inlineToHtml(quoted)}</blockquote>`;
      }

      if (/^[-*]\s+/.test(block)) {
        const items = block
          .split("\n")
          .map((line) => `<li>${inlineToHtml(line.replace(/^[-*]\s+/, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      return `<p>${inlineToHtml(block)}</p>`;
    })
    .join("");
}

function inlineToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node as Text).data;
  if (!(node instanceof HTMLElement)) return "";

  const tag = node.tagName.toLowerCase();
  const inner = Array.from(node.childNodes).map(inlineToMarkdown).join("");

  if (tag === "strong" || tag === "b") return inner.trim() ? `**${inner}**` : inner;
  if (tag === "em" || tag === "i") return inner.trim() ? `*${inner}*` : inner;
  if (tag === "code") return `\`${inner}\``;
  if (tag === "br") return "\n";
  return inner;
}

export function htmlToMarkdown(root: HTMLElement): string {
  const blocks: string[] = [];

  Array.from(root.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    const tag = child.tagName.toLowerCase();

    if (child.dataset.scene === "true" || child.textContent?.trim() === SCENE_GLYPH) {
      blocks.push("***");
      return;
    }

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const text = inlineToMarkdown(child).trim();
      if (text) blocks.push(`${"#".repeat(Number(tag[1]))} ${text}`);
      return;
    }

    if (tag === "blockquote") {
      const text = inlineToMarkdown(child).trim();
      if (text) {
        blocks.push(
          text
            .split("\n")
            .map((line) => `> ${line}`.trimEnd())
            .join("\n")
        );
      }
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(child.children)
        .map((item) => inlineToMarkdown(item).trim())
        .filter(Boolean)
        .map((item) => `- ${item}`);
      if (items.length) blocks.push(items.join("\n"));
      return;
    }

    const text = inlineToMarkdown(child).replace(/\u200B/g, "").trim();
    if (text) blocks.push(text);
  });

  return blocks.join("\n\n");
}

/* ------------------------------------------------------------------ *
 * Caret helpers — a block kept in place, never rebuilt under the writer
 * ------------------------------------------------------------------ */

function caretToEnd(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function caretOffsetWithin(block: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!block.contains(range.startContainer)) return null;

  const prefix = range.cloneRange();
  prefix.selectNodeContents(block);
  prefix.setEnd(range.startContainer, range.startOffset);
  return prefix.toString().length;
}

function setCaretOffsetWithin(block: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) return;

  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();

  while (node) {
    const length = (node as Text).data.length;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= length;
    node = walker.nextNode();
  }

  caretToEnd(block);
}

/** Empty blocks are invisible in the saved markdown, so they must not linger in
 *  the page either. The block holding the caret is always kept. */
function pruneEmptyBlocks(root: HTMLElement) {
  const selection = window.getSelection();
  const caretBlock =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0).startContainer : null;

  Array.from(root.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (root.children.length === 1) return;
    if (caretBlock && child.contains(caretBlock)) return;

    const hasText = Boolean((child.textContent ?? "").trim());
    const onlyBreak =
      child.childNodes.length === 1 &&
      child.firstChild?.nodeName === "BR" &&
      !hasText;
    const empty = child.childNodes.length === 0 && !hasText;

    if (empty || onlyBreak) child.remove();
  });
}

/* ------------------------------------------------------------------ *
 * Margin marks — the checker's findings, painted on the prose itself
 * ------------------------------------------------------------------ */

const MARK_ATTR = "data-mark";

const SEVERITY_CLASS: Record<string, string> = {
  red: "bg-severity-contradiction-bg decoration-severity-contradiction/70",
  yellow: "bg-severity-warning-bg decoration-severity-warning/70",
  blue: "bg-severity-knowledge-bg decoration-severity-knowledge/70",
};

const SEVERITY_ORDER = ["red", "yellow", "blue"];

function clearMarks(root: HTMLElement) {
  root.querySelectorAll(`mark[${MARK_ATTR}]`).forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  root.normalize();
}

/** Locates a quote within a single block's plain text, snapping to whole words
 *  so character offsets never slice words in half. */
function locateQuoteInBlock(
  blockText: string,
  quote: string
): { start: number; end: number } | null {
  const normBlock = blockText.toLowerCase();
  const normQuote = quote.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normQuote || normQuote.length < 5) return null;

  // 1. Exact full quote match
  let idx = normBlock.indexOf(normQuote);
  if (idx !== -1) {
    return snapToWordBoundaries(blockText, idx, idx + normQuote.length);
  }

  // 2. Clean prefixes (e.g. "Ch.1: Corin Vance...") and outer quotes
  const cleanedQuote = normQuote
    .replace(/^ch(apter)?\.?\s*\d+[:\s-]*/i, "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .trim();
  if (cleanedQuote.length >= 10) {
    idx = normBlock.indexOf(cleanedQuote);
    if (idx !== -1) {
      return snapToWordBoundaries(blockText, idx, idx + cleanedQuote.length);
    }
  }

  // 3. Sliding phrase window of words (at least 4 words or 22 characters)
  const words = cleanedQuote.split(" ").filter(Boolean);
  for (let windowSize = Math.min(words.length, 10); windowSize >= 4; windowSize--) {
    for (let i = 0; i <= words.length - windowSize; i++) {
      const phrase = words.slice(i, i + windowSize).join(" ");
      if (phrase.length < 22) continue;
      idx = normBlock.indexOf(phrase);
      if (idx !== -1) {
        return snapToWordBoundaries(blockText, idx, idx + phrase.length);
      }
    }
  }

  return null;
}

function snapToWordBoundaries(
  text: string,
  start: number,
  end: number
): { start: number; end: number } {
  let s = start;
  let e = end;
  while (s > 0 && /[\w'-]/.test(text[s - 1])) s--;
  while (e < text.length && /[\w'-]/.test(text[e])) e++;
  return { start: s, end: e };
}

/** Finds a text range across the text nodes of a single block. */
function createRangeInBlock(
  block: HTMLElement,
  start: number,
  end: number
): Range | null {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let cursor = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;
  let node = walker.nextNode();

  while (node) {
    const textNode = node as Text;
    const len = textNode.data.length;
    const nodeEnd = cursor + len;

    if (!startNode && start >= cursor && start <= nodeEnd) {
      startNode = textNode;
      startOffset = start - cursor;
    }
    if (end >= cursor && end <= nodeEnd) {
      endNode = textNode;
      endOffset = end - cursor;
      break;
    }

    cursor = nodeEnd;
    node = walker.nextNode();
  }

  if (startNode && endNode) {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }
  return null;
}

function decorateMarks(root: HTMLElement, marks: EditorMark[]) {
  const selection = window.getSelection();
  const focused = root.contains(document.activeElement);

  let caret: { blockIndex: number; offset: number } | null = null;
  if (focused && selection && selection.rangeCount > 0) {
    const block = Array.from(root.children).find((child) =>
      child.contains(selection.getRangeAt(0).startContainer)
    );
    const offset = block instanceof HTMLElement ? caretOffsetWithin(block) : null;
    if (block instanceof HTMLElement && offset !== null) {
      caret = { blockIndex: Array.from(root.children).indexOf(block), offset };
    }
  }

  // Clear existing marks first and normalize DOM nodes
  clearMarks(root);

  if (!marks.length) {
    if (caret) {
      const block = root.children[caret.blockIndex];
      if (block instanceof HTMLElement) setCaretOffsetWithin(block, caret.offset);
    }
    return;
  }

  // Process block by block. This guarantees that DOM mutations in one block
  // never drift or corrupt character offsets in any other block.
  Array.from(root.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (child.dataset.scene === "true") return;

    child.normalize();
    const blockText = child.textContent ?? "";
    if (!blockText.trim()) return;

    // Collect all matches inside this specific block
    type RawMatch = { start: number; end: number; mark: EditorMark };
    const matches: RawMatch[] = [];

    for (const mark of marks) {
      const located = locateQuoteInBlock(blockText, mark.quote);
      if (located) {
        matches.push({ start: located.start, end: located.end, mark });
      }
    }

    if (!matches.length) return;

    // Merge overlapping matches within this block
    matches.sort((a, b) => a.start - b.start || b.end - a.end);
    const groups: Array<{ start: number; end: number; marks: EditorMark[] }> = [];

    for (const match of matches) {
      const last = groups[groups.length - 1];
      if (last && match.start < last.end) {
        last.end = Math.max(last.end, match.end);
        if (!last.marks.some((m) => m.id === match.mark.id)) {
          last.marks.push(match.mark);
        }
      } else {
        groups.push({ start: match.start, end: match.end, marks: [match.mark] });
      }
    }

    // Wrap matches in DESCENDING order of start so DOM insertions at higher offsets
    // never alter text node positions or lengths of earlier matches.
    groups.sort((a, b) => b.start - a.start);

    for (const group of groups) {
      const range = createRangeInBlock(child, group.start, group.end);
      if (!range) continue;

      const primary = group.marks[0];
      const severity =
        [...group.marks]
          .map((m) => m.severity)
          .sort((a, b) => SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b))[0] ?? "red";

      const markElement = document.createElement("mark");
      markElement.setAttribute(MARK_ATTR, primary.id);
      markElement.setAttribute("data-marks", group.marks.map((m) => m.id).join(" "));
      markElement.dataset.severity = severity;
      if (group.marks.length > 1) {
        markElement.dataset.count = String(group.marks.length);
        markElement.title = `${group.marks.length} findings on this passage`;
      }
      markElement.className = [
        "cursor-pointer rounded-[2px] px-[1px] text-ink-bone underline decoration-1 underline-offset-[3px] transition-colors",
        "hover:bg-wine-accent/20",
        "[&.is-flash]:bg-wine-accent/30",
        SEVERITY_CLASS[severity] ?? SEVERITY_CLASS.red,
      ].join(" ");

      try {
        range.surroundContents(markElement);
      } catch {
        try {
          const fragment = range.extractContents();
          markElement.appendChild(fragment);
          range.insertNode(markElement);
        } catch {
          // Silent fallback for cross-tag ranges
        }
      }
    }
  });

  if (caret) {
    const block = root.children[caret.blockIndex];
    if (block instanceof HTMLElement) setCaretOffsetWithin(block, caret.offset);
  }
}

/* ------------------------------------------------------------------ */

export type EditorMark = {
  id: string;
  quote: string;
  severity: string;
};

export type MarkdownEditorHandle = {
  focus: () => void;
  find: (query: string, direction: 1 | -1) => void;
  replaceCurrent: (query: string, replacement: string) => void;
  focusMark: (id: string, quote?: string) => void;
};

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  marks?: EditorMark[];
  activeMarkId?: string | null;
  onMarkClick?: (id: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  onParagraphChange?: (paragraph: number) => void;
  onRequestSave?: () => void;
  onRequestFind?: () => void;
  minHeightClassName?: string;
  posture?: "write" | "review";
  isFindOpen?: boolean;
};

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(
    {
      value,
      onChange,
      marks = [],
      activeMarkId = null,
      onMarkClick,
      placeholder = "Begin here. The page is yours.",
      ariaLabel = "Chapter text",
      onParagraphChange,
      onRequestSave,
      onRequestFind,
      minHeightClassName = "min-h-[56vh]",
      posture = "write",
      isFindOpen = false,
    },
    ref
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const lastEmitted = useRef<string | null>(null);
    const matchCursor = useRef(-1);
    const lastQuery = useRef("");
    const lastMarks = useRef<EditorMark[] | null>(null);

    const [isEmpty, setIsEmpty] = useState(!value.trim());
    // Read once on the client; the server always paints the Mac glyphs.
    const isMac = useSyncExternalStore(
      () => () => {},
      () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
      () => true
    );
    const [formats, setFormats] = useState({
      bold: false,
      italic: false,
      heading: false,
      quote: false,
    });
    const [floatingMenu, setFloatingMenu] = useState<{ x: number; y: number } | null>(null);

    // Paint the markdown into the editable surface only when the value arrives
    // from outside (chapter load, restore, replace-all). Our own keystrokes are
    // already in the DOM, so re-rendering them would move the caret.
    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;

      const repainted = value !== lastEmitted.current;
      if (repainted) {
        root.innerHTML = markdownToHtml(value);
        lastEmitted.current = value;
        setIsEmpty(!value.trim());
      }

      // Marks are only redrawn when the chapter is repainted or the findings
      // themselves change, never on every keystroke.
      if (repainted || lastMarks.current !== marks) {
        decorateMarks(root, marks);
        lastMarks.current = marks;
      }
    }, [value, marks]);

    // Bring the matching passage into view, with a short flash so the eye can
    // find it, whenever the margin chooses a note.
    useEffect(() => {
      const root = rootRef.current;
      if (!root || !activeMarkId) return;

      const escaped = activeMarkId.replace(/"/g, '\\"');
      const target = root.querySelector<HTMLElement>(
        `mark[${MARK_ATTR}="${escaped}"], mark[data-marks~="${escaped}"]`
      );
      if (!target) return;

      target.scrollIntoView({ block: "center", behavior: "smooth" });
      root.querySelectorAll("mark.is-flash").forEach((el) => el.classList.remove("is-flash"));
      target.classList.add("is-flash");
      const timer = window.setTimeout(() => target.classList.remove("is-flash"), 1600);
      return () => window.clearTimeout(timer);
    }, [activeMarkId, marks]);

    // Clicking the marked words selects the note in the margin.
    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;

      const handleClick = (event: MouseEvent) => {
        const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
          `mark[${MARK_ATTR}]`
        );
        if (!target) return;
        const id = target.getAttribute(MARK_ATTR);
        if (id) onMarkClick?.(id);
      };

      root.addEventListener("click", handleClick);
      return () => root.removeEventListener("click", handleClick);
    }, [onMarkClick]);

    const emitChange = useCallback(() => {
      const root = rootRef.current;
      if (!root) return;
      pruneEmptyBlocks(root);
      const markdown = htmlToMarkdown(root);
      lastEmitted.current = markdown;
      setIsEmpty(!markdown.trim());
      onChange(markdown);
    }, [onChange]);

    const currentBlock = useCallback((): HTMLElement | null => {
      const root = rootRef.current;
      const selection = window.getSelection();
      if (!root || !selection || selection.rangeCount === 0) return null;

      const node: Node | null = selection.getRangeAt(0).startContainer;
      if (!root.contains(node)) return null;

      let element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
      while (element && element.parentElement !== root) {
        element = element.parentElement;
      }
      return element;
    }, []);

    const refreshFormats = useCallback(() => {
      const block = currentBlock();
      const tag = block?.tagName.toLowerCase();
      setFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        heading: tag === "h2" || tag === "h3",
        quote: tag === "blockquote",
      });
    }, [currentBlock]);

    const applyInline = (command: "bold" | "italic") => {
      const root = rootRef.current;
      if (!root) return;
      root.focus();
      document.execCommand(command);
      refreshFormats();
      emitChange();
    };

    const applyBlock = (tag: "h2" | "blockquote") => {
      const root = rootRef.current;
      if (!root) return;
      root.focus();

      const block = currentBlock();
      if (!block) {
        const created = document.createElement(tag);
        created.innerHTML = "<br>";
        root.appendChild(created);
        caretToEnd(created);
        emitChange();
        return;
      }

      const offset = caretOffsetWithin(block);
      const isSameTag = block.tagName.toLowerCase() === tag;
      const replacement = document.createElement(isSameTag ? "p" : tag);
      replacement.innerHTML = block.innerHTML || "<br>";
      block.replaceWith(replacement);

      if (offset === null) caretToEnd(replacement);
      else setCaretOffsetWithin(replacement, offset);

      root.focus();
      if (offset !== null) setCaretOffsetWithin(replacement, offset);
      refreshFormats();
      emitChange();
    };

    const insertSceneBreak = () => {
      const root = rootRef.current;
      const selection = window.getSelection();
      if (!root || !selection || selection.rangeCount === 0) return;
      root.focus();

      const scene = document.createElement("p");
      scene.dataset.scene = "true";
      scene.textContent = SCENE_GLYPH;

      const after = document.createElement("p");
      after.innerHTML = "<br>";

      const block = currentBlock();
      if (block && block.parentElement === root) {
        const range = selection.getRangeAt(0);
        const hasText = Boolean((block.textContent ?? "").trim());
        const caretInBlock = block.contains(range.startContainer);

        if (caretInBlock && hasText) {
          const tail = document.createRange();
          tail.setStart(range.startContainer, range.startOffset);
          tail.setEnd(block, block.childNodes.length);
          after.appendChild(tail.extractContents());
        }

        block.after(after);
        block.after(scene);
      } else {
        root.append(scene, after);
      }

      caretToEnd(after);
      emitChange();
    };

    const insertPastedText = (text: string) => {
      const root = rootRef.current;
      const selection = window.getSelection();
      if (!root || !selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      range.deleteContents();

      if (!/\n/.test(text.trim())) {
        const node = document.createTextNode(text.replace(/\r?\n/g, " "));
        range.insertNode(node);
        const after = document.createRange();
        after.setStart(node, node.data.length);
        after.collapse(true);
        selection.removeAllRanges();
        selection.addRange(after);
        emitChange();
        return;
      }

      const parsed = document.createElement("div");
      parsed.innerHTML = markdownToHtml(text.trim());
      const pasted = Array.from(parsed.children).filter(
        (node): node is HTMLElement => node instanceof HTMLElement
      );
      if (pasted.length === 0) return;

      const host = currentBlock();
      let tail: HTMLElement | null = null;

      if (host) {
        const tailRange = document.createRange();
        tailRange.setStart(range.startContainer, range.startOffset);
        tailRange.setEnd(host, host.childNodes.length);
        const tailFragment = tailRange.extractContents();
        tail = document.createElement(host.tagName.toLowerCase());
        tail.appendChild(tailFragment);
      }

      let anchor: HTMLElement | null = host;
      pasted.forEach((node) => {
        if (anchor) anchor.after(node);
        else root.appendChild(node);
        anchor = node;
      });

      if (tail && ((tail.textContent ?? "").trim() || tail.children.length > 0)) {
        anchor?.after(tail);
      }

      const landing = anchor ?? root.lastElementChild;
      if (landing instanceof HTMLElement) caretToEnd(landing);

      emitChange();
    };

    const focusMark = useCallback((id: string, quote?: string) => {
      const root = rootRef.current;
      if (!root) return;

      root.querySelectorAll(".is-flash").forEach((el) => el.classList.remove("is-flash"));

      const escaped = id.replace(/"/g, '\\"');
      const target = root.querySelector<HTMLElement>(
        `mark[${MARK_ATTR}="${escaped}"], mark[data-marks~="${escaped}"]`
      );

      if (target) {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        target.classList.add("is-flash");
        window.setTimeout(() => target.classList.remove("is-flash"), 1600);
        return;
      }

      // Not every finding's excerpt appears verbatim in the prose. Fall back to
      // the paragraph that shares the most words with it, so the click still
      // lands somewhere true.
      if (!quote) return;
      const keywords = (quote.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter(
        (word) => word.length > 3
      );
      if (keywords.length === 0) return;

      let best: HTMLElement | null = null;
      let bestScore = 0;

      Array.from(root.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        const text = (child.textContent ?? "").toLowerCase();
        const seen = new Set<string>();
        let score = 0;
        keywords.forEach((word) => {
          if (!seen.has(word) && text.includes(word)) {
            seen.add(word);
            score += 1;
          }
        });
        if (score > bestScore) {
          bestScore = score;
          best = child;
        }
      });

      if (!best || bestScore < 2) return;
      (best as HTMLElement).scrollIntoView({ block: "center", behavior: "smooth" });
      (best as HTMLElement).classList.add("is-flash");
      window.setTimeout(() => (best as HTMLElement | null)?.classList.remove("is-flash"), 1600);
    }, []);

    const find = useCallback((query: string, direction: 1 | -1) => {
      const root = rootRef.current;
      if (!root || !query) return;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const matches: Array<{ node: Text; start: number; end: number }> = [];
      const needle = query.toLowerCase();
      let node = walker.nextNode();

      while (node) {
        const text = (node as Text).data.toLowerCase();
        let index = text.indexOf(needle);
        while (index !== -1) {
          matches.push({ node: node as Text, start: index, end: index + needle.length });
          index = text.indexOf(needle, index + needle.length);
        }
        node = walker.nextNode();
      }

      if (matches.length === 0) return;

      if (lastQuery.current !== query) {
        lastQuery.current = query;
        matchCursor.current = -1;
      }

      matchCursor.current = (matchCursor.current + direction + matches.length) % matches.length;
      const match = matches[matchCursor.current];

      const range = document.createRange();
      range.setStart(match.node, match.start);
      range.setEnd(match.node, match.end);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      root.focus();
      match.node.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, []);

    const replaceCurrent = useCallback(
      (query: string, replacement: string) => {
        const root = rootRef.current;
        const selection = window.getSelection();
        if (!root || !selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed || range.toString().toLowerCase() !== query.toLowerCase()) {
          find(query, 1);
          return;
        }

        range.deleteContents();
        const inserted = document.createTextNode(replacement);
        range.insertNode(inserted);

        const after = document.createRange();
        after.setStart(inserted, replacement.length);
        after.collapse(true);
        selection.removeAllRanges();
        selection.addRange(after);
        root.focus();
        emitChange();
      },
      [emitChange, find]
    );

    useImperativeHandle(ref, () => ({
      focus: () => rootRef.current?.focus(),
      find,
      replaceCurrent,
      focusMark,
    }));

    // Paragraph indicator and the floating format menu follow the selection (PR #48).
    useEffect(() => {
      const handleSelectionChange = () => {
        const root = rootRef.current;
        const selection = window.getSelection();
        if (!root || !selection || selection.rangeCount === 0) {
          setFloatingMenu(null);
          return;
        }

        const range = selection.getRangeAt(0);
        if (!root.contains(range.commonAncestorContainer) && !root.contains(range.startContainer)) {
          setFloatingMenu(null);
          return;
        }

        if (selection.isCollapsed || selection.toString().trim().length === 0) {
          setFloatingMenu(null);
          refreshFormats();
          return;
        }

        const rect = range.getBoundingClientRect();
        setFloatingMenu({
          x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 160),
          y: Math.max(rect.top - 8, 72),
        });

        refreshFormats();

        const block = currentBlock();
        if (block && onParagraphChange) {
          const index = Array.from(root.children).indexOf(block);
          onParagraphChange(index + 1);
        }
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      return () => document.removeEventListener("selectionchange", handleSelectionChange);
    }, [currentBlock, onParagraphChange, refreshFormats]);

    return (
      <div className="mt-4">
        {/* Format bar — attached as a sleek subheading deck right below chapter title */}
        <div
          className={cn(
            "sticky z-20 flex items-center justify-between border-b border-border-quiet/50 bg-surface-card/90 backdrop-blur-md py-2 mb-5 transition-all w-full",
            isFindOpen ? "top-[49px]" : "top-0"
          )}
        >
          <div className="flex items-center gap-0.5">
            <FormatButton label="Heading" active={formats.heading} onClick={() => applyBlock("h2")}>
              <Heading2 className="h-3.5 w-3.5" />
            </FormatButton>
            <FormatButton label="Bold" active={formats.bold} onClick={() => applyInline("bold")}>
              <Bold className="h-3.5 w-3.5" />
            </FormatButton>
            <FormatButton label="Italic" active={formats.italic} onClick={() => applyInline("italic")}>
              <Italic className="h-3.5 w-3.5" />
            </FormatButton>
            <span aria-hidden className="mx-1 h-3.5 w-px bg-border-quiet/60" />
            <FormatButton label="Quote" active={formats.quote} onClick={() => applyBlock("blockquote")}>
              <Quote className="h-3.5 w-3.5" />
            </FormatButton>
            <FormatButton label="Scene break" onClick={insertSceneBreak}>
              <Minus className="h-3.5 w-3.5" />
            </FormatButton>
          </div>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint/60 sm:inline">
            {isMac ? "⌘B bold · ⌘I italic" : "Ctrl+B bold · Ctrl+I italic"}
          </span>
        </div>

        {/* Floating formatting toolbar, only over a text selection — PR #48 */}
        {floatingMenu && (
          <div
            className="fixed z-50 flex items-center gap-0.5 rounded border border-border-quiet bg-surface-elevated px-1.5 py-1 shadow-xl backdrop-blur select-none"
            style={{
              left: floatingMenu.x,
              top: floatingMenu.y,
              transform: "translate(-50%, -120%)",
            }}
          >
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyInline("bold")}
              aria-label="Bold"
              className={cn(
                "flex h-7 w-7 items-center justify-center font-serif text-[13px] font-bold rounded transition-colors",
                formats.bold
                  ? "bg-white/[0.12] text-ink-parchment"
                  : "text-ink-ash hover:text-ink-parchment hover:bg-white/[0.05]"
              )}
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyInline("italic")}
              aria-label="Italic"
              className={cn(
                "flex h-7 w-7 items-center justify-center font-serif text-[13px] italic rounded transition-colors",
                formats.italic
                  ? "bg-white/[0.12] text-ink-parchment"
                  : "text-ink-ash hover:text-ink-parchment hover:bg-white/[0.05]"
              )}
            >
              I
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyBlock("h2")}
              aria-label="Heading"
              className={cn(
                "flex h-7 w-7 items-center justify-center font-serif text-[11px] uppercase tracking-wide rounded transition-colors",
                formats.heading
                  ? "bg-white/[0.12] text-ink-parchment"
                  : "text-ink-ash hover:text-ink-parchment hover:bg-white/[0.05]"
              )}
            >
              H
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyBlock("blockquote")}
              aria-label="Quote"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded transition-colors",
                formats.quote
                  ? "bg-white/[0.12] text-ink-parchment"
                  : "text-ink-ash hover:text-ink-parchment hover:bg-white/[0.05]"
              )}
            >
              <Quote className="h-3 w-3" />
            </button>
            <span aria-hidden className="mx-0.5 h-4 w-px bg-border-quiet" />
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={insertSceneBreak}
              aria-label="Scene break"
              className="flex h-7 w-7 items-center justify-center font-serif text-[12px] text-ink-ash rounded transition-colors hover:text-ink-parchment hover:bg-white/[0.05]"
            >
              ⁂
            </button>
          </div>
        )}

        <div className="relative">
          {isEmpty && (
            <p className="pointer-events-none absolute left-0 top-6 font-prose text-[18.5px] leading-[1.95] text-ink-faint/50 sm:text-[19px]">
              {placeholder}
            </p>
          )}
          <div
            ref={rootRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={ariaLabel}
            spellCheck
            onInput={emitChange}
            onBlur={emitChange}
            onPaste={(event) => {
              event.preventDefault();
              insertPastedText(event.clipboardData.getData("text/plain"));
            }}
            onKeyDown={(event) => {
              const modifier = event.metaKey || event.ctrlKey;
              if (modifier && event.key.toLowerCase() === "s") {
                event.preventDefault();
                onRequestSave?.();
                return;
              }
              if (modifier && event.key.toLowerCase() === "f") {
                event.preventDefault();
                onRequestFind?.();
              }
            }}
            className={[
              "mt-5 w-full bg-transparent font-prose text-[18px] leading-[1.75] text-ink-bone outline-none sm:text-[18.5px]",
              minHeightClassName,
              "[&_p]:my-0 [&_p]:mb-[0.65em] [&_p:last-child]:mb-0",
              "[&_h2]:mb-[0.55em] [&_h2]:mt-[1.35em] [&_h2]:font-serif [&_h2]:text-[26px] [&_h2]:font-normal [&_h2]:leading-snug [&_h2]:tracking-tight [&_h2]:text-ink-parchment",
              "[&_h2:first-child]:mt-0",
              "[&_h3]:mb-[0.45em] [&_h3]:mt-[1.2em] [&_h3]:font-serif [&_h3]:text-[21px] [&_h3]:font-normal [&_h3]:text-ink-parchment",
              "[&_blockquote]:my-[1.1em] [&_blockquote]:border-l-2 [&_blockquote]:border-wine-accent/40 [&_blockquote]:pl-4 [&_blockquote]:font-prose [&_blockquote]:italic [&_blockquote]:text-ink-ash",
              "[&_ul]:my-[0.9em] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-ink-faint",
              "[&_li]:mb-[0.35em]",
              "[&_code]:rounded [&_code]:bg-surface-elevated [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-ink-parchment",
              "[&_[data-scene]]:my-[1.6em] [&_[data-scene]]:text-center [&_[data-scene]]:text-[15px] [&_[data-scene]]:tracking-[0.5em] [&_[data-scene]]:text-ink-faint/70",
              "[&_.is-flash]:bg-wine-accent/10 [&_.is-flash]:transition-colors",
              "[&_mark[data-count]]:decoration-double",
            ].join(" ")}
          />
        </div>
      </div>
    );
  }
);

function FormatButton({
  label,
  onClick,
  children,
  active = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={[
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-wine-accent/15 text-wine-accent"
          : "text-ink-faint hover:bg-surface-elevated hover:text-ink-parchment",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
