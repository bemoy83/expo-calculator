import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fieldClasses } from './field-styles';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value: string;
  onChange: (value: string) => void;
  /** Also the accessible name */
  placeholder: string;
  className?: string;
}

// Header search box (mockups 3b, 3c): a 36px sunken well, lined up with the header buttons.
export function SearchInput({ value, onChange, placeholder, className, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={props['aria-label'] ?? placeholder.replace(/…$/, '')}
        className={fieldClasses(false, 'h-9 pl-9 pr-3 text-[13px]')}
        {...props}
      />
    </div>
  );
}
