import { cn } from '@/lib/utils';

// Shared by Input, Select, and Textarea (Ledger controls/Input.jsx): sunken well, strong hairline,
// 8px radius; focus = accent border + 3px accent-soft halo; error = danger border; disabled =
// lighter sunken fill with faint text.
export function fieldClasses(hasError: boolean, className?: string) {
  return cn(
    'w-full rounded-md border bg-sunken text-sm text-ink placeholder:text-ink-subtle caret-accent',
    'transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
    'focus:outline-none focus:border-accent focus:shadow-focus',
    'disabled:bg-sunken-2 disabled:text-ink-faint disabled:cursor-not-allowed',
    hasError
      ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgb(var(--danger)/0.15)]'
      : 'border-border-strong',
    className
  );
}

/** Control heights: compact 38 (side panels) · md 42 (editors) · large 46 (staff run view). */
export type FieldSize = 'compact' | 'md' | 'large';
export const FIELD_HEIGHT: Record<FieldSize, string> = {
  compact: 'h-[38px] text-sm',
  md: 'h-[42px] text-[15px]',
  large: 'h-[46px] text-base',
};

export const FIELD_LABEL = 'block text-xs text-ink-muted mb-1.5';
export const FIELD_ERROR = 'mt-1.5 text-xs text-danger';
