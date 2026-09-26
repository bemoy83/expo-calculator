'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { ModalDialog } from '@/components/shared/ModalDialog';
import { Input } from '@/components/ui/Input';
import type { Calculator } from '@/lib/calculator/types';
import { groupCalculatorsByCategory } from '@/lib/quotes/workspace';

// Picks a calculator to add to the quote as a new card: by category, with search.
export function AddCalculatorDialog({
  isOpen,
  onClose,
  calculators,
  onPick,
}: {
  isOpen: boolean;
  onClose: () => void;
  calculators: Calculator[];
  onPick: (calculator: Calculator) => void;
}) {
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = calculators.filter((calculator) => {
    const text = `${calculator.name} ${calculator.category ?? ''} ${calculator.description ?? ''}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
  const groups = groupCalculatorsByCategory(matches);

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title="Add a calculator" maxWidth="medium">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" aria-hidden="true" />
          <Input
            aria-label="Search calculators"
            placeholder="Search calculators"
            value={search}
            data-autofocus
            className="pl-8"
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches.length === 1) {
                event.preventDefault();
                onPick(matches[0]);
              }
            }}
          />
        </div>
        {calculators.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">There are no calculators yet.</p>
        ) : groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">No calculator matches “{search.trim()}”.</p>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1 space-y-4">
            {groups.map((group) => (
              <section key={group.category} aria-label={group.category}>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{group.category}</h3>
                <ul className="rounded-md border border-border divide-y divide-border">
                  {group.items.map((calculator) => (
                    <li key={calculator.id}>
                      <button
                        type="button"
                        onClick={() => onPick(calculator)}
                        className="w-full px-3 py-2.5 text-left hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action"
                      >
                        <span className="block text-sm font-medium text-ink">{calculator.name || 'Untitled calculator'}</span>
                        {calculator.description && (
                          <span className="block text-xs text-ink-muted line-clamp-2">{calculator.description}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
