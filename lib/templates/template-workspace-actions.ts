import { recalculateWorkspaceModuleInstances } from "../quotes/workspace-recalculation";
import type {
  CalculationModule,
  Labor,
  Material,
  QuoteModuleInstance,
  SharedFunction,
} from "../types";
import { canLinkFields as validateFieldLink } from "../utils/field-linking";
import { createTemplateModuleInstance } from "./template-instance-helpers";

export interface TemplateWorkspaceContext {
  modules: CalculationModule[];
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}

export function recalculateTemplateWorkspace(
  workspaceModules: QuoteModuleInstance[],
  context: TemplateWorkspaceContext
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

export function updateTemplateWorkspaceFieldValue(
  workspaceModules: QuoteModuleInstance[],
  context: TemplateWorkspaceContext,
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

  return recalculateTemplateWorkspace(updated, context);
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
  return recalculateTemplateWorkspace(
    workspaceModules.filter((instance) => instance.id !== instanceId),
    context
  );
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
  return validateFieldLink(
    workspaceModules,
    context.modules,
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
  const validation = validateTemplateWorkspaceFieldLink(
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
    workspaceModules: recalculateTemplateWorkspace(updated, context),
  };
}

export function unlinkTemplateWorkspaceField(
  workspaceModules: QuoteModuleInstance[],
  context: TemplateWorkspaceContext,
  instanceId: string,
  fieldName: string
): QuoteModuleInstance[] {
  const updated = workspaceModules.map((instance) =>
    instance.id === instanceId
      ? {
          ...instance,
          fieldLinks: removeTemplateFieldLink(instance.fieldLinks, fieldName),
        }
      : instance
  );

  return recalculateTemplateWorkspace(updated, context);
}

export function removeTemplateFieldLink(
  fieldLinks: QuoteModuleInstance["fieldLinks"],
  fieldName: string
): QuoteModuleInstance["fieldLinks"] {
  const links = { ...(fieldLinks || {}) };
  delete links[fieldName];
  return Object.keys(links).length > 0 ? links : undefined;
}
