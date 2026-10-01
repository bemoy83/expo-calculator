'use client';

import { useId, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface CategoryComboboxProps {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
}

// A text box that lists the categories in use under it. The list is drawn here, anchored to
// the box, because the browser's own datalist popup lands in the wrong place inside the panel.
// Typing a new name is always fine; picking is only the easy path.
export function CategoryCombobox({ label, value, options, placeholder, onChange }: CategoryComboboxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const typed = value.trim().toLowerCase();
  const shown = options.filter((option) => option.toLowerCase().includes(typed) && option.toLowerCase() !== typed);
  const visible = open && shown.length > 0;

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative w-full">
      <Input
        label={label}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(event) => {
          if (!visible) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => (index + 1) % shown.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => (index <= 0 ? shown.length - 1 : index - 1));
          } else if (event.key === 'Enter' && active >= 0) {
            event.preventDefault();
            choose(shown[active]);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
          }
        }}
      />
      {visible && (
        <ul
          id={listId}
          role="listbox"
          // Keeps the box focused, so a click picks before the blur closes the list.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-row border border-border-strong bg-surface py-1 shadow-panel"
        >
          {shown.map((option, index) => (
            <li key={option} role="option" aria-selected={index === active}>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => choose(option)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm',
                  index === active ? 'bg-accent-soft text-ink' : 'text-ink-body hover:bg-surface-hover'
                )}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
