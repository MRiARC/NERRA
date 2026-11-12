import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes cleanly without conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format raw word count into a human-readable literary metric.
 * e.g. 51960 -> "51,960 words"
 */
export function formatWords(count: number | null | undefined): string {
  if (count === null || count === undefined) return "0 words";
  return `${count.toLocaleString()} words`;
}

/**
 * Format ISO date string into readable literary date.
 * e.g. "2026-11-11T12:00:00Z" -> "Nov 11, 2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Estimated reading time in minutes (based on standard 225 wpm).
 */
export function estimateReadingTime(words: number | null | undefined): string {
  if (!words || words <= 0) return "< 1 min read";
  const mins = Math.ceil(words / 225);
  return `${mins} min read`;
}
