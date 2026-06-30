import type {
  CalculationModule,
  Labor,
  Material,
  QuoteModuleInstance,
  SharedFunction,
} from "../types";
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
import { createTemplateModuleInstance } from "./template-instance-helpers";

export type TemplateWorkspaceContext = ModuleWorkspaceContext;

export function recalculateTemplateWorkspace(
  workspaceModules: QuoteModuleInstance[],
  context: TemplateWorkspaceContext
): QuoteModuleInstance[] {
  return recalculateModuleWorkspace(workspaceModules, context);
}

export function updateTemplateWorkspaceFieldValue(
  workspaceModules: QuoteModuleInstance[],
  context: TemplateWorkspaceContext,
  instanceId: string,
  fieldName: string,
  value: string | number | boolean
): QuoteModuleInstance[] {
  return updateModuleWorkspaceFieldValue(workspaceModules, context, instanceId, fieldName, value);
}

export function addTemplateWorkspaceModule(
  workspaceModules: QuoteModuleInstance[],
  context: TemplateWorkspaceContext,
  moduleId: string
): QuoteModuleInstance[] {
  const moduleDef = context.modules.find((module) => module.id === moduleId);
  if (!moduleDef) return workspaceModules;

  const newInstance = createTemplateModuleInstance({
    moduleDef,
    moduleId,
    materials: context.materials,
    labor: context.labor,
  });

  return recalculateTemplateWorkspace([...workspaceModules, newInstance], context);
}

export function removeTemplateWorkspaceModule(
  workspaceModules: QuoteModuleInstance[],
  context: TemplateWorkspaceContext,
  instanceId: string
): QuoteModuleInstance[] {
  return removeModuleWorkspaceInstance(workspaceModules, context, instanceId);
}

export function reorderTemplateWorkspaceModules(
  workspaceModules: QuoteModuleInstance[],
  oldIndex: number,
  newIndex: number
): QuoteModuleInstance[] {
  if (oldIndex === newIndex) return workspaceModules;
  if (oldIndex < 0 || newIndex < 0) return workspaceModules;
  if (oldIndex >= workspaceModules.length || newIndex >= workspaceModules.length) {
    return workspaceModules;
  }

  const updated = [...workspaceModules];
  const [moved] = updated.splice(oldIndex, 1);
  updated.splice(newIndex, 0, moved);
  return updated;
}

export function validateTemplateWorkspaceFieldLink(
  workspaceModules: QuoteModuleInstance[],
  context: Pick<TemplateWorkspaceContext, "modules">,
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

export function linkTemplateWorkspaceField(
  workspaceModules: QuoteModuleInstance[],
  context: TemplateWorkspaceContext,
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

export function unlinkTemplateWorkspaceField(
  workspaceModules: QuoteModuleInstance[],
  context: TemplateWorkspaceContext,
  instanceId: string,
  fieldName: string
): QuoteModuleInstance[] {
  return unlinkModuleWorkspaceField(workspaceModules, context, instanceId, fieldName);
}

export function removeTemplateFieldLink(
  fieldLinks: QuoteModuleInstance["fieldLinks"],
  fieldName: string
): QuoteModuleInstance["fieldLinks"] {
  return removeModuleWorkspaceFieldLink(fieldLinks, fieldName);
}
