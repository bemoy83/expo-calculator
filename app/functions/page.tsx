'use client';

import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/shared/EmptyState';
import { EntityCard } from '@/components/shared/EntityCard';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { describeFunctionUsage, findFunctionUsage, formatFunctionSignature } from '@/lib/functions/function-usage';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { SharedFunction } from '@/lib/types';
import { Plus, FunctionSquare, Trash2 } from 'lucide-react';
import { FunctionEditorView } from './FunctionEditorView';

export default function FunctionsPage() {
  const functions = useFunctionsStore((state) => state.functions);
  const deleteFunction = useFunctionsStore((state) => state.deleteFunction);
  const modules = useModulesStore((state) => state.modules);
  const calculators = useCalculatorsStore((state) => state.calculators);
  const [editingFunctionId, setEditingFunctionId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleCloseEditor = () => {
    setEditingFunctionId(null);
    setShowCreate(false);
  };

  if (showCreate || editingFunctionId) {
    return (
      <FunctionEditorView
        functionId={showCreate ? 'new' : editingFunctionId!}
        onClose={handleCloseEditor}
      />
    );
  }

  return (
    <Layout>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Functions</h1>
          <p className="text-xs text-ink-muted">
            {functions.length} {functions.length === 1 ? 'function' : 'functions'} · reusable calculations to call from module formulas
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
          New function
        </Button>
      </div>

      {functions.length === 0 ? (
        <EmptyState
          icon={FunctionSquare}
          title="No functions yet"
          description="Create reusable functions to use across your modules and formulas."
          iconSize="small"
          actions={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              New function
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {functions.map((func) => {
            const title = func.displayName || func.name;
            const usage = findFunctionUsage(func.name, modules, functions, func.id, calculators);
            const usageCount = usage.modules.length + usage.functions.length + usage.calculators.length;
            return (
              <EntityCard
                key={func.id}
                title={title}
                category={func.category}
                description={func.description}
                onClick={() => setEditingFunctionId(func.id)}
                actions={[
                  {
                    icon: Trash2,
                    actionType: 'delete',
                    onAction: () => deleteFunction(func.id),
                    ariaLabel: `Delete function: ${title}`,
                    confirmation: {
                      title: `Delete "${title}"?`,
                      message:
                        usageCount > 0
                          ? `It's used by ${describeFunctionUsage(usage)}. Deleting it will stop those formulas from calculating.`
                          : 'It isn’t used by any module or function.',
                    },
                  },
                ]}
                sections={[
                  {
                    label: 'Call as',
                    content: (
                      <div>
                        <code className="block text-[13px] font-numeric font-medium text-action break-all">
                          {formatFunctionSignature(func)}
                        </code>
                        <p className={`mt-1 text-xs ${usageCount > 0 ? 'text-ink-muted' : 'text-ink-faint'}`}>
                          {usageCount > 0 ? `Used by ${describeFunctionUsage(usage)}` : 'Not used yet'}
                        </p>
                      </div>
                    ),
                    spacing: 'small',
                  },
                  {
                    label: 'Parameters',
                    content: (
                      <div className="flex flex-wrap gap-1.5">
                        {func.parameters.map((param) => (
                          <Chip key={param.name} size="sm" variant="primaryTonal">
                            {param.label}
                            {param.unitSymbol && <span className="ml-1 font-numeric opacity-70">{param.unitSymbol}</span>}
                          </Chip>
                        ))}
                      </div>
                    ),
                    spacing: 'small',
                  },
                  {
                    label: 'Formula',
                    content: (
                      <code className="block px-2.5 py-2 rounded-md bg-sunken text-xs leading-relaxed font-numeric text-ink-body whitespace-pre-wrap break-words">
                        {func.formula}
                        {func.returnUnitSymbol && <span className="text-ink-faint"> → {func.returnUnitSymbol}</span>}
                      </code>
                    ),
                    spacing: 'small',
                  },
                ]}
              />
            );
          })}
        </div>
      )}
    </Layout>
  );
}
