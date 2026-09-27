'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FunctionSquare } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { CatalogTabs, useCatalogTabItems } from '@/components/shared/catalog/CatalogTabs';
import { Button } from '@/components/ui/Button';
import { RailRow } from '@/components/ui/RailRow';
import { findFunctionUsage, formatFunctionSignature } from '@/lib/functions/function-usage';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { FunctionEditorView } from './FunctionEditorView';

// Catalog · Functions (mockup 3d): a rail of functions, the chosen one's editor, and a live test run.
export default function FunctionsPage() {
  const functions = useFunctionsStore((state) => state.functions);
  const calculators = useCalculatorsStore((state) => state.calculators);
  const tabs = useCatalogTabItems();
  // The stores load from localStorage, so show them only after mount (prerender = first render).
  const [mounted, setMounted] = useState(false);
  // A saved function's id, 'new' while creating one, or null for nothing chosen.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Bumped after a save, so the editor reopens from what was saved.
  const [editorVersion, setEditorVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null | undefined>(undefined);

  useEffect(() => setMounted(true), []);

  // Start on the first function; move off one that was deleted.
  useEffect(() => {
    if (!mounted) return;
    if (selectedId === null || (selectedId !== 'new' && !functions.some((func) => func.id === selectedId))) {
      setSelectedId(functions[0]?.id ?? null);
    }
  }, [mounted, functions, selectedId]);

  const select = (id: string | null) => {
    if (id === selectedId) return;
    if (dirty) {
      setPendingSelection(id);
      return;
    }
    setDirty(false);
    setSelectedId(id);
  };

  const usageCounts = useMemo(
    () =>
      new Map(
        functions.map((func) => {
          const usage = findFunctionUsage(func.name, functions, func.id, calculators);
          return [func.id, usage.calculators.length + usage.functions.length];
        })
      ),
    [functions, calculators]
  );

  const handleSaved = useCallback((id: string) => {
    setDirty(false);
    setSelectedId(id);
    setEditorVersion((version) => version + 1);
  }, []);

  const handleDiscard = () => {
    setDirty(false);
    if (selectedId === 'new') setSelectedId(functions[0]?.id ?? null);
    else setEditorVersion((version) => version + 1);
  };

  const pendingName = (() => {
    if (selectedId === 'new') return 'the new function';
    const func = functions.find((item) => item.id === selectedId);
    return func ? `“${func.displayName || func.name}”` : 'this function';
  })();

  return (
    <Layout>
      <div className="lg:h-[calc(100vh-var(--app-header-h))] lg:flex lg:flex-col">
        <PageHeader
          eyebrow="Catalog · Reusable calculations"
          title="Catalog"
          actions={
            <Button variant="accent" onClick={() => select('new')}>
              + New function
            </Button>
          }
        >
          <CatalogTabs items={tabs} active="functions" />
        </PageHeader>

        {mounted && functions.length === 0 && selectedId !== 'new' ? (
          <div className="px-4 sm:px-6 py-10">
            <EmptyState
              icon={FunctionSquare}
              title="No functions yet"
              description="Create reusable functions to use across your calculators and formulas."
              iconSize="small"
              actions={
                <Button variant="accent" onClick={() => select('new')}>
                  + New function
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_340px] lg:flex-1 lg:min-h-0">
            <nav
              aria-label="Functions"
              className="flex flex-col gap-1 px-3 py-4 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto"
            >
              {selectedId === 'new' && <RailRow title="New function" subtitle="Not saved yet" selected />}
              {mounted &&
                functions.map((func) => (
                  <RailRow
                    key={func.id}
                    title={func.displayName || func.name}
                    subtitle={<span className="font-numeric">{formatFunctionSignature(func)}</span>}
                    value={<span className="text-xs text-ink-faint">{usageCounts.get(func.id) ?? 0}</span>}
                    selected={func.id === selectedId}
                    onClick={() => select(func.id)}
                  />
                ))}
            </nav>

            {mounted && selectedId && (
              <FunctionEditorView
                key={`${selectedId}:${editorVersion}`}
                functionId={selectedId}
                onSaved={handleSaved}
                onDiscard={handleDiscard}
                onDeleted={() => {
                  setDirty(false);
                  setSelectedId(null);
                }}
                onDuplicated={(id) => {
                  setDirty(false);
                  setSelectedId(id);
                }}
                onDirtyChange={setDirty}
              />
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingSelection !== undefined}
        title="Discard your changes?"
        message={`Your changes to ${pendingName} aren't saved. Switching now throws them away.`}
        confirmLabel="Discard changes"
        destructive
        onConfirm={() => {
          setDirty(false);
          setSelectedId(pendingSelection ?? null);
          setPendingSelection(undefined);
        }}
        onCancel={() => setPendingSelection(undefined)}
      />
    </Layout>
  );
}
