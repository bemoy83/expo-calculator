'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calculator as CalculatorIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { CategoryRail, ALL_CATEGORIES } from '@/components/shared/CategoryRail';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import type { Calculator, CalculatorLibrary } from '@/lib/calculator/types';
import { formatPackDate } from '@/lib/calculator/format';
import { groupCalculatorsByCategory } from '@/lib/quotes/workspace';
import { useDeviceStore } from '@/lib/stores/device-store';
import { useUseOnlyMode } from '@/hooks/use-device';
import { cn } from '@/lib/utils';
import { CalculatorQuickView } from './CalculatorRunView';

function pluralize(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

const runHref = (calculator: Calculator) => `/calculator?id=${encodeURIComponent(calculator.id)}`;

// Calculators home (mockup 6b): categories, the list, and the chosen calculator in a quick view.
// The choice is kept in ?id= so it survives a reload. Below lg there's no quick view: a row
// opens the calculator full size.
export function CalculatorsListView({ calculators, library }: { calculators: Calculator[]; library: CalculatorLibrary }) {
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = useSearchParams().get('id');
  const newCalculator = () => router.push('/calculator/edit');
  const useOnly = useUseOnlyMode();
  const loadedPack = useDeviceStore((state) => state.loadedPack);
  const lastPackExport = useDeviceStore((state) => state.lastPackExport);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState('');

  // Which pack this device has, so an out-of-date one is easy to spot; on the device packs
  // are made on, when the last one was exported, to compare against.
  const packNote = loadedPack
    ? `Calculator pack from ${formatPackDate(loadedPack.exportedAt)}`
    : lastPackExport && !useOnly
      ? `Last pack exported ${formatPackDate(lastPackExport.exportedAt)}`
      : undefined;

  const groups = useMemo(() => groupCalculatorsByCategory(calculators), [calculators]);
  const listed = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return groups
      .filter((group) => category === ALL_CATEGORIES || group.category === category)
      .flatMap((group) => group.items)
      .filter(
        (calculator) =>
          !needle ||
          calculator.name.toLowerCase().includes(needle) ||
          (calculator.description ?? '').toLowerCase().includes(needle)
      );
  }, [groups, category, search]);
  // The chosen calculator, else the first one listed.
  const selected = calculators.find((calculator) => calculator.id === selectedId) ?? listed[0];

  const select = (calculator: Calculator) =>
    router.replace(`${pathname}?id=${encodeURIComponent(calculator.id)}`, { scroll: false });

  const header = (
    <PageHeader
      eyebrow={
        <span title={loadedPack ? `Loaded ${formatPackDate(loadedPack.loadedAt)}` : undefined}>
          {pluralize(calculators.length, 'calculator')}
          {packNote && ` · ${packNote}`}
        </span>
      }
      title="Calculators"
      actions={
        calculators.length > 0 || !useOnly ? (
          <>
            {calculators.length > 0 && (
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search calculators…"
                className="flex-1 min-w-[10rem] sm:w-[220px] sm:flex-none"
              />
            )}
            {!useOnly && (
              <Button variant="accent" onClick={newCalculator} className="shrink-0">
                + New calculator
              </Button>
            )}
          </>
        ) : undefined
      }
    />
  );

  if (calculators.length === 0) {
    return (
      <>
        {header}
        <div className="px-4 sm:px-6 py-10">
          {useOnly ? (
            <EmptyState
              icon={CalculatorIcon}
              title="No calculators on this device yet"
              description="Ask for a calculator pack file, then load it from Settings → Load calculator pack."
              iconSize="small"
            />
          ) : (
            <EmptyState
              icon={CalculatorIcon}
              title="No calculators yet"
              description="Build one from inputs and steps, test each part as you go, and staff get one simple form."
              iconSize="small"
              actions={
                <Button variant="accent" onClick={newCalculator}>
                  + New calculator
                </Button>
              }
            />
          )}
        </div>
      </>
    );
  }

  const categoryOptions = [
    { value: ALL_CATEGORIES, label: 'All', count: calculators.length },
    ...groups.map((group) => ({ value: group.category, label: group.category, count: group.items.length })),
  ];

  return (
    <div className="lg:h-[calc(100vh-var(--app-header-h))] lg:flex lg:flex-col">
      {header}
      <div className="grid grid-cols-1 md:grid-cols-[var(--category-w)_minmax(0,1fr)] lg:grid-cols-[var(--category-w)_minmax(0,1fr)_var(--quickview-w)] lg:flex-1 lg:min-h-0">
        <CategoryRail options={categoryOptions} value={category} onChange={setCategory} />

        <ul aria-label="Calculators" className="flex flex-col gap-1 px-3 py-4 min-w-0 lg:overflow-y-auto">
          {listed.map((calculator) => {
            const on = calculator.id === selected?.id;
            const partCount = calculator.parts.length;
            return (
              <li key={calculator.id}>
                <Link
                  href={runHref(calculator)}
                  aria-current={on ? 'true' : undefined}
                  onClick={(event) => {
                    // From lg the row picks the calculator for the quick view instead.
                    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                    if (window.matchMedia('(min-width: 1024px)').matches) {
                      event.preventDefault();
                      select(calculator);
                    }
                  }}
                  className={cn(
                    'flex gap-3 px-3 py-3.5 rounded-row border transition-colors duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
                    on ? 'lg:bg-surface lg:border-border-strong border-transparent' : 'border-transparent hover:bg-surface-hover'
                  )}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-ink">{calculator.name}</span>
                    {calculator.description && (
                      <span className="block mt-[3px] text-[13px] text-ink-muted line-clamp-2">{calculator.description}</span>
                    )}
                  </span>
                  <span className="font-numeric text-xs text-ink-faint whitespace-nowrap">
                    {calculator.inputs.length} in{partCount > 1 && ` · ${partCount} parts`}
                  </span>
                </Link>
              </li>
            );
          })}
          {listed.length === 0 && (
            <li className="py-8 text-center text-sm text-ink-muted">
              {search.trim() ? `No calculators match “${search.trim()}”.` : 'No calculators in this category.'}
            </li>
          )}
        </ul>

        <aside aria-label="Quick view" className="hidden lg:block min-h-0 bg-panel border-l border-border">
          {selected && <CalculatorQuickView key={selected.id} calculator={selected} library={library} />}
        </aside>
      </div>
    </div>
  );
}
