'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EditorPageHeader } from '@/components/shared/EditorPageHeader';
import { SectionBar } from '@/components/module-editor/SectionBar';
import {
  addInput,
  addPart,
  addSection,
  addStep,
  ensureLayoutIds,
  findLayoutItem,
  insertLayoutItem,
  isStepShown,
  moveLayoutItem,
  moveSection,
  removeLayoutItem,
  removeSection,
  updateLayoutItem,
  updateSection,
  moveStepToPart,
  movePart,
  removeInput,
  removePart,
  removeStep,
  reorderStep,
  setPartCost,
  setStepShown,
  suggestKey,
  updateInput,
  updatePart,
  updateStep,
} from '@/lib/calculator/editing';
import { evaluateCalculator } from '@/lib/calculator/evaluate';
import type {
  Calculator,
  CalculatorInput,
  CalculatorLibrary,
  CalculatorStep,
  CalculatorValues,
  InputKind,
  LayoutItem,
} from '@/lib/calculator/types';
import type { LayoutRenderContext } from '@/components/calculator/CalculatorLayoutItem';
import { cn } from '@/lib/utils';
import { useCalculatorSessionStore } from '@/lib/stores/calculator-session-store';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { notify } from '@/lib/stores/notifications-store';
import { generateId } from '@/lib/utils';
import { InputEditorDialog } from './InputEditorDialog';
import { LayoutCanvas, type LayoutSelection } from './LayoutCanvas';
import { LayoutInspector, type LayoutInspectorActions } from './LayoutInspector';
import { BuilderInputField, PartCard } from './PartCard';

const EMPTY_VALUES: CalculatorValues = {};

type Pending =
  | { kind: 'discard' }
  | { kind: 'delete-calculator' }
  | { kind: 'delete-part'; partId: string }
  | { kind: 'delete-input'; input: CalculatorInput };

interface CalculatorBuilderProps {
  initial: Calculator;
  /** Already saved: offers Delete, and Close returns to it. */
  isSaved: boolean;
  library: CalculatorLibrary;
}

// The builder's parts view: each part as its own card to build and test, inputs defined
// once for the whole calculator, and test values shared with the staff view.
export function CalculatorBuilder({ initial, isSaved: initiallySaved, library }: CalculatorBuilderProps) {
  const router = useRouter();
  // Layout items get ids up front so a selection survives moving them.
  const [calculator, setCalculator] = useState(() => ensureLayoutIds(initial, generateId));
  const [view, setView] = useState<'parts' | 'layout'>('parts');
  const [preview, setPreview] = useState(false);
  const [selection, setSelection] = useState<LayoutSelection>(null);
  const [dirty, setDirty] = useState(false);
  const [isSaved, setIsSaved] = useState(initiallySaved);
  const [nameError, setNameError] = useState<string>();
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [inputDialog, setInputDialog] = useState<{
    input?: CalculatorInput;
    suggestedKey?: string;
    suggestedKind?: InputKind;
    suggestedLabel?: string;
    sectionId?: string;
    /** A function-call step parameter to link the new input to. */
    bindTo?: { stepId: string; paramName: string };
  } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const saveCalculator = useCalculatorsStore((state) => state.saveCalculator);
  const deleteCalculator = useCalculatorsStore((state) => state.deleteCalculator);
  const values = useCalculatorSessionStore((state) => state.values[calculator.id]) ?? EMPTY_VALUES;
  const setValue = useCalculatorSessionStore((state) => state.setValue);
  const formatMoney = useCurrencyStore((state) => state.formatCurrency);

  const result = useMemo(() => evaluateCalculator(calculator, values, library), [calculator, values, library]);
  const errorCount = Object.values(result.steps).filter((step) => step.status === 'error').length;
  const usedInputs = new Set(Object.values(result.parts).flatMap((part) => part.inputKeys));
  const unusedInputs = calculator.inputs.filter((input) => !usedInputs.has(input.key));

  const edit = (change: (current: Calculator) => Calculator) => {
    setCalculator((current) => change(current));
    setDirty(true);
  };
  const onValueChange = (key: string, value: CalculatorValues[string]) => setValue(calculator.id, key, value);

  const addStepTo = (partId: string) => {
    const step: CalculatorStep = {
      id: generateId(),
      partId,
      key: suggestKey(calculator, '', undefined, 'step'),
      label: '',
      source: { type: 'expression', expression: '' },
      format: 'number',
    };
    edit((current) => addStep(current, step));
    setExpandedStepId(step.id);
  };

  const addNewPart = () => {
    const part = { id: generateId(), name: `Part ${calculator.parts.length + 1}` };
    edit((current) => addPart(current, part));
  };

  const saveInput = (input: CalculatorInput) => {
    // A test value typed under the old name moves to the new one.
    const previous = calculator.inputs.find((existing) => existing.id === input.id);
    if (previous && previous.key !== input.key && values[previous.key] !== undefined) {
      setValue(calculator.id, input.key, values[previous.key]);
      setValue(calculator.id, previous.key, undefined);
    }
    const sectionId = inputDialog?.sectionId;
    edit((current) =>
      current.inputs.some((existing) => existing.id === input.id)
        ? updateInput(current, input)
        : addInput(current, input, generateId, sectionId)
    );
    const bindTo = inputDialog?.bindTo;
    if (bindTo) {
      edit((current) => {
        const step = current.steps.find((candidate) => candidate.id === bindTo.stepId);
        if (!step || step.source.type !== 'call') return current;
        return updateStep(current, {
          ...step,
          source: { ...step.source, args: { ...step.source.args, [bindTo.paramName]: { type: 'input', key: input.key } } },
        });
      });
    }
    if (sectionId) setSelection({ type: 'item', key: `input:${input.id}` });
    setInputDialog(null);
  };

  // ---- Layout view ----
  const inputsById = useMemo(() => new Map(calculator.inputs.map((input) => [input.id, input])), [calculator.inputs]);
  const inputsByKey = useMemo(() => new Map(calculator.inputs.map((input) => [input.key, input])), [calculator.inputs]);
  const layoutContext: LayoutRenderContext = {
    calculator,
    values,
    result,
    library,
    formatMoney,
    // As staff see it: inputs are marked "needed" only once something has been typed.
    needed: new Set(Object.values(values).some((value) => value !== undefined) ? result.missingInputs : []),
    inputsById,
    inputsByKey,
    onValueChange: (key, value) => setValue(calculator.id, key, value),
  };
  const selectedSection =
    selection?.type === 'section' ? calculator.layout.find((section) => section.id === selection.sectionId) : undefined;
  const selectedPosition = selection?.type === 'item' ? findLayoutItem(calculator, selection.key) : undefined;
  const selectedItem = selectedPosition
    ? {
        position: selectedPosition,
        item: calculator.layout.find((section) => section.id === selectedPosition.sectionId)!.items[selectedPosition.index],
      }
    : undefined;

  const addLayoutSection = (afterSectionId?: string) => {
    const id = generateId();
    edit((current) => addSection(current, { id, items: [] }, afterSectionId));
    setSelection({ type: 'section', sectionId: id });
  };

  const layoutActions: LayoutInspectorActions = {
    onUpdateSection: (sectionId, patch) => edit((current) => updateSection(current, sectionId, patch)),
    onMoveSection: (sectionId, direction) => edit((current) => moveSection(current, sectionId, direction)),
    onRemoveSection: (sectionId) => {
      edit((current) => removeSection(current, sectionId));
      setSelection(null);
    },
    onAddSection: () => addLayoutSection(),
    onInsertItem: (sectionId, item) => {
      const placed: LayoutItem = item.type === 'input' || item.type === 'result' ? item : { ...item, id: generateId() };
      edit((current) => insertLayoutItem(current, sectionId, placed));
      const section = calculator.layout.find((candidate) => candidate.id === sectionId);
      const key =
        placed.type === 'input'
          ? `input:${placed.inputId}`
          : placed.type === 'result'
            ? `result:${placed.stepId}`
            : `${placed.type}:${placed.id}`;
      if (section) setSelection({ type: 'item', key });
    },
    onUpdateItem: (position, item) => {
      edit((current) => updateLayoutItem(current, position, item));
      // Showing another step changes the item's key.
      if (item.type === 'result') setSelection({ type: 'item', key: `result:${item.stepId}` });
    },
    onMoveItem: (from, to) => edit((current) => moveLayoutItem(current, from, to)),
    onRemoveItem: (position) => {
      edit((current) => removeLayoutItem(current, position));
      setSelection(null);
    },
    onSetWidget: (input, widget) => edit((current) => updateInput(current, { ...input, widget })),
    onEditInput: (input) => setInputDialog({ input }),
    onNewInput: (sectionId) => setInputDialog({ sectionId }),
    onDeselect: () => setSelection(null),
  };

  const save = () => {
    if (!calculator.name.trim()) {
      setNameError('Give the calculator a name.');
      document.getElementById('calculator-name')?.focus();
      return;
    }
    const saved = saveCalculator({ ...calculator, name: calculator.name.trim() });
    setCalculator(saved);
    setDirty(false);
    if (!isSaved) {
      setIsSaved(true);
      router.replace(`/calculator/edit?id=${encodeURIComponent(saved.id)}`);
    }
    notify({ variant: 'success', message: `Saved “${saved.name}”.` });
  };

  const close = () => {
    if (isSaved) router.push(`/calculator?id=${encodeURIComponent(calculator.id)}`);
    else if (calculator.sourceModuleId) router.push(`/calculator?id=${encodeURIComponent(`module-${calculator.sourceModuleId}`)}`);
    else router.push('/');
  };

  const confirmPending = () => {
    if (!pending) return;
    switch (pending.kind) {
      case 'discard':
        close();
        break;
      case 'delete-calculator':
        deleteCalculator(calculator.id);
        notify({ variant: 'success', message: `Deleted “${calculator.name}”.` });
        router.push('/');
        break;
      case 'delete-part':
        edit((current) => removePart(current, pending.partId));
        break;
      case 'delete-input':
        edit((current) => removeInput(current, pending.input.id));
        setInputDialog(null);
        break;
    }
    setPending(null);
  };

  const pendingPart = pending?.kind === 'delete-part' ? calculator.parts.find((part) => part.id === pending.partId) : undefined;
  const pendingText: Record<Pending['kind'], { title: string; message?: string; label: string }> = {
    discard: { title: 'Discard changes?', message: 'Your changes to this calculator have not been saved.', label: 'Discard' },
    'delete-calculator': {
      title: `Delete “${calculator.name}”?`,
      message: calculator.sourceModuleId
        ? 'The calculator is deleted; the module it came from shows as a calculator again.'
        : 'The calculator is deleted for good.',
      label: 'Delete',
    },
    'delete-part': {
      title: `Delete “${pendingPart?.name || 'part'}”?`,
      message: 'Its steps are deleted with it. Steps in other parts that use them will say so.',
      label: 'Delete part',
    },
    'delete-input': {
      title: pending?.kind === 'delete-input' ? `Delete “${pending.input.label}”?` : 'Delete input?',
      message: 'Formulas that use it will show an error until they are changed.',
      label: 'Delete input',
    },
  };

  return (
    <>
      <EditorPageHeader
        section="Calculators"
        name={calculator.name}
        placeholderName="New calculator"
        status={{
          valid: errorCount === 0,
          validLabel: 'No errors',
          invalidLabel: errorCount === 1 ? '1 step has an error' : `${errorCount} steps have errors`,
        }}
        submitLabel="Save"
        cancelLabel={dirty ? 'Cancel' : 'Close'}
        onCancel={() => (dirty ? setPending({ kind: 'discard' }) : close())}
        onSubmit={save}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Builder view" className="flex gap-1 p-1 rounded-md bg-sunken">
          {(
            [
              ['parts', 'Parts'],
              ['layout', 'Layout'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={cn(
                'h-8 px-4 rounded text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
                view === value ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-muted flex-1 min-w-[200px]">
          {view === 'parts'
            ? 'The math: parts, their steps, and the inputs they use.'
            : 'What staff see: arrange inputs and results into sections.'}
        </p>
        {view === 'layout' && (
          <Button variant="secondary" size="sm" onClick={() => setPreview((current) => !current)} aria-pressed={preview}>
            {preview ? <EyeOff className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />}
            {preview ? 'Back to editing' : 'Preview'}
          </Button>
        )}
      </div>

      {view === 'layout' ? (
        <div className={cn('grid gap-5 items-start', !preview && 'lg:grid-cols-[minmax(0,1fr)_300px]')}>
          <LayoutCanvas
            context={layoutContext}
            selection={selection}
            preview={preview}
            onSelect={setSelection}
            onMove={layoutActions.onMoveItem}
            onAddSection={() => addLayoutSection()}
          />
          {!preview && (
            <div className="lg:sticky lg:top-8">
              <LayoutInspector
                calculator={calculator}
                selectedSection={selectedSection}
                selectedItem={selectedItem}
                actions={layoutActions}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)] gap-3">
              <Input
                id="calculator-name"
                label="Name"
                value={calculator.name}
                error={nameError}
                placeholder="e.g. Partition wall"
                onChange={(event) => {
                  setNameError(undefined);
                  const name = event.target.value;
                  edit((current) => ({ ...current, name }));
                }}
              />
              <Input
                label="Category"
                value={calculator.category ?? ''}
                placeholder="e.g. Walls"
                onChange={(event) => {
                  const category = event.target.value;
                  edit((current) => ({ ...current, category: category || undefined }));
                }}
              />
            </div>
            <div className="mt-3">
              <Textarea
                label="Description (optional)"
                rows={2}
                value={calculator.description ?? ''}
                onChange={(event) => {
                  const description = event.target.value;
                  edit((current) => ({ ...current, description: description || undefined }));
                }}
              />
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Parts</h2>
              <p className="text-xs text-ink-muted">
                Build and test one part at a time. Inputs belong to the whole calculator, so a value typed in one part is used by all of them.
              </p>
            </div>
            <p className="shrink-0 text-right">
              <span className="block text-xs text-ink-muted">Total</span>
              <span className="font-numeric text-lg font-semibold text-ink tabular-nums">
                {result.total !== undefined ? formatMoney(result.total) : '—'}
              </span>
            </p>
          </div>

          {calculator.parts.map((part, index) => (
            <PartCard
              key={part.id}
              calculator={calculator}
              part={part}
              result={result}
              values={values}
              library={library}
              formatMoney={formatMoney}
              isFirst={index === 0}
              isLast={index === calculator.parts.length - 1}
              expandedStepId={expandedStepId}
              isStepShown={(stepId) => isStepShown(calculator, stepId)}
              onToggleStep={(stepId) => setExpandedStepId((current) => (current === stepId ? null : stepId))}
              onRename={(name) => edit((current) => updatePart(current, { ...part, name }))}
              onMove={(direction) => edit((current) => movePart(current, part.id, direction))}
              onRemove={() =>
                calculator.steps.some((step) => step.partId === part.id)
                  ? setPending({ kind: 'delete-part', partId: part.id })
                  : edit((current) => removePart(current, part.id))
              }
              onAddStep={() => addStepTo(part.id)}
              onStepChange={(step) => edit((current) => updateStep(current, step))}
              onSetCost={(stepId) => edit((current) => setPartCost(current, part.id, stepId))}
              onSetShown={(stepId, shown) => edit((current) => setStepShown(current, stepId, shown, generateId))}
              onMoveStep={(stepId, direction) => edit((current) => reorderStep(current, stepId, direction))}
              onMoveStepToPart={(stepId, partId) => edit((current) => moveStepToPart(current, stepId, partId))}
              onRemoveStep={(step) => {
                edit((current) => removeStep(current, step.id));
                if (expandedStepId === step.id) setExpandedStepId(null);
              }}
              onValueChange={onValueChange}
              onEditInput={(input) => setInputDialog({ input })}
              onCreateInput={(key) => setInputDialog({ suggestedKey: key })}
              onCreateInputFor={(stepId, paramName, kind) => {
                const step = calculator.steps.find((candidate) => candidate.id === stepId);
                const fn =
                  step?.source.type === 'call'
                    ? library.functions.find((candidate) => candidate.name === (step.source as { functionName: string }).functionName)
                    : undefined;
                const label = fn?.parameters.find((param) => param.name === paramName)?.label || paramName;
                setInputDialog({
                  suggestedKey: suggestKey(calculator, label, undefined, 'value'),
                  suggestedKind: kind,
                  suggestedLabel: label,
                  bindTo: { stepId, paramName },
                });
              }}
            />
          ))}

          <Button variant="secondary" onClick={addNewPart}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Add part
          </Button>

          <Card className="p-4 sm:p-5">
            <SectionBar
              id="unused-inputs"
              title="Inputs not used yet"
              count={unusedInputs.length}
              action={
                <Button variant="ghost" size="sm" onClick={() => setInputDialog({})}>
                  <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  New input
                </Button>
              }
            />
            {unusedInputs.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                {calculator.inputs.length > 0 ? 'Every input is used by a step. ' : ''}
                New inputs show here until a step uses them. Staff see inputs in the order they were added.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unusedInputs.map((input) => (
                  <BuilderInputField
                    key={input.id}
                    input={input}
                    values={values}
                    result={result}
                    library={library}
                    formatMoney={formatMoney}
                    onValueChange={onValueChange}
                    onEdit={(target) => setInputDialog({ input: target })}
                  />
                ))}
              </div>
            )}
          </Card>

          {isSaved && (
            <div className="pt-2">
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => setPending({ kind: 'delete-calculator' })}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Delete calculator
              </Button>
            </div>
          )}
        </div>
      )}

      <InputEditorDialog
        isOpen={inputDialog !== null}
        calculator={calculator}
        input={inputDialog?.input}
        suggestedKey={inputDialog?.suggestedKey}
        suggestedKind={inputDialog?.suggestedKind}
        suggestedLabel={inputDialog?.suggestedLabel}
        library={library}
        onSave={saveInput}
        onDelete={(input) => setPending({ kind: 'delete-input', input })}
        onClose={() => setInputDialog(null)}
      />

      <ConfirmDialog
        isOpen={pending !== null}
        title={pending ? pendingText[pending.kind].title : ''}
        message={pending ? pendingText[pending.kind].message : undefined}
        confirmLabel={pending ? pendingText[pending.kind].label : 'Confirm'}
        destructive
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
