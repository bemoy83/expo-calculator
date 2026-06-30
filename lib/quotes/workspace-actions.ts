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
import {
  linkModuleWorkspaceField,
  ModuleWorkspaceContext,
  recalculateModuleWorkspace,
  removeModuleWorkspaceFieldLink,
  removeModuleWorkspaceInstance,
  unlinkModuleWorkspaceField,
  updateModuleWorkspaceFieldValue,
  validateModuleWorkspaceFieldLink,
} from "../workspace/workspace-actions";

export type QuoteWorkspaceContext = ModuleWorkspaceContext;

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
  return recalculateModuleWorkspace(workspaceModules, context);
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
  return removeModuleWorkspaceInstance(workspaceModules, context, instanceId);
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
  return updateModuleWorkspaceFieldValue(workspaceModules, context, instanceId, fieldName, value);
}

export function validateQuoteWorkspaceFieldLink(
  workspaceModules: QuoteModuleInstance[],
  context: Pick<QuoteWorkspaceContext, "modules">,
  instanceId: string,
  fieldName: string,
  targetInstanceId: string,
  targetFieldName: string
): { valid: boolean; error?: string } {
  return validateModuleWorkspaceFieldLink(
    workspaceModules,
    context,
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
  return linkModuleWorkspaceField(
    workspaceModules,
    context,
    instanceId,
    fieldName,
    targetInstanceId,
    targetFieldName
  );
}

export function unlinkQuoteWorkspaceField(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext,
  instanceId: string,
  fieldName: string
): QuoteModuleInstance[] {
  return unlinkModuleWorkspaceField(workspaceModules, context, instanceId, fieldName);
}

export function removeQuoteFieldLink(
  fieldLinks: QuoteModuleInstance["fieldLinks"],
  fieldName: string
): QuoteModuleInstance["fieldLinks"] {
  return removeModuleWorkspaceFieldLink(fieldLinks, fieldName);
}
