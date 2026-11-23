import type { Request } from 'express';

/**
 * Shared query-filter helpers for the CRM module.
 * Every CRM list endpoint accepts its filters as query strings; these helpers
 * normalise `req.query` and answer the three questions every filter asks:
 * is the text present, does the value match, and does the date fall in range.
 */

export type CrmQuery = Record<string, string>;

/** First entry of each requested key, trimmed. Empty values are dropped. */
export function readQuery(req: Request, ...keys: string[]): CrmQuery {
  const source = (req.query ?? {}) as Record<string, unknown>;
  const wanted = keys.length > 0 ? keys : Object.keys(source);
  const out: CrmQuery = {};
  for (const key of wanted) {
    const raw = source[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === 'string' && value.trim()) out[key] = value.trim();
  }
  return out;
}

/** Case-insensitive substring match on `q`. No `q` (or no fields) means "match everything". */
export function textMatch(query: CrmQuery, ...fields: Array<string | null | undefined>): boolean {
  return textMatchKey(query, 'q', ...fields);
}

/** Same as `textMatch`, but reads the needle from another param (e.g. `txq`). */
export function textMatchKey(query: CrmQuery, key: string, ...fields: Array<string | null | undefined>): boolean {
  const needle = query[key]?.toLowerCase();
  if (!needle) return true;
  return fields.some((field) => (field ?? '').toLowerCase().includes(needle));
}

/**
 * Dropdown match. Empty filter, or any "All …" option, means no filter;
 * otherwise the value must match case-insensitively.
 */
export function optionMatch(actual: string | null | undefined, filter: string | undefined): boolean {
  if (!filter || /^all\b/i.test(filter)) return true;
  return (actual ?? '').trim().toLowerCase() === filter.trim().toLowerCase();
}

/** Same as `optionMatch`, but the option may be a substring ("Manager" → "Sales Manager"). */
export function containsOption(actual: string | null | undefined, filter: string | undefined): boolean {
  if (!filter || /^all\b/i.test(filter)) return true;
  return (actual ?? '').trim().toLowerCase().includes(filter.trim().toLowerCase());
}

/** `filter` is one of `options`, or empty/absent (treated as no filter). */
export function isPeriod(value: string | undefined): boolean {
  return Boolean(value && !/^all\b/i.test(value));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Parses "2026-10-14" as a local date (not UTC midnight) so day maths never shifts. */
function parseIsoDate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDate(text: string | null | undefined): Date | null {
  if (!text) return null;
  return parseIsoDate(text);
}

/** Inclusive date-range for the period select (ISO `YYYY-MM-DD` boundaries). */
export function periodRange(period: string | undefined, now = new Date()): { from: string; to: string } {
  const today = startOfDay(now);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  switch (period) {
    case 'Today':
      return { from: iso(today), to: iso(today) };
    case 'Yesterday': {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return { from: iso(d), to: iso(d) };
    }
    case 'This Week': {
      const weekday = (today.getDay() + 6) % 7; // Monday = 0
      const from = new Date(today);
      from.setDate(from.getDate() - weekday);
      const to = new Date(from);
      to.setDate(to.getDate() + 6);
      return { from: iso(from), to: iso(to) };
    }
    case 'Last Week': {
      const weekday = (today.getDay() + 6) % 7;
      const to = new Date(today);
      to.setDate(to.getDate() - weekday - 1);
      const from = new Date(to);
      from.setDate(from.getDate() - 6);
      return { from: iso(from), to: iso(to) };
    }
    case 'This Month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: iso(from), to: iso(to) };
    }
    case 'Last Month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: iso(from), to: iso(to) };
    }
    case 'This Quarter': {
      const q = Math.floor(today.getMonth() / 3);
      const from = new Date(today.getFullYear(), q * 3, 1);
      const to = new Date(today.getFullYear(), q * 3 + 3, 0);
      return { from: iso(from), to: iso(to) };
    }
    case 'Last 7 days':
    case 'Last 30 days': {
      const days = period === 'Last 7 days' ? 7 : 30;
      const from = new Date(today);
      from.setDate(from.getDate() - (days - 1));
      return { from: iso(from), to: iso(today) };
    }
    default: {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from: iso(from), to: iso(today) };
    }
  }
}

/**
 * Does a display date ("14 Oct 2026", "17 Nov 2026 11:00 AM", "2026-10-14")
 * fall inside the period? Unparseable text ("Today 3:00 PM") is kept — a
 * filter must never hide rows it cannot read.
 */
export function inPeriod(text: string | null | undefined, period: string | undefined, now = new Date()): boolean {
  if (!isPeriod(period)) return true;
  const date = parseDate(text);
  if (!date) return true;
  const day = startOfDay(date).getTime();
  const { from, to } = periodRange(period, now);
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return true;
  const endOfRange = startOfDay(end);
  endOfRange.setDate(endOfRange.getDate() + 1);
  return day >= start.getTime() && day < endOfRange.getTime();
}

/** Does a display date fall inside an explicit `from`/`to` range (inclusive)? */
export function inRange(
  text: string | null | undefined,
  from: string | undefined,
  to: string | undefined,
): boolean {
  if (!from && !to) return true;
  const date = parseDate(text);
  if (!date) return true;
  const day = startOfDay(date).getTime();
  if (from) {
    const start = parseIsoDate(from);
    if (start && day < start.getTime()) return false;
  }
  if (to) {
    const end = parseIsoDate(to);
    if (end) {
      const endOfRange = startOfDay(end);
      endOfRange.setDate(endOfRange.getDate() + 1);
      if (day >= endOfRange.getTime()) return false;
    }
  }
  return true;
}

/** Keep only the rows a query asks for. `match` returns true to keep a row. */
export function filterRows<T>(rows: T[], match: (row: T) => boolean): T[] {
  return rows.filter(match);
}

/** True when a due date is strictly before today. Unreadable dates are never overdue. */
export function isOverdue(text: string | null | undefined, now = new Date()): boolean {
  const date = parseDate(text);
  if (!date) return false;
  return startOfDay(date).getTime() < startOfDay(now).getTime();
}
