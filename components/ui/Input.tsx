import React, { useId, useState } from 'react';
import { cn, normalizeNumberText, shownNumberText } from '@/lib/utils';
import { FIELD_ERROR, FIELD_LABEL, fieldClasses } from './field-styles';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Rewrites a number box's text as the user types (2,5 → 2.5, "1 200" → 1200), keeping the
 * caret where it was, so onChange handlers read text Number() understands.
 */
export function normalizeNumberInput(element: HTMLInputElement) {
  const text = element.value;
  const next = normalizeNumberText(text);
  if (next === text) return;
  const caret = normalizeNumberText(text.slice(0, element.selectionStart ?? text.length)).length;
  element.value = next;
  element.setSelectionRange(caret, caret);
}

// A number box is a text box with the decimal keypad: type="number" drops "2,5" in browsers
// set to English and on iPads with a Norwegian keypad, so the comma is turned into a point here.
export const Input: React.FC<InputProps> = ({ label, error, id, className, required, type, value, onChange, onBlur, ...props }) => {
  const isNumber = type === 'number';
  const [typed, setTyped] = useState<string | null>(null);
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={FIELD_LABEL}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={isNumber ? 'text' : type}
        inputMode={isNumber ? 'decimal' : undefined}
        autoComplete={isNumber ? 'off' : undefined}
        required={required}
        aria-required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        // Numbers are always set in tabular mono.
        className={fieldClasses(!!error, cn('h-[38px] px-2.5', isNumber && 'font-numeric', className))}
        {...props}
        value={isNumber ? shownNumberText(typed, value) : value}
        onChange={(event) => {
          if (isNumber) {
            normalizeNumberInput(event.target);
            setTyped(event.target.value);
          }
          onChange?.(event);
        }}
        onBlur={(event) => {
          setTyped(null);
          onBlur?.(event);
        }}
      />
      {error && (
        <p id={errorId} className={FIELD_ERROR} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
