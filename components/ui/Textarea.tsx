import React, { useId, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { FIELD_ERROR, FIELD_LABEL, fieldClasses } from './field-styles';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  autoGrow?: boolean;
  /**
   * The same text drawn behind the box with its own styling (a formula coloured by kind):
   * the box's own text is see-through, so typing, the caret and selection work as usual.
   * It must render exactly the box's text.
   */
  highlight?: React.ReactNode;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
({ label, error, id, className, required, autoGrow, highlight, ...props }, ref) => {

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
        <label htmlFor={textareaId} className={FIELD_LABEL}>
          {label}
        </label>
      )}

      {highlight === undefined ? (
        <textarea
          ref={innerRef}
          id={textareaId}
          required={required}
          aria-required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className={fieldClasses(
            !!error,
            cn('px-2.5 py-2 resize-none', autoGrow && 'overflow-hidden', className)
          )}
          {...props}
        />
      ) : (
        <div className="relative rounded-md bg-surface">
          {/* Same box, font, padding and wrapping as the textarea, so the text lines up. */}
          <div
            aria-hidden="true"
            className={cn(
              'absolute inset-0 overflow-hidden rounded-md border border-transparent px-2.5 py-2 text-sm text-ink',
              'whitespace-pre-wrap break-words pointer-events-none',
              className
            )}
          >
            {highlight}
            {/* Keeps a trailing line break's height, as the textarea does. */}
            {'\u200b'}
          </div>
          <textarea
            ref={innerRef}
            id={textareaId}
            required={required}
            aria-required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId}
            className={fieldClasses(
              !!error,
              cn(
                'relative block px-2.5 py-2 resize-none bg-transparent text-transparent caret-ink',
                'selection:bg-action/30',
                autoGrow && 'overflow-hidden',
                className
              )
            )}
            {...props}
          />
        </div>
      )}

      {error && (
        <p id={errorId} className={FIELD_ERROR} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

