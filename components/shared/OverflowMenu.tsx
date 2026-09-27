'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OverflowMenuItem {
  label: string;
  onSelect: () => void;
  /** Delete: red, after a divider. Put it last. */
  danger?: boolean;
  disabled?: boolean;
  /** Why it's disabled, as a tooltip */
  title?: string;
}

const MENU_WIDTH = 200;

// The ⋯ button in an editor header, for occasional actions (Duplicate, Export JSON, Delete).
// A menu button: Enter, Space or ↓ opens it on the first item, ↑ ↓ Home End move, Escape or
// Tab closes it, and focus goes back to the button. A click outside closes it too.
export function OverflowMenu({ items, label = 'More actions' }: { items: OverflowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  // Opens under the button, right-aligned, unless that would run off the left edge (a phone).
  const [alignLeft, setAlignLeft] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const enabledItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []);

  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    setAlignLeft(!!rect && rect.right - MENU_WIDTH < 8);
    enabledItems()[0]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focusable = enabledItems();
    const index = focusable.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => {
      event.preventDefault();
      focusable[(to + focusable.length) % focusable.length]?.focus();
    };
    switch (event.key) {
      case 'ArrowDown':
        return move(index + 1);
      case 'ArrowUp':
        return move(index - 1);
      case 'Home':
        return move(0);
      case 'End':
        return move(focusable.length - 1);
      case 'Escape':
        // Handled: the navigation drawer's Escape listener leaves the page alone.
        event.preventDefault();
        return close();
      case 'Tab':
        return close(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'inline-flex items-center justify-center h-9 w-9 rounded-md border border-border-strong text-ink',
          'transition-[background-color,color] duration-150 ease-[cubic-bezier(.4,0,.2,1)] hover:bg-surface-hover',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          open && 'bg-surface-hover'
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          style={{ width: MENU_WIDTH }}
          className={cn(
            'absolute top-full mt-1.5 z-40 p-1.5 bg-surface border border-border-strong rounded-row shadow-panel',
            alignLeft ? 'left-0' : 'right-0'
          )}
        >
          {items.map((item, index) => (
            <React.Fragment key={item.label}>
              {item.danger && index > 0 && <div role="separator" className="my-1.5 border-t border-border" />}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                title={item.title}
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                className={cn(
                  'w-full flex items-center h-[34px] px-2.5 rounded-md text-left text-[13px] transition-colors',
                  'focus:outline-none focus-visible:bg-surface-hover',
                  'disabled:text-ink-faint disabled:cursor-not-allowed disabled:hover:bg-transparent',
                  item.danger ? 'text-danger hover:bg-danger-bg focus-visible:bg-danger-bg' : 'text-ink-body hover:text-ink hover:bg-surface-hover'
                )}
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

/** The thin rule between an editor's own tools and ⋯ · Close · Save. */
export function HeaderDivider() {
  return <span aria-hidden="true" className="hidden sm:block w-px h-6 mx-1.5 bg-border" />;
}
