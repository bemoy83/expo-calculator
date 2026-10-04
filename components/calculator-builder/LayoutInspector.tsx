'use client';

import { memo, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus, Pencil, Plus, Type, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Segmented } from '@/components/ui/Segmented';
import { SURFACES, type Surface } from './layout-surface';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { LINE_HUES, lineColorVar, type LineHue } from '@/lib/calculator/line-color';
import { cn } from '@/lib/utils';
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
  onSetColor: (color: LineHue | undefined) => void;
}

// The inspector (mockup 4c): what's selected as an eyebrow ("INPUT · IN VEGGEN"), its name
// large with its formula name under it, then its settings.
function Panel({
  kind,
  title,
  detail,
  onClose,
  children,
}: {
  kind: string;
  title: string;
  detail?: ReactNode;
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>{kind}</Eyebrow>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Deselect"
            className="p-1 -mr-1 rounded text-ink-faint hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div>
        <h2 className="text-[22px] font-bold tracking-[-.02em] text-ink break-words">{title}</h2>
        {detail && <div className="mt-0.5 font-numeric text-[13px]">{detail}</div>}
      </div>
      {children}
    </div>
  );
}

const SWATCHES: Array<{ hue: LineHue | undefined; label: string }> = [
  { hue: undefined, label: 'No colour' },
  ...LINE_HUES.map((hue) => ({ hue, label: hue[0].toUpperCase() + hue.slice(1) })),
];

// The calculator's colour in quotes: none, or one of the six hues.
function ColorSwatches({ value, onChange }: { value?: LineHue; onChange: (color: LineHue | undefined) => void }) {
  return (
    <div role="radiogroup" aria-label="Colour in quotes" className="flex flex-wrap gap-2.5">
      {SWATCHES.map(({ hue, label }) => {
        const color = lineColorVar(hue);
        const checked = hue === value;
        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={label}
            title={label}
            onClick={() => onChange(hue)}
            style={{
              backgroundColor: color,
              boxShadow: checked ? `0 0 0 2px rgb(var(--surface)), 0 0 0 4px ${color ?? 'rgb(var(--ink))'}` : undefined,
            }}
            className={cn(
              'h-[26px] w-[26px] rounded-full transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2',
              !color && 'border border-dashed border-border-strong'
            )}
          />
        );
      })}
    </div>
  );
}

function CalculatorPanel({ calculator, name, actions }: { calculator: Calculator; name: string; actions: LayoutInspectorActions }) {
  const meta = [
    calculator.category,
    `${calculator.inputs.length} ${calculator.inputs.length === 1 ? 'input' : 'inputs'}`,
    `${calculator.parts.length} ${calculator.parts.length === 1 ? 'part' : 'parts'}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Panel kind="Calculator" title={name || 'Untitled calculator'} detail={<span className="text-ink-faint">{meta}</span>}>
      <div className="flex flex-col gap-2.5">
        <span className={FIELD_LABEL}>Colour in quotes</span>
        <ColorSwatches value={calculator.color} onChange={actions.onSetColor} />
        <p className="text-xs leading-[1.5] text-ink-muted">
          In Quote line view, the preview matches the quote builder exactly. Click its header to come back here.
        </p>
      </div>
    </Panel>
  );
}

const sectionName = (calculator: Calculator, sectionId: string) => {
  const index = calculator.layout.findIndex((section) => section.id === sectionId);
  return calculator.layout[index]?.title || `Section ${index + 1}`;
};

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
        <Button variant="danger" size="sm" className="ml-auto" onClick={() => actions.onRemoveItem(position)}>
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
    <Panel kind="Section" title={section.title || `Section ${index + 1}`} onClose={actions.onDeselect}>
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
        <Button variant="danger" size="sm" className="ml-auto" onClick={() => actions.onRemoveSection(section.id)}>
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
      <Panel
        kind={`Input · in ${sectionName(calculator, position.sectionId)}`}
        title={input?.label ?? 'Deleted input'}
        detail={
          input && (
            <span className="text-token-input">
              {input.key}
              {'unitSymbol' in input.value && input.value.unitSymbol ? ` · ${input.value.unitSymbol}` : ''}
            </span>
          )
        }
        onClose={actions.onDeselect}
      >
        {input && (
          <>
            <div>
              <span id="layout-width-label" className={FIELD_LABEL}>
                Width
              </span>
              <Segmented
                aria-labelledby="layout-width-label"
                block
                options={WIDTHS}
                value={item.width ?? 'half'}
                onChange={(width) => update({ ...item, width })}
              />
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
      <Panel
        kind={`Result · in ${sectionName(calculator, position.sectionId)}`}
        title={step ? step.label || step.key : 'Deleted result'}
        detail={step && <span className="text-token-result">{step.key}</span>}
        onClose={actions.onDeselect}
      >
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
      <Panel kind={`Breakdown · in ${sectionName(calculator, position.sectionId)}`} title={item.title || 'Breakdown'} onClose={actions.onDeselect}>
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
      <Panel kind={`Text · in ${sectionName(calculator, position.sectionId)}`} title="Text" onClose={actions.onDeselect}>
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
    <Panel kind={`Divider · in ${sectionName(calculator, position.sectionId)}`} title="Divider" onClose={actions.onDeselect}>
      <PlacementControls calculator={calculator} position={position} actions={actions} removeLabel="Remove" />
    </Panel>
  );
}

// Edits what's selected on the canvas; with nothing selected, lists the inputs not on the page.
// Memoized: `actions` is a fresh object every CalculatorBuilder render, but its methods are
// behaviorally stable whenever the compared props haven't changed (they close over `edit`,
// `setSelection` etc., always the current React state setters) — safe to bail without comparing it.
export const LayoutInspector = memo(function LayoutInspector({
  calculator,
  selectedSection,
  selectedItem,
  library,
  name,
  surface,
  onSurfaceChange,
  actions,
}: {
  calculator: Calculator;
  selectedSection?: LayoutSection;
  selectedItem?: { item: LayoutItem; position: LayoutPosition };
  library: CalculatorLibrary;
  /** The calculator's name as typed in the header (saved only with the calculator). */
  name: string;
  /** How the preview draws the form, and changing it */
  surface: Surface;
  onSurfaceChange: (surface: Surface) => void;
  actions: LayoutInspectorActions;
}) {
  let panel: ReactNode;
  if (selectedSection) panel = <SectionPanel calculator={calculator} section={selectedSection} library={library} actions={actions} />;
  else if (selectedItem) {
    panel = <ItemPanel calculator={calculator} item={selectedItem.item} position={selectedItem.position} library={library} actions={actions} />;
  } else panel = <CalculatorPanel calculator={calculator} name={name} actions={actions} />;

  return (
    <>
      {/* Pinned, so the picker and the panel below it keep their place however the surface changes. */}
      <div className="flex flex-none flex-col gap-2 border-b border-border px-6 py-4">
        <span id="preview-as-label" className="font-numeric text-[11px] font-semibold uppercase tracking-[.06em] text-ink-faint">
          Preview as
        </span>
        <Segmented aria-labelledby="preview-as-label" block size="compact" className="[&>button]:px-2" options={SURFACES} value={surface} onChange={onSurfaceChange} />
        <p className="min-h-8 text-xs leading-[1.35] text-ink-faint">{SURFACES.find((candidate) => candidate.value === surface)?.note}</p>
      </div>
      <div className="px-6 py-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">{panel}</div>
    </>
  );
},
(prev, next) =>
  prev.calculator === next.calculator &&
  prev.selectedSection === next.selectedSection &&
  prev.selectedItem?.item === next.selectedItem?.item &&
  prev.selectedItem?.position.sectionId === next.selectedItem?.position.sectionId &&
  prev.selectedItem?.position.index === next.selectedItem?.position.index &&
  prev.library === next.library &&
  prev.name === next.name &&
  prev.surface === next.surface
);
