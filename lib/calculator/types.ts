import type { Labor, Material, SharedFunction } from '../types';
import type { UnitCategory } from '../units';

// A calculator declares each input once, groups its math into parts, and lays out what
// staff see. See CALCULATOR_DESIGN.md. Every stored number (input values, defaults, choice
// option values, constants, numeric conditions) is in base units, as module fields are.

export interface Calculator {
  id: string;
  name: string;
  description?: string;
  category?: string;
  inputs: CalculatorInput[];
  parts: CalculatorPart[];
  steps: CalculatorStep[];
  layout: LayoutSection[];
  /** Step whose value goes to a quote; the calculator total when unset. */
  quoteCostStepId?: string;
  /** The module this calculator was converted from, if any. */
  sourceModuleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalculatorPart {
  id: string;
  name: string;
  description?: string;
  /** The step whose value is this part's cost. */
  costStepId?: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  value: number;
}

export type InputValueSpec =
  | {
      kind: 'number';
      unitCategory?: UnitCategory;
      unitSymbol?: string;
      default?: number;
      min?: number;
      max?: number;
      step?: number;
    }
  | { kind: 'boolean'; default?: boolean }
  | {
      kind: 'choice';
      options: ChoiceOption[];
      unitCategory?: UnitCategory;
      unitSymbol?: string;
      /** Option id. */
      default?: string;
    }
  | { kind: 'material'; category?: string; /** Material variable name. */ default?: string }
  | { kind: 'labor'; category?: string; /** Labor variable name. */ default?: string }
  /** Notes only; never reaches the math. */
  | { kind: 'text'; default?: string };

export type InputKind = InputValueSpec['kind'];

export type InputWidget =
  | 'number'
  | 'stepper'
  | 'slider'
  | 'toggle'
  | 'checkbox'
  | 'dropdown'
  | 'segmented'
  | 'radio'
  | 'picker'
  | 'text';

export interface CalculatorInput {
  id: string;
  /** Variable name used by steps, e.g. wall_width. */
  key: string;
  label: string;
  help?: string;
  value: InputValueSpec;
  widget: InputWidget;
  visibleWhen?: Condition;
}

export type Binding =
  | { type: 'input'; key: string }
  | { type: 'step'; key: string }
  | { type: 'constant'; value: number; unitSymbol?: string }
  /** A property (or price property) of the material/labor picked in an input. */
  | { type: 'property'; inputKey: string; property: string };

export type StepSource =
  | { type: 'call'; functionName: string; args: Record<string, Binding> }
  | { type: 'expression'; expression: string };

export type StepFormat = 'number' | 'count' | 'money' | 'percent';

export interface CalculatorStep {
  id: string;
  partId: string;
  /** Variable name later steps and the layout refer to, e.g. stud_count. */
  key: string;
  label: string;
  source: StepSource;
  unitCategory?: UnitCategory;
  unitSymbol?: string;
  /**
   * Show the unit as a label, without converting from base units. Modules showed their
   * outputs this way, so converted modules keep it where the unit isn't a base unit.
   */
  unitIsLabel?: boolean;
  format?: StepFormat;
  decimals?: number;
  /** When false the step is 0 (e.g. "Include insulation" off). */
  enabledWhen?: Condition;
}

export interface LayoutSection {
  id: string;
  title?: string;
  description?: string;
  visibleWhen?: Condition;
  items: LayoutItem[];
}

export type LayoutItem =
  | { type: 'input'; inputId: string; width?: 'full' | 'half' | 'third' }
  | { type: 'result'; stepId: string; style: 'headline' | 'card' | 'row' }
  /** Each listed part's cost, then the total. */
  | { type: 'breakdown'; title?: string; partIds: string[] }
  | { type: 'text'; text: string }
  | { type: 'divider' };

export type Condition =
  /** Toggle (boolean), choice (option id), or material/labor pick (variable name). */
  | { inputKey: string; op: 'is' | 'isNot'; value: boolean | string }
  /** Number or choice value, in base units. */
  | { inputKey: string; op: '>' | '<' | '>=' | '<='; value: number };

/** What staff typed or picked, by input key. Numbers in base units; choices by option id. */
export type CalculatorValue = number | boolean | string;
export type CalculatorValues = Record<string, CalculatorValue | undefined>;

export interface CalculatorLibrary {
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}

// ---- Evaluation results ----

/**
 * ok: calculated. disabled: its condition is off, so it counts as 0.
 * missing: an input it reads has no value. blocked: a step it reads isn't available.
 * error: it can't calculate (bad formula, unknown name, circular reference, ...).
 */
export type StepStatus = 'ok' | 'disabled' | 'missing' | 'blocked' | 'error';

export interface StepResult {
  stepId: string;
  key: string;
  status: StepStatus;
  /** Base units; set when ok or disabled. */
  value?: number;
  /** Value in the step's unit, for display. */
  displayValue?: number;
  message?: string;
  /** Input keys without a value that this step needs, directly or through the steps it reads. */
  missingInputs?: string[];
  /** Step keys this one waits on (blocked). */
  blockedBy?: string[];
}

export type PartStatus = 'ok' | 'missing' | 'blocked' | 'error' | 'empty';

export interface PartResult {
  partId: string;
  status: PartStatus;
  /** Inputs this part's steps read, in calculator order. */
  inputKeys: string[];
  /** Steps from other parts this part reads. */
  externalStepKeys: string[];
  /** Inputs without a value that this part needs. */
  missingInputs: string[];
  cost?: number;
}

export interface CalculatorResult {
  steps: Record<string, StepResult>;
  parts: Record<string, PartResult>;
  /** Sum of part costs; undefined unless every part with a cost step has one. */
  total?: number;
  /** Quote cost step's value, or the total. */
  quoteCost?: number;
  /** Input values the math used (defaults applied, choices as numbers), by key. */
  resolvedValues: Record<string, number | boolean | string>;
  missingInputs: string[];
}
