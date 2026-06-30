import { recalculateWorkspaceModuleInstances } from "./workspace-recalculation";
import type {
  CalculationModule,
  Field,
  Labor,
  Material,
  QuoteModuleInstance,
  SharedFunction,
} from "../types";
import { getInitialFieldValue } from "../field-defaults";
import { generateId } from "../utils";
import { canLinkFields as validateFieldLink } from "../utils/field-linking";

export interface QuoteWorkspaceContext {
  modules: CalculationModule[];
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}

export function getDefaultQuoteFieldValues(
  fields: Field[]
): Record<string, string | number | boolean> {
  const defaults: Record<string, string | number | boolean> = {};

  fields.forEach((field) => {
    if (!field.variableName) return;
    defaults[field.variableName] = getInitialFieldValue(field);
  });

  return defaults;
}

export function createQuoteWorkspaceModuleInstance(
  moduleDef: CalculationModule
): QuoteModuleInstance {
  return {
    id: generateId(),
    moduleId: moduleDef.id,
    fieldValues: getDefaultQuoteFieldValues(moduleDef.fields),
    calculatedCost: 0,
  };
}

export function recalculateQuoteWorkspace(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext
): QuoteModuleInstance[] {
  if (workspaceModules.length === 0) return workspaceModules;

  return recalculateWorkspaceModuleInstances({
    workspaceModules,
    modules: context.modules,
    materials: context.materials,
    labor: context.labor,
    functions: context.functions,
  }).workspaceModules;
}

export function addQuoteWorkspaceModule(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext,
  moduleId: string
): QuoteModuleInstance[] {
  const moduleDef = context.modules.find((module) => module.id === moduleId);
  if (!moduleDef) return workspaceModules;

  const newInstance = createQuoteWorkspaceModuleInstance(moduleDef);
  return recalculateQuoteWorkspace([...workspaceModules, newInstance], context);
}

export function removeQuoteWorkspaceModule(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext,
  instanceId: string
): QuoteModuleInstance[] {
  return recalculateQuoteWorkspace(
    workspaceModules.filter((instance) => instance.id !== instanceId),
    context
  );
}

export function reorderQuoteWorkspaceModules(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext
): QuoteModuleInstance[] {
  return recalculateQuoteWorkspace(workspaceModules, context);
}

export function updateQuoteWorkspaceFieldValue(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext,
  instanceId: string,
  fieldName: string,
  value: string | number | boolean
): QuoteModuleInstance[] {
  const updated = workspaceModules.map((instance) =>
    instance.id === instanceId
      ? {
          ...instance,
          fieldValues: {
            ...instance.fieldValues,
            [fieldName]: value,
          },
        }
      : instance
  );

  return recalculateQuoteWorkspace(updated, context);
}

export function validateQuoteWorkspaceFieldLink(
  workspaceModules: QuoteModuleInstance[],
  context: Pick<QuoteWorkspaceContext, "modules">,
  instanceId: string,
  fieldName: string,
  targetInstanceId: string,
  targetFieldName: string
): { valid: boolean; error?: string } {
  return validateFieldLink(
    workspaceModules,
    context.modules,
    instanceId,
    fieldName,
    targetInstanceId,
    targetFieldName
  );
}

export function linkQuoteWorkspaceField(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext,
  instanceId: string,
  fieldName: string,
  targetInstanceId: string,
  targetFieldName: string
): { valid: boolean; error?: string; workspaceModules: QuoteModuleInstance[] } {
  const validation = validateQuoteWorkspaceFieldLink(
    workspaceModules,
    context,
    instanceId,
    fieldName,
    targetInstanceId,
    targetFieldName
  );

  if (!validation.valid) {
    return {
      ...validation,
      workspaceModules,
    };
  }

  const updated = workspaceModules.map((instance) =>
    instance.id === instanceId
      ? {
          ...instance,
          fieldLinks: {
            ...(instance.fieldLinks || {}),
            [fieldName]: {
              moduleInstanceId: targetInstanceId,
              fieldVariableName: targetFieldName,
            },
          },
        }
      : instance
  );

  return {
    valid: true,
    workspaceModules: recalculateQuoteWorkspace(updated, context),
  };
}

export function unlinkQuoteWorkspaceField(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext,
  instanceId: string,
  fieldName: string
): QuoteModuleInstance[] {
  const updated = workspaceModules.map((instance) =>
    instance.id === instanceId
      ? {
          ...instance,
          fieldLinks: removeQuoteFieldLink(instance.fieldLinks, fieldName),
        }
      : instance
  );

  return recalculateQuoteWorkspace(updated, context);
}

export function removeQuoteFieldLink(
  fieldLinks: QuoteModuleInstance["fieldLinks"],
  fieldName: string
): QuoteModuleInstance["fieldLinks"] {
  const links = { ...(fieldLinks || {}) };
  delete links[fieldName];
  return Object.keys(links).length > 0 ? links : undefined;
}
