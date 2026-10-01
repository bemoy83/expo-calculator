'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Copy, FunctionSquare, Pencil, X } from 'lucide-react';
import { CommitBlock } from '@/components/live/CommitBlock';
import { FormulaText } from '@/components/formula/FormulaText';
import { FormulaWell } from '@/components/formula/FormulaWell';
import { browseHref } from '@/components/shared/Breadcrumb';
import { BrowseActions } from '@/components/shared/browse/BrowseActions';
import { BrowseLayout } from '@/components/shared/browse/BrowseLayout';
import { FirstRunPane } from '@/components/shared/browse/FirstRunPane';
import { SortableRow } from '@/components/shared/browse/SortableRow';
import { ALL_CATEGORIES, useBrowseList } from '@/components/shared/browse/useBrowseList';
import { SortableList } from '@/components/shared/SortableList';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useCalculatorLibrary } from '@/hooks/use-calculators';
import { functionFormulaNames } from '@/lib/calculator/formula-tokens';
import { copyOfFunction, countParameterUses, findFunctionUsage } from '@/lib/functions/function-usage';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import type { SharedFunction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FunctionTryInputs, splitReturn, useFunctionTryIt } from './FunctionTestPanel';

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
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  // The category filter is in the URL too, so a breadcrumb can link to it and it survives a reload.
  const category = searchParams.get('category') ?? ALL_CATEGORIES;
  const functions = useFunctionsStore((state) => state.functions);
  const addFunction = useFunctionsStore((state) => state.addFunction);
  const reorderFunctions = useFunctionsStore((state) => state.reorderFunctions);
  const calculators = useCalculatorsStore((state) => state.calculators);

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

  const searchableText = useCallback((func: SharedFunction) => [func.displayName, func.name, func.description], []);
  const categoryOf = useCallback((func: SharedFunction) => func.category ?? '', []);
  const list = useBrowseList({
    items: functions,
    searchableText,
    categoryOf,
    category,
    onCategoryChange: (next) => setCategory(next),
  });
  const { search, setSearch, listed } = list;
  // Only a function the user chose, and only while it's listed; the quick view says so otherwise.
  const selected = listed.find((func) => func.id === selectedId);

  const select = (id: string) => router.replace(browseHref(pathname, { category, id }), { scroll: false });
  const setCategory = (next: string) =>
    router.replace(browseHref(pathname, { category: next, id: selectedId ?? undefined }), { scroll: false });
  const deselect = () => router.replace(browseHref(pathname, { category }), { scroll: false });
  const duplicate = (func: SharedFunction) => select(addFunction(copyOfFunction(func, functions)).id);

  const header = (
    <PageHeader
      eyebrow={`${functions.length} ${functions.length === 1 ? 'function' : 'functions'} · reusable calculations`}
      title="Functions"
      actions={
        <BrowseActions
          search={functions.length > 0 ? search : undefined}
          onSearch={setSearch}
          searchPlaceholder="Search functions…"
          addLabel="New function"
          onAdd={() => router.push(editHref())}
        />
      }
    />
  );

  const rows = listed.map((func) => {
    const on = func.id === selected?.id;
    const uses = usageCount.get(func.id) ?? 0;
    return (
      <SortableRow key={func.id} id={func.id} label={func.displayName || func.name} selected={on} disableDrag={!list.canReorder}>
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
          className="flex gap-3 py-3.5 pl-1 pr-3 rounded-row focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <span className="flex-1 min-w-0">
            <span className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-[15px] font-semibold text-ink">{func.displayName || func.name}</span>
              <Signature func={func} />
            </span>
            {func.description && <span className="block mt-[3px] text-[13px] text-ink-muted line-clamp-2">{func.description}</span>}
          </span>
          <span className="font-numeric text-xs text-ink-faint whitespace-nowrap">
            {func.parameters.length} in · {uses > 0 ? `used ${uses}×` : 'not used'}
          </span>
        </Link>
      </SortableRow>
    );
  });

  return (
    <BrowseLayout
      header={header}
      rail={{ options: list.railOptions, value: category, onChange: setCategory }}
      side={{
        below: 'hidden',
        open: !!selected,
        placeholder:
          functions.length === 0 ? (
            <FirstRunPane
              icon={FunctionSquare}
              title="No functions yet"
              description="Functions are reusable calculations. Write one once, then use it in any calculator or formula."
              addLabel="function"
            />
          ) : (
            'Choose a function to try it out.'
          ),
        content: selected && (
          <FunctionQuickView
            key={selected.id}
            func={selected}
            functions={functions}
            onDuplicate={() => duplicate(selected)}
            onEdit={() => router.push(editHref(selected.id))}
            onClose={deselect}
          />
        ),
      }}
    >
      <div role="list" aria-label="Functions">
        {list.canReorder ? (
          <SortableList
            items={listed}
            onReorder={(oldIndex, newIndex) => list.reorder(oldIndex, newIndex, reorderFunctions)}
            renderItem={(func) => rows[listed.indexOf(func)]}
          />
        ) : (
          rows
        )}
      </div>
      {listed.length === 0 && functions.length > 0 && (
        <p className="py-8 text-center text-sm text-ink-muted">
          {search.trim() ? `No functions match “${search.trim()}”.` : 'No functions in this category.'}
        </p>
      )}
    </BrowseLayout>
  );
}

// The chosen function (mockup 3a): its formula, the inputs it uses to try it, what uses it,
// and the returned value on the inverted block with Edit function.
function FunctionQuickView({
  func,
  functions,
  onDuplicate,
  onEdit,
  onClose,
}: {
  func: SharedFunction;
  functions: SharedFunction[];
  onDuplicate: () => void;
  onEdit: () => void;
  onClose: () => void;
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
          <div className="flex gap-0.5">
            <IconButton label="Duplicate" icon={<Copy className="h-4 w-4" aria-hidden="true" />} onClick={onDuplicate} />
            <IconButton label="Edit" icon={<Pencil className="h-4 w-4" aria-hidden="true" />} onClick={onEdit} />
            <IconButton label="Close preview" icon={<X className="h-4 w-4" aria-hidden="true" />} onClick={onClose} />
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
