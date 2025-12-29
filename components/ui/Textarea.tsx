import React, { useId, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  autoGrow?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
({ label, error, id, className, required, autoGrow, ...props }, ref) => {

  const generatedId = useId();
  const textareaId = id || generatedId;
  const errorId = error ? `${textareaId}-error` : undefined;

  const innerRef = useRef<HTMLTextAreaElement>(null);

  // merge external + internal ref
  React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

  // auto grow logic
  useEffect(() => {
    if (!autoGrow) return;
    const el = innerRef.current;
    if (!el) return;

    const resize = () => {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    };

    resize();

    el.addEventListener("input", resize);
    return () => el.removeEventListener("input", resize);
  }, [autoGrow]);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-md-on-surface mb-1.5">
          {label}
        </label>
      )}

      <textarea
        ref={innerRef}
        id={textareaId}
        required={required}
        aria-required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        className={cn(
          'w-full px-4 py-2.5 bg-md-surface-variant/70 dark:bg-md-surface-variant/50 rounded-2xl',
          'text-md-on-surface placeholder-md-on-surface-variant',
          'focus:outline-none focus:ring-2 focus:ring-md-primary/50',
          'transition-smooth',
          autoGrow ? 'overflow-hidden resize-none' : 'resize-none',
          'disabled-overlay disabled:cursor-not-allowed',
          error && 'focus:ring-md-error/50',
          className
        )}
        {...props}
      />

      {error && (
        <p id={errorId} className="mt-1 text-sm text-md-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

