import { cn } from '@/lib/utils';

// Shared by Input, Select, and Textarea (mockup 1a / 3a "Controls — every state"):
// surface fill, strong hairline, 6px radius; focus = action border + soft 3px ring;
// error = danger border; disabled = sunken fill with faint text.
export function fieldClasses(hasError: boolean, className?: string) {
  return cn(
    'w-full rounded-md border bg-surface text-sm text-ink placeholder:text-ink-subtle transition-colors',
    'focus:outline-none focus:border-action focus:ring-[3px] focus:ring-action/20',
    'disabled:bg-sunken disabled:text-ink-faint disabled:cursor-not-allowed',
    hasError ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border-strong',
    className
  );
}

export const FIELD_LABEL = 'block text-xs font-medium text-ink-muted mb-1.5';
export const FIELD_ERROR = 'mt-1 text-xs text-danger';
