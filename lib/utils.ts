import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { NAME_CHAR, NAME_START } from './formula/identifiers';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function labelToVariableName(label: string): string {
  if (!label || !label.trim()) {
    return '';
  }

  let result = label.trim()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(new RegExp(`[^${NAME_CHAR}]`, 'g'), '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!result) {
    return '';
  }

  if (/^[0-9]/.test(result)) {
    result = '_' + result;
  }

  result = result.toLowerCase();

  if (!new RegExp(`^[${NAME_START}]`).test(result)) {
    result = '_' + result;
  }

  return result;
}

/**
 * What's typed in a number box as text Number() reads: a decimal comma becomes a point and
 * spaces (thousands, as in "1 200,50") and anything else that can't be part of a number go.
 */
export function normalizeNumberText(text: string): string {
  return text.replace(/,/g, '.').replace(/[^0-9.+\-eE]/g, '');
}

/**
 * What a number box shows: the text being typed while it means the number the page holds
 * ("12." for 12, "" for 0) or isn't a number yet ("-"), as type="number" boxes did; otherwise
 * the page's value.
 */
export function shownNumberText<T extends string | number | readonly string[] | undefined>(typed: string | null, value: T): T | string {
  if (typed === null || value === undefined) return value;
  const number = Number(typed);
  return !Number.isFinite(number) || number === Number(value) ? typed : value;
}

/** Format a number for display, stripping floating-point artifacts (e.g. 30.800000000000004 → "30.8"). */
export function formatDisplayNumber(value: number): string {
  return Number.parseFloat(value.toPrecision(10)).toString();
}

