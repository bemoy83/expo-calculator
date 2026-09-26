import type { CalculationModule, ModuleTemplate } from '../types';
import { generateId, labelToVariableName } from '../utils';
import { rewriteExpression } from './dependencies';
import { calculatorFromModule } from './from-module';
import type { Calculator, CalculatorInput, CalculatorPart, CalculatorStep, LayoutSection } from './types';

export interface TemplateConversion {
  calculator: Calculator;
  /** Things that didn't carry over exactly, in plain words. */
  warnings: string[];
}

interface Instance {
  id: string;
  module: CalculationModule;
  links: NonNullable<ModuleTemplate['moduleInstances'][number]['fieldLinks']>;
  partName: string;
  slug: string;
  converted: Calculator;
  /** Output variable name → local step key (outputs renamed on clashes with fields). */
  outputKeys: Map<string, string>;
}

// Turns a template into one calculator: a part per module in its chain, holding that
// module's outputs and cost. Every field becomes an input except linked ones, which read the
// input they link to (following chains of links) or, when linked to another module's output,
// that output's step. Names clashing between parts get the part's name in front
// (paint_quantity). Values saved on the template aren't used: templates start from defaults.
export function calculatorFromTemplate(
  template: ModuleTemplate,
  modules: CalculationModule[],
  options: { createId?: () => string; now?: string } = {}
): TemplateConversion {
  const createId = options.createId ?? generateId;
  const now = options.now ?? new Date().toISOString();
  const warnings: string[] = [];

  // ---- Parts, one per module instance ----
  const nameCounts = new Map<string, number>();
  const instances: Instance[] = [];
  template.moduleInstances.forEach((raw, index) => {
    const moduleDef = modules.find((candidate) => candidate.id === raw.moduleId);
    if (!moduleDef) {
      warnings.push(`Module ${index + 1} in the template no longer exists and was left out.`);
      return;
    }
    const count = (nameCounts.get(moduleDef.name) ?? 0) + 1;
    nameCounts.set(moduleDef.name, count);
    const partName = count > 1 ? `${moduleDef.name} ${count}` : moduleDef.name;
    const { calculator: converted, warnings: moduleWarnings } = calculatorFromModule(moduleDef, { createId, now });
    moduleWarnings.forEach((warning) => warnings.push(`${partName}: ${warning}`));
    const outputs = (moduleDef.computedOutputs ?? []).filter((output) => output.variableName);
    instances.push({
      id: raw.id ?? `instance-${index}`,
      module: moduleDef,
      links: raw.fieldLinks ?? {},
      partName,
      slug: labelToVariableName(partName).toLowerCase() || `part_${index + 1}`,
      converted,
      outputKeys: new Map(outputs.map((output, i) => [output.variableName, converted.steps[i].key])),
    });
  });
  const byId = new Map(instances.map((instance) => [instance.id, instance]));

  // ---- Which fields are linked, and to what ----
  type Target = { kind: 'field'; instance: Instance; field: string } | { kind: 'output'; instance: Instance; stepKey: string };
  const linkTarget = (instance: Instance, field: string, seen: Set<string>): Target | undefined => {
    const link = instance.links[field];
    if (!link) return undefined;
    const target = byId.get(link.moduleInstanceId);
    const visit = `${instance.id}.${field}`;
    if (!target || seen.has(visit)) return undefined;
    seen.add(visit);
    if (link.fieldVariableName.startsWith('out.')) {
      const stepKey = target.outputKeys.get(link.fieldVariableName.slice(4));
      return stepKey ? { kind: 'output', instance: target, stepKey } : undefined;
    }
    if (!target.converted.inputs.some((input) => input.key === link.fieldVariableName)) return undefined;
    return linkTarget(target, link.fieldVariableName, seen) ?? { kind: 'field', instance: target, field: link.fieldVariableName };
  };
  const targets = new Map<string, Target>();
  for (const instance of instances) {
    for (const field of Object.keys(instance.links)) {
      const target = linkTarget(instance, field, new Set());
      if (target) targets.set(`${instance.id}.${field}`, target);
      else warnings.push(`${instance.partName}: the link on "${field}" pointed at something that no longer exists; it's an input of its own.`);
    }
  }

  // ---- Global names: inputs first, then steps ----
  const taken = new Set<string>();
  const globalKey = new Map<string, string>(); // `${instance}.${localKey}` → key
  const claim = (wanted: string, slug: string) => {
    let key = taken.has(wanted) ? `${slug}_${wanted}` : wanted;
    for (let n = 2; taken.has(key); n += 1) key = `${slug}_${wanted}_${n}`;
    taken.add(key);
    return key;
  };

  const inputs: CalculatorInput[] = [];
  const ownInputs = new Map<string, CalculatorInput[]>();
  for (const instance of instances) {
    const own: CalculatorInput[] = [];
    for (const input of instance.converted.inputs) {
      if (targets.has(`${instance.id}.${input.key}`)) continue;
      const key = claim(input.key, instance.slug);
      globalKey.set(`${instance.id}.${input.key}`, key);
      const renamed = { ...input, key, label: key === input.key ? input.label : `${input.label} (${instance.partName})` };
      own.push(renamed);
      inputs.push(renamed);
    }
    ownInputs.set(instance.id, own);
  }
  const costStepIds = new Set(instances.map((instance) => instance.converted.parts[0].costStepId));
  for (const instance of instances) {
    for (const step of instance.converted.steps) {
      const key = costStepIds.has(step.id) ? claim(`${instance.slug}_cost`, instance.slug) : claim(step.key, instance.slug);
      globalKey.set(`${instance.id}.${step.key}`, key);
    }
  }
  for (const [local, target] of targets) {
    globalKey.set(
      local,
      target.kind === 'output'
        ? globalKey.get(`${target.instance.id}.${target.stepKey}`)!
        : globalKey.get(`${target.instance.id}.${target.field}`)!
    );
  }

  // ---- Parts and steps, formulas rewritten to the global names ----
  const parts: CalculatorPart[] = [];
  const steps: CalculatorStep[] = [];
  for (const instance of instances) {
    const part = { ...instance.converted.parts[0], name: instance.partName };
    parts.push(part);
    const rename = (base: string) => globalKey.get(`${instance.id}.${base}`);
    for (const step of instance.converted.steps) {
      steps.push({
        ...step,
        key: rename(step.key)!,
        label: costStepIds.has(step.id) ? `${instance.partName} cost` : step.label,
        source:
          step.source.type === 'expression'
            ? {
                type: 'expression',
                expression: rewriteExpression(step.source.expression, (token) => {
                  if (token.isCall) return null;
                  const key = rename(token.base);
                  if (!key) return null;
                  return token.property !== undefined ? `${key}.${token.property}` : key;
                }),
              }
            : step.source,
      });
    }
  }

  // ---- Layout: a section per part, then the breakdown ----
  const layout: LayoutSection[] = instances.map((instance) => ({
    id: createId(),
    title: instance.partName,
    items: [
      ...(ownInputs.get(instance.id) ?? []).map((input) => ({ type: 'input' as const, inputId: input.id })),
      ...instance.converted.steps
        .filter((step) => !costStepIds.has(step.id))
        .map((step) => ({ type: 'result' as const, stepId: step.id, style: 'row' as const })),
    ],
  }));
  layout.push({
    id: createId(),
    title: 'Total',
    items: [{ type: 'breakdown', id: createId(), partIds: parts.map((part) => part.id) }],
  });

  return {
    calculator: {
      id: createId(),
      name: template.name,
      description: template.description,
      category: template.categories?.[0],
      inputs,
      parts,
      steps,
      layout,
      sourceTemplateId: template.id,
      createdAt: now,
      updatedAt: now,
    },
    warnings,
  };
}

// Every template as a calculator, converted on the fly so it follows template and module
// edits. Ids are derived from the template's, so they stay the same from one conversion to the next.
export function calculatorsFromTemplates(templates: ModuleTemplate[], modules: CalculationModule[]): Calculator[] {
  return templates.map((template) => {
    let n = 0;
    const { calculator } = calculatorFromTemplate(template, modules, {
      createId: () => `${template.id}:${++n}`,
      now: template.updatedAt,
    });
    return { ...calculator, id: `template-${template.id}`, createdAt: template.createdAt };
  });
}
