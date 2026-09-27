import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_ERROR, FIELD_HEIGHT, FIELD_LABEL, fieldClasses, type FieldSize } from './field-styles';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  /** meta is shown after the label, e.g. a price per unit */
  options: { value: string; label: string; meta?: string; disabled?: boolean }[];
  /** compact 38 · md 42 (default) · large 46 */
  size?: FieldSize;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  id,
  className,
  required,
  size = 'md',
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className={FIELD_LABEL}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className={fieldClasses(!!error, cn(FIELD_HEIGHT[size], size === 'large' ? 'text-[15px]' : undefined, 'pl-3 pr-[34px] appearance-none cursor-pointer', className))}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
              {option.meta ? ` · ${option.meta}` : ''}
            </option>
          ))}
        </select>
        <ChevronDown 
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint pointer-events-none" 
          aria-hidden="true"
        />
      </div>
      {error && (
        <p id={errorId} className={FIELD_ERROR} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

