import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { FIELD_ERROR, FIELD_LABEL, fieldClasses } from './field-styles';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  id,
  className,
  required,
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
          className={fieldClasses(!!error, `h-[38px] pl-2.5 pr-8 appearance-none cursor-pointer ${className ?? ''}`)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown 
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" 
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

