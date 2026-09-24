'use client';

import { Button } from '@/components/ui/Button';
import { SortableFieldItem } from '@/components/module-editor/SortableFieldItem';
import { Field } from '@/lib/types';
import { Plus } from 'lucide-react';
import { SortableList } from '@/components/shared/SortableList';
import { SectionBar } from '@/components/module-editor/SectionBar';

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
    <section aria-labelledby="fields-heading" className="space-y-3">
      <SectionBar
        id="fields-heading"
        title="Input fields"
        count={fields.length}
        action={
          <Button variant="secondary" size="sm" onClick={onAddField}>
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Add field
          </Button>
        }
      />

      {fields.length === 0 ? (
        <p className="px-4 py-6 rounded-[10px] border border-dashed border-border-strong text-center text-sm text-ink-muted">
          Fields are the inputs a quote asks for. Each one becomes a variable you can use in the formula.
        </p>
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
    </section>
  );
}








