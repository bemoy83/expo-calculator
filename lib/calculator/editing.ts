import { labelToVariableName } from '../utils';
import { rewriteExpression } from './dependencies';
import type {
  Binding,
  Calculator,
  CalculatorInput,
  CalculatorPart,
  CalculatorStep,
  Condition,
  InputValueSpec,
  InputWidget,
  LayoutItem,
  LayoutSection,
} from './types';

// Pure edits for the calculator builder. Each returns a new calculator and keeps it
// consistent: renaming a key rewrites every formula, binding and condition that uses it,
// removing something removes it from the layout, and the layout keeps an inputs section and
// a results section until the layout view takes over arranging them.

type CreateId = () => string;

export function createEmptyCalculator(createId: CreateId, now: string): Calculator {
  const part: CalculatorPart = { id: createId(), name: 'Part 1' };
  return {
    id: createId(),
    name: '',
    inputs: [],
    parts: [part],
    steps: [],
    layout: [
      { id: createId(), items: [] },
      { id: createId(), title: 'Results', items: [{ type: 'breakdown', partIds: [part.id] }] },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// ---- Names ----

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Every name in use: input and step keys. */
export function takenKeys(calculator: Calculator, except?: string): Set<string> {
  const keys = new Set<string>();
  for (const input of calculator.inputs) if (input.id !== except) keys.add(input.key);
  for (const step of calculator.steps) if (step.id !== except) keys.add(step.key);
  return keys;
}

/** Why a name can't be used for the input or step `ownerId`, or undefined when it can. */
export function keyProblem(calculator: Calculator, key: string, ownerId?: string): string | undefined {
  if (!key) return 'Give it a name.';
  if (!KEY_PATTERN.test(key)) return 'Use letters, digits and _, not starting with a digit.';
  if (takenKeys(calculator, ownerId).has(key)) return `"${key}" is already used in this calculator.`;
  return undefined;
}

/** A free name derived from a label: "Wall width" → wall_width, wall_width_2, … */
export function suggestKey(calculator: Calculator, label: string, ownerId?: string, fallback = 'value'): string {
  const base = labelToVariableName(label).toLowerCase() || fallback;
  const start = /^[0-9]/.test(base) ? `_${base}` : base;
  const taken = takenKeys(calculator, ownerId);
  let key = start;
  for (let n = 2; taken.has(key); n += 1) key = `${start}_${n}`;
  return key;
}

function renameInCondition(condition: Condition | undefined, from: string, to: string): Condition | undefined {
  if (!condition || condition.inputKey !== from) return condition;
  return { ...condition, inputKey: to };
}

function renameInBinding(binding: Binding, from: string, to: string): Binding {
  if ((binding.type === 'input' || binding.type === 'step') && binding.key === from) return { ...binding, key: to };
  if (binding.type === 'property' && binding.inputKey === from) return { ...binding, inputKey: to };
  return binding;
}

/** Renames a key everywhere it's read: formulas (incl. `key.property`), bindings, conditions. */
export function renameKeyReferences(calculator: Calculator, from: string, to: string): Calculator {
  if (from === to) return calculator;
  const rewrite = (expression: string) =>
    rewriteExpression(expression, (token) => {
      if (token.isCall || token.base !== from) return null;
      return token.property !== undefined ? `${to}.${token.property}` : to;
    });
  return {
    ...calculator,
    inputs: calculator.inputs.map((input) => ({ ...input, visibleWhen: renameInCondition(input.visibleWhen, from, to) })),
    steps: calculator.steps.map((step) => ({
      ...step,
      enabledWhen: renameInCondition(step.enabledWhen, from, to),
      source:
        step.source.type === 'expression'
          ? { ...step.source, expression: rewrite(step.source.expression) }
          : {
              ...step.source,
              args: Object.fromEntries(
                Object.entries(step.source.args).map(([param, binding]) => [param, renameInBinding(binding, from, to)])
              ),
            },
    })),
    layout: calculator.layout.map((section) => ({ ...section, visibleWhen: renameInCondition(section.visibleWhen, from, to) })),
  };
}

// ---- Layout upkeep ----

function isInputSection(section: LayoutSection) {
  return section.items.length === 0 || section.items.some((item) => item.type === 'input');
}

function isResultsSection(section: LayoutSection) {
  return section.items.some((item) => item.type === 'result' || item.type === 'breakdown');
}

function withoutLayoutItems(calculator: Calculator, drop: (item: LayoutItem) => boolean): LayoutSection[] {
  return calculator.layout.map((section) => ({ ...section, items: section.items.filter((item) => !drop(item)) }));
}

/** Appends an item to the first section matching `where`, adding a section when none does. */
function placeItem(
  calculator: Calculator,
  item: LayoutItem,
  where: (section: LayoutSection) => boolean,
  createId: CreateId,
  newSection: Partial<LayoutSection>,
  atEnd: boolean
): LayoutSection[] {
  const index = atEnd
    ? calculator.layout.map(where).lastIndexOf(true)
    : calculator.layout.findIndex(where);
  if (index === -1) {
    const section: LayoutSection = { id: createId(), ...newSection, items: [item] };
    return atEnd ? [...calculator.layout, section] : [section, ...calculator.layout];
  }
  return calculator.layout.map((section, i) => (i === index ? { ...section, items: [...section.items, item] } : section));
}

// ---- Inputs ----

export function defaultWidget(kind: InputValueSpec['kind']): InputWidget {
  switch (kind) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'toggle';
    case 'choice':
      return 'dropdown';
    case 'material':
    case 'labor':
      return 'picker';
    case 'text':
      return 'text';
  }
}

/** Adds an input and shows it at the end of `sectionId`, else of the first inputs section. */
export function addInput(calculator: Calculator, input: CalculatorInput, createId: CreateId, sectionId?: string): Calculator {
  const next = { ...calculator, inputs: [...calculator.inputs, input] };
  if (sectionId && next.layout.some((section) => section.id === sectionId)) {
    return insertLayoutItem(next, sectionId, { type: 'input', inputId: input.id });
  }
  return {
    ...next,
    layout: placeItem(next, { type: 'input', inputId: input.id }, isInputSection, createId, {}, false),
  };
}

/** Replaces an input; a new key is carried to everything that reads the old one. */
export function updateInput(calculator: Calculator, updated: CalculatorInput): Calculator {
  const previous = calculator.inputs.find((input) => input.id === updated.id);
  if (!previous) return calculator;
  const renamed = renameKeyReferences(calculator, previous.key, updated.key);
  return { ...renamed, inputs: renamed.inputs.map((input) => (input.id === updated.id ? { ...updated, visibleWhen: input.visibleWhen } : input)) };
}

/**
 * Removes an input, its place in the layout, and conditions that test it (a condition on a
 * deleted input would hide its item for good). Formulas that read it will say so.
 */
export function removeInput(calculator: Calculator, inputId: string): Calculator {
  const key = calculator.inputs.find((input) => input.id === inputId)?.key;
  const keep = (condition: Condition | undefined) => (condition?.inputKey === key ? undefined : condition);
  return {
    ...calculator,
    inputs: calculator.inputs
      .filter((input) => input.id !== inputId)
      .map((input) => ({ ...input, visibleWhen: keep(input.visibleWhen) })),
    steps: calculator.steps.map((step) => ({ ...step, enabledWhen: keep(step.enabledWhen) })),
    layout: withoutLayoutItems(calculator, (item) => item.type === 'input' && item.inputId === inputId).map((section) => ({
      ...section,
      visibleWhen: keep(section.visibleWhen),
    })),
  };
}

/** Sets or clears when an input is shown. */
export function setInputCondition(calculator: Calculator, inputId: string, condition: Condition | undefined): Calculator {
  return {
    ...calculator,
    inputs: calculator.inputs.map((input) => (input.id === inputId ? { ...input, visibleWhen: condition } : input)),
  };
}

/** Inputs a condition can test: everything but text notes and, for an input, itself. */
export function conditionInputs(calculator: Calculator, exceptKey?: string): CalculatorInput[] {
  return calculator.inputs.filter((input) => input.value.kind !== 'text' && input.key !== exceptKey);
}

/** A starting condition on an input: on / its first option / its first catalog pick / > 0. */
export function defaultCondition(input: CalculatorInput, firstCatalogItem?: string): Condition {
  switch (input.value.kind) {
    case 'boolean':
      return { inputKey: input.key, op: 'is', value: true };
    case 'choice':
      return { inputKey: input.key, op: 'is', value: input.value.options[0]?.id ?? '' };
    case 'material':
    case 'labor':
      return { inputKey: input.key, op: 'is', value: firstCatalogItem ?? '' };
    default:
      return { inputKey: input.key, op: '>', value: 0 };
  }
}

// ---- Steps ----

export function addStep(calculator: Calculator, step: CalculatorStep): Calculator {
  return { ...calculator, steps: [...calculator.steps, step] };
}

/** Replaces a step; a new key is carried to everything that reads the old one. */
export function updateStep(calculator: Calculator, updated: CalculatorStep): Calculator {
  const previous = calculator.steps.find((step) => step.id === updated.id);
  if (!previous) return calculator;
  const renamed = renameKeyReferences(calculator, previous.key, updated.key);
  return { ...renamed, steps: renamed.steps.map((step) => (step.id === updated.id ? updated : step)) };
}

/** Removes a step, its place in the layout, and its role as a part's cost. */
export function removeStep(calculator: Calculator, stepId: string): Calculator {
  return {
    ...calculator,
    steps: calculator.steps.filter((step) => step.id !== stepId),
    parts: calculator.parts.map((part) => (part.costStepId === stepId ? { ...part, costStepId: undefined } : part)),
    quoteCostStepId: calculator.quoteCostStepId === stepId ? undefined : calculator.quoteCostStepId,
    layout: withoutLayoutItems(calculator, (item) => item.type === 'result' && item.stepId === stepId),
  };
}

/** Moves a step to the end of another part; it stops being the old part's cost. */
export function moveStepToPart(calculator: Calculator, stepId: string, partId: string): Calculator {
  const step = calculator.steps.find((candidate) => candidate.id === stepId);
  if (!step || step.partId === partId) return calculator;
  return {
    ...calculator,
    steps: [...calculator.steps.filter((candidate) => candidate.id !== stepId), { ...step, partId }],
    parts: calculator.parts.map((part) =>
      part.id === step.partId && part.costStepId === stepId ? { ...part, costStepId: undefined } : part
    ),
  };
}

/** Moves a step up or down among its part's steps. */
export function reorderStep(calculator: Calculator, stepId: string, direction: -1 | 1): Calculator {
  const step = calculator.steps.find((candidate) => candidate.id === stepId);
  if (!step) return calculator;
  const siblings = calculator.steps.filter((candidate) => candidate.partId === step.partId);
  const position = siblings.indexOf(step);
  const target = siblings[position + direction];
  if (!target) return calculator;
  const steps = [...calculator.steps];
  const a = steps.indexOf(step);
  const b = steps.indexOf(target);
  [steps[a], steps[b]] = [steps[b], steps[a]];
  return { ...calculator, steps };
}

export function isStepShown(calculator: Calculator, stepId: string): boolean {
  return calculator.layout.some((section) => section.items.some((item) => item.type === 'result' && item.stepId === stepId));
}

/** Shows a step's result to staff (at the end of the results section) or hides it. */
export function setStepShown(calculator: Calculator, stepId: string, shown: boolean, createId: CreateId): Calculator {
  if (shown === isStepShown(calculator, stepId)) return calculator;
  if (!shown) {
    return { ...calculator, layout: withoutLayoutItems(calculator, (item) => item.type === 'result' && item.stepId === stepId) };
  }
  const item: LayoutItem = { type: 'result', stepId, style: 'row' };
  const index = calculator.layout.map(isResultsSection).lastIndexOf(true);
  if (index === -1) {
    return { ...calculator, layout: [...calculator.layout, { id: createId(), title: 'Results', items: [item] }] };
  }
  // Rows go before the section's breakdown/headline, so totals stay last.
  return {
    ...calculator,
    layout: calculator.layout.map((section, i) => {
      if (i !== index) return section;
      const firstTotal = section.items.findIndex(
        (existing) => existing.type === 'breakdown' || (existing.type === 'result' && existing.style === 'headline')
      );
      const items = [...section.items];
      items.splice(firstTotal === -1 ? items.length : firstTotal, 0, item);
      return { ...section, items };
    }),
  };
}

// ---- Parts ----

export function addPart(calculator: Calculator, part: CalculatorPart): Calculator {
  return {
    ...calculator,
    parts: [...calculator.parts, part],
    // New parts join any breakdown that lists all the others.
    layout: calculator.layout.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.type === 'breakdown' && calculator.parts.every((existing) => item.partIds.includes(existing.id))
          ? { ...item, partIds: [...item.partIds, part.id] }
          : item
      ),
    })),
  };
}

export function updatePart(calculator: Calculator, updated: CalculatorPart): Calculator {
  return { ...calculator, parts: calculator.parts.map((part) => (part.id === updated.id ? updated : part)) };
}

/** Removes a part with its steps. */
export function removePart(calculator: Calculator, partId: string): Calculator {
  let next = calculator;
  for (const step of calculator.steps.filter((candidate) => candidate.partId === partId)) {
    next = removeStep(next, step.id);
  }
  return {
    ...next,
    parts: next.parts.filter((part) => part.id !== partId),
    layout: next.layout.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.type === 'breakdown' ? { ...item, partIds: item.partIds.filter((id) => id !== partId) } : item
      ),
    })),
  };
}

export function movePart(calculator: Calculator, partId: string, direction: -1 | 1): Calculator {
  const index = calculator.parts.findIndex((part) => part.id === partId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= calculator.parts.length) return calculator;
  const parts = [...calculator.parts];
  [parts[index], parts[target]] = [parts[target], parts[index]];
  return { ...calculator, parts };
}

/** Makes a step its part's cost (money), or clears the part's cost. */
export function setPartCost(calculator: Calculator, partId: string, stepId: string | undefined): Calculator {
  return {
    ...calculator,
    parts: calculator.parts.map((part) => (part.id === partId ? { ...part, costStepId: stepId } : part)),
    steps: stepId
      ? calculator.steps.map((step) => (step.id === stepId ? { ...step, format: 'money' } : step))
      : calculator.steps,
  };
}

// ---- Copies ----

/** A saved copy of a calculator (e.g. one converted from a module) with fresh ids. */
export function copyCalculator(calculator: Calculator, createId: CreateId, now: string): Calculator {
  const ids = new Map<string, string>();
  const remap = (id: string) => {
    if (!ids.has(id)) ids.set(id, createId());
    return ids.get(id)!;
  };
  // Choice conditions compare option ids, so give every option its new id first.
  for (const input of calculator.inputs) {
    if (input.value.kind === 'choice') input.value.options.forEach((option) => remap(option.id));
  }
  const remapCondition = (condition: Condition | undefined): Condition | undefined =>
    condition && typeof condition.value === 'string' && ids.has(condition.value)
      ? ({ ...condition, value: ids.get(condition.value)! } as Condition)
      : condition;
  return {
    ...calculator,
    id: createId(),
    inputs: calculator.inputs.map((input) => ({
      ...input,
      id: remap(input.id),
      visibleWhen: remapCondition(input.visibleWhen),
      value:
        input.value.kind === 'choice'
          ? {
              ...input.value,
              options: input.value.options.map((option) => ({ ...option, id: remap(option.id) })),
              default: input.value.default ? remap(input.value.default) : undefined,
            }
          : input.value,
    })),
    parts: calculator.parts.map((part) => ({
      ...part,
      id: remap(part.id),
      costStepId: part.costStepId ? remap(part.costStepId) : undefined,
    })),
    steps: calculator.steps.map((step) => ({
      ...step,
      id: remap(step.id),
      partId: remap(step.partId),
      enabledWhen: remapCondition(step.enabledWhen),
    })),
    quoteCostStepId: calculator.quoteCostStepId ? remap(calculator.quoteCostStepId) : undefined,
    layout: calculator.layout.map((section) => ({
      ...section,
      id: remap(section.id),
      visibleWhen: remapCondition(section.visibleWhen),
      items: section.items.map((item) => {
        if (item.type === 'input') return { ...item, inputId: remap(item.inputId) };
        if (item.type === 'result') return { ...item, stepId: remap(item.stepId) };
        if (item.type === 'breakdown') return { ...item, partIds: item.partIds.map(remap) };
        return item;
      }),
    })),
    createdAt: now,
    updatedAt: now,
  };
}

// ---- Layout (the layout view) ----

export interface LayoutPosition {
  sectionId: string;
  index: number;
}

/** A stable key for a layout item while editing: inputs and results by what they show. */
export function layoutItemKey(item: LayoutItem, sectionId: string, index: number): string {
  if (item.type === 'input') return `input:${item.inputId}`;
  if (item.type === 'result') return `result:${item.stepId}`;
  return item.id ? `${item.type}:${item.id}` : `${item.type}:${sectionId}:${index}`;
}

/** Where an item with this key is, or undefined. */
export function findLayoutItem(calculator: Calculator, key: string): LayoutPosition | undefined {
  for (const section of calculator.layout) {
    const index = section.items.findIndex((item, i) => layoutItemKey(item, section.id, i) === key);
    if (index !== -1) return { sectionId: section.id, index };
  }
  return undefined;
}

/** Widgets that can show an input of this kind, first the default. */
export function widgetsFor(kind: InputValueSpec['kind']): InputWidget[] {
  switch (kind) {
    case 'number':
      return ['number', 'stepper', 'slider'];
    case 'boolean':
      return ['toggle', 'checkbox'];
    case 'choice':
      return ['dropdown', 'segmented', 'radio'];
    case 'material':
    case 'labor':
      return ['picker'];
    case 'text':
      return ['text'];
  }
}

/** Inputs that aren't on the page anywhere. */
export function unplacedInputs(calculator: Calculator): CalculatorInput[] {
  const placed = new Set(
    calculator.layout.flatMap((section) => section.items.flatMap((item) => (item.type === 'input' ? [item.inputId] : [])))
  );
  return calculator.inputs.filter((input) => !placed.has(input.id));
}

/** Adds a section after `afterSectionId`, or at the end. */
export function addSection(calculator: Calculator, section: LayoutSection, afterSectionId?: string): Calculator {
  const index = afterSectionId ? calculator.layout.findIndex((existing) => existing.id === afterSectionId) : -1;
  const layout = [...calculator.layout];
  layout.splice(index === -1 ? layout.length : index + 1, 0, section);
  return { ...calculator, layout };
}

export function updateSection(
  calculator: Calculator,
  sectionId: string,
  patch: Partial<Omit<LayoutSection, 'id' | 'items'>>
): Calculator {
  return {
    ...calculator,
    layout: calculator.layout.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)),
  };
}

/** Removes a section; its inputs become unplaced, its other items go with it. */
export function removeSection(calculator: Calculator, sectionId: string): Calculator {
  return { ...calculator, layout: calculator.layout.filter((section) => section.id !== sectionId) };
}

export function moveSection(calculator: Calculator, sectionId: string, direction: -1 | 1): Calculator {
  const index = calculator.layout.findIndex((section) => section.id === sectionId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= calculator.layout.length) return calculator;
  const layout = [...calculator.layout];
  [layout[index], layout[target]] = [layout[target], layout[index]];
  return { ...calculator, layout };
}

/** Inserts an item into a section (at the end by default). An input already placed moves. */
export function insertLayoutItem(calculator: Calculator, sectionId: string, item: LayoutItem, index?: number): Calculator {
  const cleared =
    item.type === 'input'
      ? withoutLayoutItems(calculator, (existing) => existing.type === 'input' && existing.inputId === item.inputId)
      : item.type === 'result'
        ? withoutLayoutItems(calculator, (existing) => existing.type === 'result' && existing.stepId === item.stepId)
        : calculator.layout;
  return {
    ...calculator,
    layout: cleared.map((section) => {
      if (section.id !== sectionId) return section;
      const items = [...section.items];
      items.splice(index === undefined ? items.length : Math.max(0, Math.min(index, items.length)), 0, item);
      return { ...section, items };
    }),
  };
}

/** Moves an item; `to.index` is its position in the target section after the move. */
export function moveLayoutItem(calculator: Calculator, from: LayoutPosition, to: LayoutPosition): Calculator {
  const source = calculator.layout.find((section) => section.id === from.sectionId);
  const item = source?.items[from.index];
  if (!item || !calculator.layout.some((section) => section.id === to.sectionId)) return calculator;
  const removed = calculator.layout.map((section) =>
    section.id === from.sectionId ? { ...section, items: section.items.filter((_, i) => i !== from.index) } : section
  );
  return {
    ...calculator,
    layout: removed.map((section) => {
      if (section.id !== to.sectionId) return section;
      const items = [...section.items];
      items.splice(Math.max(0, Math.min(to.index, items.length)), 0, item);
      return { ...section, items };
    }),
  };
}

/** Removes an item from the page. An input stays in the calculator, unplaced. */
export function removeLayoutItem(calculator: Calculator, position: LayoutPosition): Calculator {
  return {
    ...calculator,
    layout: calculator.layout.map((section) =>
      section.id === position.sectionId ? { ...section, items: section.items.filter((_, i) => i !== position.index) } : section
    ),
  };
}

export function updateLayoutItem(calculator: Calculator, position: LayoutPosition, item: LayoutItem): Calculator {
  return {
    ...calculator,
    layout: calculator.layout.map((section) =>
      section.id === position.sectionId
        ? { ...section, items: section.items.map((existing, i) => (i === position.index ? item : existing)) }
        : section
    ),
  };
}

/** Gives breakdowns, text and dividers without an id one, so they can be told apart while editing. */
export function ensureLayoutIds(calculator: Calculator, createId: CreateId): Calculator {
  const missing = calculator.layout.some((section) =>
    section.items.some((item) => item.type !== 'input' && item.type !== 'result' && !item.id)
  );
  if (!missing) return calculator;
  return {
    ...calculator,
    layout: calculator.layout.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.type !== 'input' && item.type !== 'result' && !item.id ? { ...item, id: createId() } : item
      ),
    })),
  };
}
