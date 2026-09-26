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

/** Format a number for display, stripping floating-point artifacts (e.g. 30.800000000000004 → "30.8"). */
export function formatDisplayNumber(value: number): string {
  return Number.parseFloat(value.toPrecision(10)).toString();
}

