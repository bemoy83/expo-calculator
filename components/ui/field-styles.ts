import { cn } from '@/lib/utils';

// Shared by Input, Select, and Textarea: borderless filled well, 8px radius. The fill steps up on
// hover; focus = inset accent ring + 3px accent-soft halo; error = inset danger ring (always on,
// since there's no border to recolour); disabled = lighter fill with faint text. The border is
// kept transparent so box sizes and the Textarea highlight overlay line up.
export function fieldClasses(hasError: boolean, className?: string) {
  return cn(
    'w-full rounded-md border border-transparent bg-field text-sm text-ink placeholder:text-ink-subtle caret-accent',
    'transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
    'hover:bg-field-hover focus:bg-field-hover focus:outline-none',
    'disabled:bg-sunken-2 disabled:hover:bg-sunken-2 disabled:text-ink-faint disabled:cursor-not-allowed',
    hasError
      ? '[box-shadow:var(--field-error)] focus:[box-shadow:var(--field-error-focus)]'
      : 'focus:[box-shadow:var(--field-focus)]',
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
