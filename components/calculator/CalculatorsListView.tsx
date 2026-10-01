'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calculator as CalculatorIcon } from 'lucide-react';
import { browseHref } from '@/components/shared/Breadcrumb';
import { BrowseActions } from '@/components/shared/browse/BrowseActions';
import { BrowseLayout } from '@/components/shared/browse/BrowseLayout';
import { FirstRunPane } from '@/components/shared/browse/FirstRunPane';
import { SortableRow } from '@/components/shared/browse/SortableRow';
import { ALL_CATEGORIES, useBrowseList } from '@/components/shared/browse/useBrowseList';
import { SortableList } from '@/components/shared/SortableList';
import { PageHeader } from '@/components/shared/PageHeader';
import type { Calculator, CalculatorLibrary } from '@/lib/calculator/types';
import { formatPackDate } from '@/lib/calculator/format';
import { groupCalculatorsByCategory } from '@/lib/quotes/workspace';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useDeviceStore } from '@/lib/stores/device-store';
import { useUseOnlyMode } from '@/hooks/use-device';
import { useCallback } from 'react';
import { CalculatorQuickView } from './CalculatorRunView';
import { builderHref } from '@/components/calculator-builder/builder-href';

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
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  // The category filter is in the URL too, so a breadcrumb can link to it and it survives a reload.
  const category = searchParams.get('category') ?? ALL_CATEGORIES;
  // The builder opened from here comes back here on Close.
  const newCalculator = () => router.push(builderHref(undefined, { category }));
  const useOnly = useUseOnlyMode();
  const loadedPack = useDeviceStore((state) => state.loadedPack);
  const lastPackExport = useDeviceStore((state) => state.lastPackExport);
  const reorderCalculators = useCalculatorsStore((state) => state.reorderCalculators);

  // Which pack this device has, so an out-of-date one is easy to spot; on the device packs
  // are made on, when the last one was exported, to compare against.
  const packNote = loadedPack
    ? `Calculator pack from ${formatPackDate(loadedPack.exportedAt)}`
    : lastPackExport && !useOnly
      ? `Last pack exported ${formatPackDate(lastPackExport.exportedAt)}`
      : undefined;

  const searchableText = useCallback((calculator: Calculator) => [calculator.name, calculator.description], []);
  const categoryOf = useCallback((calculator: Calculator) => calculator.category ?? '', []);
  // Until the list has been dragged, calculators are grouped by category, alphabetically.
  const defaultOrder = useCallback((items: Calculator[]) => groupCalculatorsByCategory(items).flatMap((group) => group.items), []);
  const list = useBrowseList({
    items: calculators,
    searchableText,
    categoryOf,
    defaultOrder,
    category,
    onCategoryChange: (next) => setCategory(next),
  });
  const { search, setSearch, listed } = list;
  // A device that only uses calculators doesn't edit them, the order included.
  const canReorder = list.canReorder && !useOnly;
  // Only a calculator the user chose, and only while it's listed; the quick view says so otherwise.
  // A use-only device has no quick view: a row opens the calculator.
  const selected = useOnly ? undefined : listed.find((calculator) => calculator.id === selectedId);

  const select = (calculator: Calculator) =>
    router.replace(browseHref(pathname, { category, id: calculator.id }), { scroll: false });
  const deselect = () => router.replace(browseHref(pathname, { category }), { scroll: false });
  const setCategory = (next: string) =>
    router.replace(browseHref(pathname, { category: next, id: selectedId ?? undefined }), { scroll: false });

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
        <BrowseActions
          search={calculators.length > 0 ? search : undefined}
          onSearch={setSearch}
          searchPlaceholder="Search calculators…"
          addLabel={useOnly ? undefined : 'New calculator'}
          onAdd={newCalculator}
        />
      }
    />
  );

  const rows = listed.map((calculator) => {
    const on = calculator.id === selected?.id;
    const partCount = calculator.parts.length;
    return (
      <SortableRow key={calculator.id} id={calculator.id} label={calculator.name} selected={on} disableDrag={!canReorder}>
        <Link
          href={runHref(calculator)}
          aria-current={on ? 'true' : undefined}
          onClick={(event) => {
            // From lg the row picks the calculator for the quick view instead (its arrow opens it,
            // a double-click edits it); on a use-only device a row just opens the calculator.
            if (useOnly || event.metaKey || event.ctrlKey || event.shiftKey) return;
            if (window.matchMedia('(min-width: 1024px)').matches) {
              event.preventDefault();
              select(calculator);
            }
          }}
          onDoubleClick={useOnly ? undefined : () => router.push(builderHref(calculator.id, { category }))}
          className="flex gap-3 py-3.5 pl-1 pr-3 rounded-row focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
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
      </SortableRow>
    );
  });

  return (
    <BrowseLayout
      header={header}
      rail={{ options: list.railOptions, value: category, onChange: setCategory }}
      // A use-only device has no side pane: a row opens the calculator.
      side={
        useOnly
          ? undefined
          : {
              below: 'hidden',
              open: !!selected,
              placeholder:
                calculators.length === 0 ? (
                  <FirstRunPane
                    icon={CalculatorIcon}
                    title="No calculators yet"
                    description="Build one from inputs and steps, test each part as you go, and staff get one simple form."
                    addLabel="calculator"
                  />
                ) : (
                  'Choose a calculator to try it out.'
                ),
              content: selected && (
                <CalculatorQuickView key={selected.id} calculator={selected} library={library} listCategory={category} onClose={deselect} />
              ),
            }
      }
    >
      <div role="list" aria-label="Calculators">
        {canReorder ? (
          <SortableList
            items={listed}
            onReorder={(oldIndex, newIndex) => list.reorder(oldIndex, newIndex, reorderCalculators)}
            renderItem={(calculator) => rows[listed.indexOf(calculator)]}
          />
        ) : (
          rows
        )}
      </div>
      {useOnly && calculators.length === 0 && (
        <div className="py-16">
          <FirstRunPane
            icon={CalculatorIcon}
            title="No calculators on this device yet"
            description="Ask for a calculator pack file, then load it from Settings → Load calculator pack."
          />
        </div>
      )}
      {listed.length === 0 && calculators.length > 0 && (
        <p className="py-8 text-center text-sm text-ink-muted">
          {search.trim() ? `No calculators match “${search.trim()}”.` : 'No calculators in this category.'}
        </p>
      )}
    </BrowseLayout>
  );
}
