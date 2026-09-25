'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus, Pencil, Plus, Trash2, Type, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { SectionBar } from '@/components/module-editor/SectionBar';
import { isStepShown, unplacedInputs, widgetsFor, type LayoutPosition } from '@/lib/calculator/editing';
import type {
  Calculator,
  CalculatorInput,
  CalculatorLibrary,
  Condition,
  InputWidget,
  LayoutItem,
  LayoutItemWidth,
  LayoutSection,
} from '@/lib/calculator/types';
import { cn } from '@/lib/utils';
import { ConditionEditor } from './ConditionEditor';

const WIDGET_LABEL: Record<InputWidget, string> = {
  number: 'Number box',
  stepper: 'Stepper (− value +)',
  slider: 'Slider',
  toggle: 'Switch',
  checkbox: 'Checkbox',
  dropdown: 'Dropdown',
  segmented: 'Buttons in a row',
  radio: 'Radio list',
  picker: 'Picker',
  text: 'Text box',
};

const WIDTHS: Array<{ value: LayoutItemWidth; label: string }> = [
  { value: 'third', label: '⅓' },
  { value: 'half', label: '½' },
  { value: 'full', label: 'Full' },
];

const RESULT_STYLES: Array<{ value: 'row' | 'card' | 'headline'; label: string }> = [
  { value: 'row', label: 'Row: label and value' },
  { value: 'card', label: 'Card: boxed value' },
  { value: 'headline', label: 'Headline: large value' },
];

export interface LayoutInspectorActions {
  onUpdateSection: (sectionId: string, patch: Partial<Pick<LayoutSection, 'title' | 'description' | 'visibleWhen'>>) => void;
  onSetInputCondition: (input: CalculatorInput, condition: Condition | undefined) => void;
  onMoveSection: (sectionId: string, direction: -1 | 1) => void;
  onRemoveSection: (sectionId: string) => void;
  onAddSection: () => void;
  onInsertItem: (sectionId: string, item: LayoutItem) => void;
  onUpdateItem: (position: LayoutPosition, item: LayoutItem) => void;
  onMoveItem: (from: LayoutPosition, to: LayoutPosition) => void;
  onRemoveItem: (position: LayoutPosition) => void;
  onSetWidget: (input: CalculatorInput, widget: InputWidget) => void;
  onEditInput: (input: CalculatorInput) => void;
  onNewInput: (sectionId: string) => void;
  onDeselect: () => void;
}

function Panel({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink truncate">{title}</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Deselect"
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </Card>
  );
}

function PlacementControls({
  calculator,
  position,
  actions,
  removeLabel,
}: {
  calculator: Calculator;
  position: LayoutPosition;
  actions: LayoutInspectorActions;
  removeLabel: string;
}) {
  const section = calculator.layout.find((candidate) => candidate.id === position.sectionId);
  const count = section?.items.length ?? 0;
  return (
    <div className="space-y-3 pt-1 border-t border-border">
      <div className="pt-3">
        <Select
          label="Section"
          value={position.sectionId}
          options={calculator.layout.map((candidate, index) => ({
            value: candidate.id,
            label: candidate.title || `Section ${index + 1}`,
          }))}
          onChange={(event) => {
            const target = calculator.layout.find((candidate) => candidate.id === event.target.value);
            if (target) actions.onMoveItem(position, { sectionId: target.id, index: target.items.length });
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={position.index === 0}
          onClick={() => actions.onMoveItem(position, { ...position, index: position.index - 1 })}
          aria-label="Move earlier"
        >
          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={position.index >= count - 1}
          onClick={() => actions.onMoveItem(position, { ...position, index: position.index + 1 })}
          aria-label="Move later"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto text-danger" onClick={() => actions.onRemoveItem(position)}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          {removeLabel}
        </Button>
      </div>
    </div>
  );
}

function SectionPanel({
  calculator,
  section,
  library,
  actions,
}: {
  calculator: Calculator;
  section: LayoutSection;
  library: CalculatorLibrary;
  actions: LayoutInspectorActions;
}) {
  const index = calculator.layout.indexOf(section);
  const unplaced = unplacedInputs(calculator);
  const hiddenSteps = calculator.steps.filter((step) => !isStepShown(calculator, step.id));

  return (
    <Panel title={section.title || `Section ${index + 1}`} onClose={actions.onDeselect}>
      <Input
        label="Title (optional)"
        value={section.title ?? ''}
        onChange={(event) => actions.onUpdateSection(section.id, { title: event.target.value || undefined })}
      />
      <Textarea
        label="Description (optional)"
        rows={2}
        value={section.description ?? ''}
        onChange={(event) => actions.onUpdateSection(section.id, { description: event.target.value || undefined })}
      />
      <ConditionEditor
        label="Show this section only when…"
        calculator={calculator}
        condition={section.visibleWhen}
        library={library}
        onChange={(visibleWhen) => actions.onUpdateSection(section.id, { visibleWhen })}
      />

      <div className="space-y-2">
        <span className={FIELD_LABEL}>Add to this section</span>
        <Select
          aria-label="Add an input"
          value=""
          options={[
            { value: '', label: unplaced.length > 0 ? 'Input not on the page…' : 'All inputs are on the page' },
            ...unplaced.map((input) => ({ value: input.id, label: input.label })),
          ]}
          disabled={unplaced.length === 0}
          onChange={(event) => event.target.value && actions.onInsertItem(section.id, { type: 'input', inputId: event.target.value })}
        />
        <Select
          aria-label="Add a result"
          value=""
          options={[
            { value: '', label: hiddenSteps.length > 0 ? 'Result…' : 'Every result is on the page' },
            ...hiddenSteps.map((step) => ({ value: step.id, label: step.label || step.key })),
          ]}
          disabled={hiddenSteps.length === 0}
          onChange={(event) =>
            event.target.value && actions.onInsertItem(section.id, { type: 'result', stepId: event.target.value, style: 'row' })
          }
        />
        <div className="flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => actions.onNewInput(section.id)}>
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            New input
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => actions.onInsertItem(section.id, { type: 'breakdown', partIds: calculator.parts.map((part) => part.id) })}
          >
            Breakdown
          </Button>
          <Button variant="secondary" size="sm" onClick={() => actions.onInsertItem(section.id, { type: 'text', text: '' })}>
            <Type className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Text
          </Button>
          <Button variant="secondary" size="sm" onClick={() => actions.onInsertItem(section.id, { type: 'divider' })}>
            <Minus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Divider
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 pt-3 border-t border-border">
        <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => actions.onMoveSection(section.id, -1)} aria-label="Move section up">
          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={index === calculator.layout.length - 1}
          onClick={() => actions.onMoveSection(section.id, 1)}
          aria-label="Move section down"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto text-danger" onClick={() => actions.onRemoveSection(section.id)}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Delete section
        </Button>
      </div>
      {section.items.some((item) => item.type === 'input') && (
        <p className="text-xs text-ink-muted">Deleting a section keeps its inputs; they move to “Not on the page”.</p>
      )}
    </Panel>
  );
}

function ItemPanel({
  calculator,
  item,
  position,
  library,
  actions,
}: {
  calculator: Calculator;
  item: LayoutItem;
  position: LayoutPosition;
  library: CalculatorLibrary;
  actions: LayoutInspectorActions;
}) {
  const update = (next: LayoutItem) => actions.onUpdateItem(position, next);

  if (item.type === 'input') {
    const input = calculator.inputs.find((candidate) => candidate.id === item.inputId);
    const widgets = input ? widgetsFor(input.value.kind) : [];
    return (
      <Panel title={input?.label ?? 'Deleted input'} onClose={actions.onDeselect}>
        {input && (
          <>
            <div>
              <span className={FIELD_LABEL}>Width</span>
              <div role="radiogroup" aria-label="Width" className="flex gap-1 p-1 rounded-md bg-sunken">
                {WIDTHS.map((width) => {
                  const active = (item.width ?? 'half') === width.value;
                  return (
                    <button
                      key={width.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => update({ ...item, width: width.value })}
                      className={cn(
                        'flex-1 h-7 rounded text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
                        active ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink'
                      )}
                    >
                      {width.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {widgets.length > 1 && (
              <Select
                label="Shown as"
                value={input.widget}
                options={widgets.map((widget) => ({ value: widget, label: WIDGET_LABEL[widget] }))}
                onChange={(event) => actions.onSetWidget(input, event.target.value as InputWidget)}
              />
            )}
            {input.widget === 'slider' && input.value.kind === 'number' && (input.value.min === undefined || input.value.max === undefined) && (
              <p className="text-xs text-ink-muted">Set the lowest and highest value in the input to choose the slider&apos;s range (it uses 0–100 until then).</p>
            )}
            <ConditionEditor
              label="Show only when…"
              calculator={calculator}
              condition={input.visibleWhen}
              exceptKey={input.key}
              library={library}
              onChange={(condition) => actions.onSetInputCondition(input, condition)}
            />
            {input.visibleWhen && (
              <p className="text-xs text-ink-muted">
                While hidden, its default is used. Steps that should drop out need their own &ldquo;Only calculate when&rdquo;.
              </p>
            )}
            <Button variant="secondary" size="sm" onClick={() => actions.onEditInput(input)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Edit input
            </Button>
          </>
        )}
        <PlacementControls calculator={calculator} position={position} actions={actions} removeLabel="Remove from page" />
      </Panel>
    );
  }

  if (item.type === 'result') {
    const step = calculator.steps.find((candidate) => candidate.id === item.stepId);
    return (
      <Panel title={step ? `Result · ${step.label || step.key}` : 'Deleted result'} onClose={actions.onDeselect}>
        <Select
          label="Shows"
          value={item.stepId}
          options={[
            ...(step ? [] : [{ value: item.stepId, label: 'Deleted step' }]),
            ...calculator.steps.map((candidate) => ({ value: candidate.id, label: candidate.label || candidate.key })),
          ]}
          onChange={(event) => update({ ...item, stepId: event.target.value })}
        />
        <Select
          label="Style"
          value={item.style}
          options={RESULT_STYLES}
          onChange={(event) => update({ ...item, style: event.target.value as typeof item.style })}
        />
        <PlacementControls calculator={calculator} position={position} actions={actions} removeLabel="Remove" />
      </Panel>
    );
  }

  if (item.type === 'breakdown') {
    return (
      <Panel title="Breakdown" onClose={actions.onDeselect}>
        <Input label="Title (optional)" value={item.title ?? ''} onChange={(event) => update({ ...item, title: event.target.value || undefined })} />
        <div>
          <span className={FIELD_LABEL}>Parts listed (their costs, then the total)</span>
          <div className="space-y-1.5">
            {calculator.parts.map((part) => (
              <Checkbox
                key={part.id}
                label={part.name || 'Unnamed part'}
                checked={item.partIds.includes(part.id)}
                onChange={(event) =>
                  update({
                    ...item,
                    partIds: event.target.checked
                      ? calculator.parts.map((candidate) => candidate.id).filter((id) => id === part.id || item.partIds.includes(id))
                      : item.partIds.filter((id) => id !== part.id),
                  })
                }
              />
            ))}
          </div>
        </div>
        <PlacementControls calculator={calculator} position={position} actions={actions} removeLabel="Remove" />
      </Panel>
    );
  }

  if (item.type === 'text') {
    return (
      <Panel title="Text" onClose={actions.onDeselect}>
        <Textarea
          label="Text"
          rows={4}
          value={item.text}
          placeholder="e.g. Measure the wall from floor to ceiling."
          onChange={(event) => update({ ...item, text: event.target.value })}
        />
        <PlacementControls calculator={calculator} position={position} actions={actions} removeLabel="Remove" />
      </Panel>
    );
  }

  return (
    <Panel title="Divider" onClose={actions.onDeselect}>
      <PlacementControls calculator={calculator} position={position} actions={actions} removeLabel="Remove" />
    </Panel>
  );
}

// Edits what's selected on the canvas; with nothing selected, lists the inputs not on the page.
export function LayoutInspector({
  calculator,
  selectedSection,
  selectedItem,
  library,
  actions,
}: {
  calculator: Calculator;
  selectedSection?: LayoutSection;
  selectedItem?: { item: LayoutItem; position: LayoutPosition };
  library: CalculatorLibrary;
  actions: LayoutInspectorActions;
}) {
  if (selectedSection) return <SectionPanel calculator={calculator} section={selectedSection} library={library} actions={actions} />;
  if (selectedItem) {
    return (
      <ItemPanel calculator={calculator} item={selectedItem.item} position={selectedItem.position} library={library} actions={actions} />
    );
  }

  const unplaced = unplacedInputs(calculator);
  const firstSection = calculator.layout[0];
  return (
    <Card className="p-4 space-y-3">
      <p className="text-sm text-ink-body">Select an item or a section on the page to change it, or drag items by their handle to move them.</p>
      <SectionBar id="unplaced-inputs" title="Not on the page" count={unplaced.length} />
      {unplaced.length === 0 ? (
        <p className="text-xs text-ink-muted">Every input is on the page.</p>
      ) : (
        <ul className="space-y-1.5">
          {unplaced.map((input) => (
            <li key={input.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-ink truncate">{input.label}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  firstSection ? actions.onInsertItem(firstSection.id, { type: 'input', inputId: input.id }) : actions.onAddSection()
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Place
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-muted">Staff can&apos;t fill in inputs that aren&apos;t on the page; their defaults are used.</p>
    </Card>
  );
}
