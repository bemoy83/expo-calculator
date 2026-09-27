'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FunctionSquare } from 'lucide-react';
import { CommitBlock } from '@/components/live/CommitBlock';
import { FormulaText } from '@/components/formula/FormulaText';
import { FormulaWell } from '@/components/formula/FormulaWell';
import { CategoryRail, ALL_CATEGORIES } from '@/components/shared/CategoryRail';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { CatalogTabs, useCatalogTabItems } from '@/components/shared/catalog/CatalogTabs';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SearchInput } from '@/components/ui/SearchInput';
import { useCalculatorLibrary } from '@/hooks/use-calculators';
import { functionFormulaNames } from '@/lib/calculator/formula-tokens';
import { copyOfFunction, countParameterUses, findFunctionUsage } from '@/lib/functions/function-usage';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import type { SharedFunction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FunctionTryInputs, splitReturn, useFunctionTryIt } from './FunctionTestPanel';

const OTHER = 'Other';
const editHref = (id?: string) => (id ? `/functions/edit?id=${encodeURIComponent(id)}` : '/functions/edit');

/** The call signature with its first three parameters: stendere(bredde, hoyde, cc, …). */
function Signature({ func }: { func: SharedFunction }) {
  const names = func.parameters.map((param) => param.name);
  const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ', …' : '');
  return (
    <span className="font-numeric text-[13px] text-ink-muted">
      {func.name}(<span className="text-token-input">{shown}</span>)
    </span>
  );
}

// Catalog › Functions (mockup 3a), like the Calculators page: categories, the list, and the chosen
// function in a quick view to try it. The choice is kept in ?id=. Edit (or a double-click) opens
// the editor; below lg a row opens it straight away.
export function FunctionsBrowse() {
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = useSearchParams().get('id');
  const functions = useFunctionsStore((state) => state.functions);
  const addFunction = useFunctionsStore((state) => state.addFunction);
  const calculators = useCalculatorsStore((state) => state.calculators);
  const tabs = useCatalogTabItems();
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState('');

  const usageCount = useMemo(
    () =>
      new Map(
        functions.map((func) => {
          const usage = findFunctionUsage(func.name, functions, func.id, calculators);
          return [func.id, usage.calculators.length + usage.functions.length];
        })
      ),
    [functions, calculators]
  );

  const categoryOf = (func: SharedFunction) => func.category?.trim() || OTHER;
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    functions.forEach((func) => counts.set(categoryOf(func), (counts.get(categoryOf(func)) ?? 0) + 1));
    return [...counts.entries()].sort(([a], [b]) => (a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b)));
  }, [functions]);

  const listed = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return functions
      .filter((func) => category === ALL_CATEGORIES || categoryOf(func) === category)
      .filter(
        (func) =>
          !needle ||
          [func.displayName, func.name, func.description ?? ''].some((text) => text.toLowerCase().includes(needle))
      );
  }, [functions, category, search]);
  const selected = functions.find((func) => func.id === selectedId) ?? listed[0];

  const select = (id: string) => router.replace(`${pathname}?id=${encodeURIComponent(id)}`, { scroll: false });
  const duplicate = (func: SharedFunction) => select(addFunction(copyOfFunction(func, functions)).id);

  const header = (
    <PageHeader
      eyebrow="Catalog · Reusable calculations"
      title="Catalog"
      actions={
        <>
          {functions.length > 0 && (
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search functions…"
              className="flex-1 min-w-[10rem] sm:w-[220px] sm:flex-none"
            />
          )}
          <Button variant="accent" onClick={() => router.push(editHref())} className="shrink-0">
            + New function
          </Button>
        </>
      }
    >
      <CatalogTabs items={tabs} active="functions" />
    </PageHeader>
  );

  if (functions.length === 0) {
    return (
      <>
        {header}
        <div className="px-4 sm:px-6 py-10">
          <EmptyState
            icon={FunctionSquare}
            title="No functions yet"
            description="Create reusable functions to use across your calculators and formulas."
            iconSize="small"
            actions={
              <Button variant="accent" onClick={() => router.push(editHref())}>
                + New function
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <div className="lg:h-[calc(100vh-var(--app-header-h))] lg:flex lg:flex-col">
      {header}
      <div className="grid grid-cols-1 md:grid-cols-[var(--category-w)_minmax(0,1fr)] lg:grid-cols-[var(--category-w)_minmax(0,1fr)_var(--quickview-w)] lg:flex-1 lg:min-h-0">
        <CategoryRail
          options={[
            { value: ALL_CATEGORIES, label: 'All', count: functions.length },
            ...categories.map(([name, count]) => ({ value: name, label: name, count })),
          ]}
          value={category}
          onChange={setCategory}
        />

        <ul aria-label="Functions" className="flex flex-col gap-1 px-3 py-4 min-w-0 lg:overflow-y-auto">
          {listed.map((func) => {
            const on = func.id === selected?.id;
            const uses = usageCount.get(func.id) ?? 0;
            return (
              <li key={func.id}>
                <Link
                  href={editHref(func.id)}
                  aria-current={on ? 'true' : undefined}
                  onClick={(event) => {
                    // From lg the row picks the function for the quick view; a double-click edits it.
                    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                    if (window.matchMedia('(min-width: 1024px)').matches) {
                      event.preventDefault();
                      select(func.id);
                    }
                  }}
                  onDoubleClick={() => router.push(editHref(func.id))}
                  className={cn(
                    'flex gap-3 px-3 py-3.5 rounded-row border transition-colors duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
                    on ? 'lg:bg-surface lg:border-border-strong border-transparent' : 'border-transparent hover:bg-surface-hover'
                  )}
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <span className="text-[15px] font-semibold text-ink">{func.displayName || func.name}</span>
                      <Signature func={func} />
                    </span>
                    {func.description && (
                      <span className="block mt-[3px] text-[13px] text-ink-muted line-clamp-2">{func.description}</span>
                    )}
                  </span>
                  <span className="font-numeric text-xs text-ink-faint whitespace-nowrap">
                    {func.parameters.length} in · {uses > 0 ? `used ${uses}×` : 'not used'}
                  </span>
                </Link>
              </li>
            );
          })}
          {listed.length === 0 && (
            <li className="py-8 text-center text-sm text-ink-muted">
              {search.trim() ? `No functions match “${search.trim()}”.` : 'No functions in this category.'}
            </li>
          )}
        </ul>

        <aside aria-label="Quick view" className="hidden lg:block min-h-0 bg-panel border-l border-border">
          {selected && (
            <FunctionQuickView
              key={selected.id}
              func={selected}
              functions={functions}
              onDuplicate={() => duplicate(selected)}
              onEdit={() => router.push(editHref(selected.id))}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

// The chosen function (mockup 3a): its formula, the inputs it uses to try it, what uses it,
// and the returned value on the inverted block with Edit function.
function FunctionQuickView({
  func,
  functions,
  onDuplicate,
  onEdit,
}: {
  func: SharedFunction;
  functions: SharedFunction[];
  onDuplicate: () => void;
  onEdit: () => void;
}) {
  const library = useCalculatorLibrary();
  const calculators = useCalculatorsStore((state) => state.calculators);
  const { parameters, kinds, values, setValue, result } = useFunctionTryIt(func, functions);
  const used = parameters.filter((param) => countParameterUses(func.formula, param.name) > 0);
  const unused = parameters.length - used.length;
  const usage = findFunctionUsage(func.name, functions, func.id, calculators);
  const usedBy = [
    ...usage.calculators.map((calculator) => ({ id: calculator.id, name: calculator.name, kind: 'calculator' })),
    ...usage.functions.map((other) => ({ id: other.id, name: other.name, kind: 'function' })),
  ];
  const shown = result.display !== undefined ? splitReturn(result.display, func.returnUnitSymbol) : undefined;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-[22px] py-[18px] flex flex-col gap-4">
        <div className="flex items-start gap-2.5">
          <div className="flex-1 min-w-0">
            <h2 className="text-[22px] font-bold tracking-[-.02em] text-ink">{func.displayName || func.name}</h2>
            {func.description && <p className="mt-0.5 text-[13px] text-ink-muted">{func.description}</p>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onDuplicate} className="px-2">
              Duplicate
            </Button>
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
          </div>
        </div>

        <FormulaWell className="break-all">
          <FormulaText expression={func.formula} names={functionFormulaNames(func, library)} />
        </FormulaWell>

        <section aria-labelledby="try-it-heading" className="flex flex-col gap-2.5">
          <Eyebrow as="h3" id="try-it-heading">
            Try it
          </Eyebrow>
          {used.length > 0 ? (
            <FunctionTryInputs parameters={used} kinds={kinds} values={values} onChange={setValue} />
          ) : (
            <p className="text-[13px] text-ink-muted">The formula doesn&apos;t use any parameters.</p>
          )}
          {unused > 0 && (
            <p className="text-xs text-ink-faint">
              {unused === 1 ? '1 more parameter isn’t' : `${unused} more parameters aren’t`} used by the formula.
            </p>
          )}
          {!shown && result.error && !/^(Enter|Choose) a value/.test(result.error) && (
            <p className="text-xs text-danger">{result.error}</p>
          )}
        </section>

        <section aria-labelledby="quick-used-by" className="flex flex-col">
          <Eyebrow as="h3" id="quick-used-by" className="mb-1.5">
            Used by · {usedBy.length}
          </Eyebrow>
          {usedBy.length === 0 ? (
            <p className="text-[13px] text-ink-muted">Not used yet.</p>
          ) : (
            usedBy.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="flex justify-between gap-3 py-1.5 border-b border-border text-sm">
                <span className="truncate">{item.name}</span>
                <span className="font-numeric text-xs text-ink-faint">{item.kind}</span>
              </div>
            ))
          )}
        </section>
      </div>

      <div className="flex-none px-3.5 pt-2.5 pb-3.5 bg-surface border-t border-border-strong">
        <CommitBlock
          layout="compact"
          label="Returns"
          amount={shown ? `${shown.value}${shown.unit ? ` ${shown.unit}` : ''}` : '—'}
          actionLabel="Edit function"
          onAction={onEdit}
        />
      </div>
    </div>
  );
}
