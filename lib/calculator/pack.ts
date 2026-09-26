import type { Labor, Material, SharedFunction } from '../types';
import type { ExportedData } from '../utils/data-export';
import { scanExpression } from './dependencies';
import type { Calculator } from './types';

// A calculator pack: the calculators the owner picked for staff devices, plus what they need
// to calculate (the functions they call, directly or through other functions, and the whole
// materials and labor catalogs, which pickers list). Loading one replaces all of that on the
// device; quotes are never part of it.

export interface PackContents {
  calculators: Calculator[];
  functions: SharedFunction[];
  materials: Material[];
  labor: Labor[];
  customCategories: string[];
}

/** What a device remembers about the pack it loaded. */
export interface LoadedPack {
  exportedAt: string;
  loadedAt: string;
  calculatorCount: number;
}

/** What the owner's device remembers about the last pack it exported. */
export interface ExportedPack {
  exportedAt: string;
  calculatorIds: string[];
}

function calledNames(expression: string): string[] {
  return scanExpression(expression)
    .filter((token) => token.isCall)
    .map((token) => token.base);
}

/**
 * The functions these calculators call, by function-call step or in a formula, and the
 * functions those call in turn. Listed in library order; names with no function are ignored.
 */
export function functionsUsedBy(calculators: Calculator[], functions: SharedFunction[]): SharedFunction[] {
  const byName = new Map(functions.map((func) => [func.name, func]));
  const used = new Set<string>();
  const queue: string[] = [];
  const visit = (name: string) => {
    if (used.has(name) || !byName.has(name)) return;
    used.add(name);
    queue.push(name);
  };

  for (const calculator of calculators) {
    for (const step of calculator.steps) {
      if (step.source.type === 'call') visit(step.source.functionName);
      else calledNames(step.source.expression).forEach(visit);
    }
  }
  while (queue.length > 0) {
    calledNames(byName.get(queue.shift()!)!.formula).forEach(visit);
  }

  return functions.filter((func) => used.has(func.name));
}

/** The pack file for the chosen calculators (in the order they're listed in `contents`). */
export function buildCalculatorPack(
  contents: PackContents,
  calculatorIds: string[],
  version: string,
  exportedAt: string
): ExportedData {
  const chosen = new Set(calculatorIds);
  const calculators = contents.calculators.filter((calculator) => chosen.has(calculator.id));
  return {
    version,
    kind: 'pack',
    exportedAt,
    calculators,
    functions: functionsUsedBy(calculators, contents.functions),
    materials: contents.materials,
    labor: contents.labor,
    customCategories: contents.customCategories,
  };
}

export function isCalculatorPack(data: ExportedData): boolean {
  return data.kind === 'pack';
}

/**
 * Which calculators start ticked when exporting a pack: all of them the first time; after
 * that, the ones in the last pack, so a calculator made since (a test, a draft) stays out
 * until it's ticked.
 */
export function defaultPackSelection(calculators: Calculator[], lastExport: ExportedPack | undefined): string[] {
  if (!lastExport) return calculators.map((calculator) => calculator.id);
  const inLast = new Set(lastExport.calculatorIds);
  return calculators.filter((calculator) => inLast.has(calculator.id)).map((calculator) => calculator.id);
}

/** How a calculator stands against the last pack exported, for the export list. */
export function packStatus(
  calculator: Calculator,
  lastExport: ExportedPack | undefined
): 'new' | 'changed' | 'same' | undefined {
  if (!lastExport) return undefined;
  if (!lastExport.calculatorIds.includes(calculator.id)) return 'new';
  return calculator.updatedAt > lastExport.exportedAt ? 'changed' : 'same';
}

/** An incoming pack against the one already loaded: newer, the same export, or older. */
export function comparePackDates(incoming: string, loaded: LoadedPack | undefined): 'newer' | 'same' | 'older' {
  if (!loaded) return 'newer';
  const a = Date.parse(incoming);
  const b = Date.parse(loaded.exportedAt);
  if (a === b) return 'same';
  return a > b ? 'newer' : 'older';
}

/** Calculators on the device that loading the pack would remove. */
export function calculatorsNotInPack(current: Calculator[], pack: ExportedData): Calculator[] {
  const incoming = new Set((pack.calculators ?? []).map((calculator) => calculator.id));
  return current.filter((calculator) => !incoming.has(calculator.id));
}
