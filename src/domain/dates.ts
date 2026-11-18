/*
 * Date helpers working with local calendar dates ("YYYY-MM-DD").
 * Never use toISOString() for calendar dates: it converts to UTC and can shift the day.
 */
import type { DateString } from './types';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats a Date as local "YYYY-MM-DD". */
export function toLocalDateString(d: Date): DateString {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(now: Date = new Date()): DateString {
  return toLocalDateString(now);
}

/** True for a real calendar date in "YYYY-MM-DD" form (e.g. rejects 2026-02-30). */
export function isValidDateString(value: unknown): value is DateString {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

/** Parses "YYYY-MM-DD" into a local Date at noon (noon avoids DST edge cases). */
export function parseLocalDate(value: DateString): Date {
  const m = DATE_RE.exec(value);
  if (!m) throw new Error(`Ungültiges Datum: ${value}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

export function addDays(value: DateString, days: number): DateString {
  const d = parseLocalDate(value);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

/** "2026-11-18" -> "18.11.2026". Empty input gives an empty string. */
export function formatDate(value: DateString): string {
  if (!isValidDateString(value)) return value;
  const [y, m, d] = value.split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Is the date inside the observation period? Both borders count (inclusive).
 * Empty "from" = no lower limit, empty "to" = open end.
 * String comparison is correct for the fixed "YYYY-MM-DD" format.
 */
export function isInPeriod(date: DateString, from: DateString, to: DateString): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/** Whole days between two dates (b - a). */
export function daysBetween(a: DateString, b: DateString): number {
  const ms = parseLocalDate(b).getTime() - parseLocalDate(a).getTime();
  return Math.round(ms / 86_400_000);
}
