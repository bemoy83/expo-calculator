'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SortableFieldItem } from '@/components/module-editor/SortableFieldItem';
import { Field } from '@/lib/types';
import { Plus } from 'lucide-react';
import { SortableList } from '@/components/shared/SortableList';

interface FieldsManagerProps {
  fields: Field[];
  expandedFields: Set<string>;
  fieldErrors: Record<string, Record<string, string>>;
  onToggleExpanded: (fieldId: string) => void;
  onUpdateField: (id: string, updates: Partial<Field>) => void;
  onRemoveField: (id: string) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onAddField: () => void;
  setFieldRef: (id: string, element: HTMLDivElement | null) => void;
}

export function FieldsManager({
  fields,
  expandedFields,
  fieldErrors,
  onToggleExpanded,
  onUpdateField,
  onRemoveField,
  onReorder,
  onAddField,
  setFieldRef,
}: FieldsManagerProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Input Fields</h2>
      </div>

      {fields.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <p className="text-sm text-md-on-surface-variant mb-3">
              Fields define the inputs required for your calculation formula. Each field becomes a variable you can use in your formula.
            </p>
            <Button size="sm" onClick={onAddField} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Field
            </Button>
          </div>
        </Card>
      ) : (
        <SortableList
          items={fields}
          onReorder={onReorder}
          className="flex flex-col gap-3"
          renderItem={(field) => {
            const isExpanded = expandedFields.has(field.id);
            const fieldError = fieldErrors[field.id] || {};

            return (
              <SortableFieldItem
                key={field.id}
                field={field}
                isExpanded={isExpanded}
                fieldError={fieldError}
                onToggleExpanded={onToggleExpanded}
                onUpdateField={onUpdateField}
                onRemoveField={onRemoveField}
                fieldRef={(el) => setFieldRef(field.id, el)}
              />
            );
          }}
        />
      )}
    </div>
  );
}






