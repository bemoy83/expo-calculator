'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Chip } from '@/components/ui/Chip';
import { ModuleCardShell } from '@/components/shared/ModuleCardShell';
import { Select } from '@/components/ui/Select';
import type { QuoteModuleInstance, CalculationModule } from '@/lib/types';

/**
 * SortableModuleInstance Component
 *
 * Sortable card displaying a module instance within a template.
 * Features drag-to-reorder, collapsible field inputs, and delete functionality.
 */

export interface SortableModuleInstanceProps {
  instance: QuoteModuleInstance;
  module: CalculationModule | undefined;
  isExpanded: boolean;
  onToggleExpanded: (instanceId: string) => void;
  onRemove: (instanceId: string) => void;
  // Field linking props from use-template-editor hook
  workspaceModules: QuoteModuleInstance[];
  isFieldLinked?: (instance: QuoteModuleInstance, fieldName: string) => boolean;
  isLinkBroken?: (instance: QuoteModuleInstance, fieldName: string) => boolean;
  getLinkDisplayName?: (instance: QuoteModuleInstance, fieldName: string) => string;
  buildLinkOptions?: (instance: QuoteModuleInstance, field: { variableName: string; type: any }) => Array<{ value: string; label: string }>;
  onLinkField?: (instanceId: string, fieldName: string, targetInstanceId: string, targetFieldName: string) => void;
  onUnlinkField?: (instanceId: string, fieldName: string) => void;
}

export function SortableModuleInstance({
  instance,
  module,
  isExpanded,
  onToggleExpanded,
  onRemove,
  workspaceModules,
  isFieldLinked,
  isLinkBroken,
  getLinkDisplayName,
  buildLinkOptions,
  onLinkField,
  onUnlinkField,
}: SortableModuleInstanceProps) {
  // Track which link UIs are open
  const [openLinkUIs, setOpenLinkUIs] = useState<Set<string>>(new Set());
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : (transform ? transition : 'none'),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 30 : 'auto',
  };

  // Toggle link UI for a specific field
  const toggleLinkUI = useCallback((fieldName: string) => {
    setOpenLinkUIs((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  }, []);

  // Handle link change from dropdown
  const handleLinkChange = useCallback(
    (fieldName: string, value: string) => {
      if (!onLinkField || !onUnlinkField) return;

      // Empty value or "Select..." - just close the dropdown
      if (value === '' || value === 'select') {
        setOpenLinkUIs((prev) => {
          const next = new Set(prev);
          next.delete(fieldName);
          return next;
        });
        return;
      }

      // "None" - dismiss dropdown and unlink if there's an existing link
      if (value === 'none') {
        // Check if field is currently linked
        const isCurrentlyLinked = isFieldLinked?.(instance, fieldName);
        if (isCurrentlyLinked) {
          onUnlinkField(instance.id, fieldName);
        }
        // Close link UI
        setOpenLinkUIs((prev) => {
          const next = new Set(prev);
          next.delete(fieldName);
          return next;
        });
        return;
      }

      // Actual link value - create the link
      // Split only on the first dot to handle computed outputs with 'out.' prefix
      const firstDotIndex = value.indexOf('.');
      if (firstDotIndex === -1) return;

      const targetInstanceId = value.substring(0, firstDotIndex);
      const targetFieldName = value.substring(firstDotIndex + 1);

      if (targetInstanceId && targetFieldName) {
        onLinkField(instance.id, fieldName, targetInstanceId, targetFieldName);
        // Close link UI after successful link
        setOpenLinkUIs((prev) => {
          const next = new Set(prev);
          next.delete(fieldName);
          return next;
        });
      }
    },
    [instance, isFieldLinked, onLinkField, onUnlinkField]
  );

  // Handle unlink
  const handleUnlink = useCallback(
    (fieldName: string) => {
      if (!onUnlinkField) return;
      onUnlinkField(instance.id, fieldName);
    },
    [instance.id, onUnlinkField]
  );

  // Build metachips: field count + computed outputs + link count
  const metaChips = useMemo(() => {
    const chips: React.ReactNode[] = [];

    // Early return if module is undefined
    if (!module) {
      return chips;
    }

    // Field count chip
    chips.push(
      <Chip key="field-count" size="sm" variant="primaryTonal" className="font-numeric">
        {module.fields.length} {module.fields.length === 1 ? 'field' : 'fields'}
      </Chip>
    );

    // Computed output chips
    if (module.computedOutputs && module.computedOutputs.length > 0) {
      module.computedOutputs.forEach((output) => {
        chips.push(
          <Chip key={output.id} size="sm" variant="flat">
            {output.label}
            {output.unitSymbol && (
              <span className="ml-1 text-xs opacity-70">({output.unitSymbol})</span>
            )}
          </Chip>
        );
      });
    }

    // Link count chip
    const linkCount = Object.keys(instance.fieldLinks || {}).length;
    if (linkCount > 0) {
      chips.push(
        <Chip key="link-count" size="sm" variant="outline">
          {linkCount} {linkCount === 1 ? 'link' : 'links'}
        </Chip>
      );
    }

    return chips;
  }, [module, instance.fieldLinks]);

  if (!module) {
    return (
      <ModuleCardShell
        cardRef={setNodeRef}
        style={style}
        dragHandleProps={{ attributes, listeners }}
        title="Module not found"
        isCollapsed={true}
        onToggle={() => {}}
      >
        <div className="p-4 text-sm text-ink-muted">
          Module not found
        </div>
      </ModuleCardShell>
    );
  }

  return (
    <ModuleCardShell
      cardRef={setNodeRef}
      style={style}
      dragHandleProps={{ attributes, listeners }}
      title={module.name}
      category={module.category}
      metaChips={metaChips}
      subtitle={module.description || undefined}
      isCollapsed={!isExpanded}
      onToggle={() => onToggleExpanded(instance.id)}
      onRemove={() => onRemove(instance.id)}
      removeConfirmMessage={`Remove ${module.name} from template?`}
    >
      {/* Expanded: how each field gets its value in a quote. A template is a reusable chain
          of modules, so it holds links, not input values (see the gap analysis). */}
      {isExpanded && (
        <div className="p-4 border-t border-border">
          {module.fields.length === 0 ? (
            <p className="text-sm text-ink-muted">This module has no input fields.</p>
          ) : (
            <ul className="divide-y divide-border">
              {module.fields.map((field) => {
                // Material pickers can't be linked; the choice is made per quote.
                const canLink = field.type !== 'material' && workspaceModules.length > 1;
                const linked = isFieldLinked ? isFieldLinked(instance, field.variableName) : false;
                const broken = linked && isLinkBroken ? isLinkBroken(instance, field.variableName) : false;
                const linkUIOpen = openLinkUIs.has(field.variableName);
                const options = canLink && buildLinkOptions ? linkableOptions(buildLinkOptions(instance, field)) : [];

                return (
                  <li key={field.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">
                          {field.label}
                          {field.unitSymbol && <span className="ml-1.5 text-[11px] font-numeric text-ink-faint">{field.unitSymbol}</span>}
                          {field.required && <span className="ml-1.5 text-[11px] font-normal text-ink-muted">required</span>}
                        </p>
                        <p className={`text-xs ${broken ? 'text-danger' : linked ? 'text-action' : 'text-ink-muted'}`}>
                          {broken
                            ? 'Broken link: the source is no longer in this template'
                            : linked
                              ? `From ${getLinkDisplayName ? getLinkDisplayName(instance, field.variableName) : 'another module'}`
                              : 'Entered in each quote'}
                        </p>
                      </div>
                      {canLink && (linked ? (
                        <button
                          type="button"
                          onClick={() => handleUnlink(field.variableName)}
                          className="px-2 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-danger hover:bg-danger-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                          aria-label={`Unlink ${field.label}`}
                        >
                          Unlink
                        </button>
                      ) : options.length > 0 && !linkUIOpen ? (
                        <button
                          type="button"
                          onClick={() => toggleLinkUI(field.variableName)}
                          className="px-2 py-1 rounded-md border border-border-strong text-xs font-semibold text-action hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                          aria-label={`Link ${field.label} to another module`}
                        >
                          Link…
                        </button>
                      ) : null)}
                    </div>
                    {canLink && !linked && linkUIOpen && (
                      <div className="mt-2 flex items-center gap-2">
                        <Select
                          aria-label={`Take ${field.label} from`}
                          value=""
                          onChange={(event) => handleLinkChange(field.variableName, event.target.value)}
                          options={[{ value: '', label: 'Take the value from…' }, ...options]}
                        />
                        <button
                          type="button"
                          onClick={() => toggleLinkUI(field.variableName)}
                          className="shrink-0 px-2 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </ModuleCardShell>
  );
}

// The shared option builder lists "None" and a heading for every other module, even when that
// module has nothing compatible. Keep only real targets ("instanceId.field") and the headings
// that have at least one, so "Link…" is offered only when there is something to link to.
function linkableOptions(options: Array<{ value: string; label: string }>) {
  const result: Array<{ value: string; label: string }> = [];
  let pendingHeading: { value: string; label: string } | null = null;
  for (const option of options) {
    if (option.value.startsWith('sep-')) {
      pendingHeading = option;
    } else if (option.value.includes('.')) {
      if (pendingHeading) {
        result.push(pendingHeading);
        pendingHeading = null;
      }
      result.push(option);
    }
  }
  return result.some((option) => option.value.includes('.')) ? result : [];
}

