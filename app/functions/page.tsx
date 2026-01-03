'use client';

import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { EntityCard } from '@/components/shared/EntityCard';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { SharedFunction } from '@/lib/types';
import { Plus, FunctionSquare, Trash2, Edit2 } from 'lucide-react';
import { FunctionEditorView } from './FunctionEditorView';
import { Chip } from '@/components/ui/Chip';

export default function FunctionsPage() {
  const functions = useFunctionsStore((state) => state.functions);
  const deleteFunction = useFunctionsStore((state) => state.deleteFunction);
  const [editingFunctionId, setEditingFunctionId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleEdit = (func: SharedFunction) => {
    setEditingFunctionId(func.id);
  };

  const handleDelete = (func: SharedFunction) => {
    if (confirm(`Are you sure you want to delete function "${func.displayName || func.name}"?`)) {
      deleteFunction(func.id);
    }
  };

  const handleCloseEditor = () => {
    setEditingFunctionId(null);
    setShowCreate(false);
  };

  // Show editor if creating or editing
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
      <PageHeader
        title="Functions Library"
        subtitle="Manage reusable calculation functions"
        actions={
          <Button onClick={() => setShowCreate(true)} className="rounded-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Function
          </Button>
        }
      />

      {functions.length === 0 ? (
        <EmptyState
          icon={FunctionSquare}
          title="No functions yet"
          description="Create reusable functions to use across your modules and formulas."
          actions={
            <Button onClick={() => setShowCreate(true)} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Function
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {functions.map((func) => (
            <EntityCard
              key={func.id}
              title={func.displayName || func.name}
              description={func.description}
              category={func.category}
              onClick={() => handleEdit(func)}
              actions={[
                {
                  icon: Edit2,
                  actionType: 'edit',
                  onAction: () => handleEdit(func),
                  ariaLabel: `Edit function: ${func.displayName || func.name}`,
                },
                {
                  icon: Trash2,
                  actionType: 'delete',
                  onAction: () => handleDelete(func),
                  ariaLabel: `Delete function: ${func.displayName || func.name}`,
                  confirmationMessage: `Are you sure you want to delete "${func.displayName || func.name}"?`,
                },
              ]}
              sections={[
                {
                  label: 'Parameters',
                  content: (
                    <div className="flex flex-wrap gap-2">
                      {func.parameters.map((param) => (
                        <Chip
                          key={param.name}
                          size="sm"
                          variant="primaryTonal"
                        >
                          {param.label} ({param.name})
                        </Chip>
                      ))}
                    </div>
                  ),
                  spacing: 'small',
                },
                {
                  label: 'Formula',
                  content: (
                    <Textarea
                      value={func.formula}
                      readOnly
                      autoGrow={true}
                      className="font-mono text-xs text-md-primary resize-none cursor-default"
                    />
                  ),
                  spacing: 'small',
                },

              ]}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}



