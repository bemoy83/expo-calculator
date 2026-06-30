import { recalculateWorkspaceModuleInstances } from "../quotes/workspace-recalculation";
import type {
  CalculationModule,
  Labor,
  Material,
  QuoteModuleInstance,
  SharedFunction,
} from "../types";
import { canLinkFields as validateFieldLink } from "../utils/field-linking";

export interface ModuleWorkspaceContext {
  modules: CalculationModule[];
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}

export function recalculateModuleWorkspace(
  workspaceModules: QuoteModuleInstance[],
  context: ModuleWorkspaceContext
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

export function updateModuleWorkspaceFieldValue(
  workspaceModules: QuoteModuleInstance[],
  context: ModuleWorkspaceContext,
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

  return recalculateModuleWorkspace(updated, context);
}

export function removeModuleWorkspaceInstance(
  workspaceModules: QuoteModuleInstance[],
  context: ModuleWorkspaceContext,
  instanceId: string
): QuoteModuleInstance[] {
  return recalculateModuleWorkspace(
    workspaceModules.filter((instance) => instance.id !== instanceId),
    context
  );
}

export function validateModuleWorkspaceFieldLink(
  workspaceModules: QuoteModuleInstance[],
  context: Pick<ModuleWorkspaceContext, "modules">,
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

export function linkModuleWorkspaceField(
  workspaceModules: QuoteModuleInstance[],
  context: ModuleWorkspaceContext,
  instanceId: string,
  fieldName: string,
  targetInstanceId: string,
  targetFieldName: string
): { valid: boolean; error?: string; workspaceModules: QuoteModuleInstance[] } {
  const validation = validateModuleWorkspaceFieldLink(
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
    workspaceModules: recalculateModuleWorkspace(updated, context),
  };
}

export function unlinkModuleWorkspaceField(
  workspaceModules: QuoteModuleInstance[],
  context: ModuleWorkspaceContext,
  instanceId: string,
  fieldName: string
): QuoteModuleInstance[] {
  const updated = workspaceModules.map((instance) =>
    instance.id === instanceId
      ? {
          ...instance,
          fieldLinks: removeModuleWorkspaceFieldLink(instance.fieldLinks, fieldName),
        }
      : instance
  );

  return recalculateModuleWorkspace(updated, context);
}

export function removeModuleWorkspaceFieldLink(
  fieldLinks: QuoteModuleInstance["fieldLinks"],
  fieldName: string
): QuoteModuleInstance["fieldLinks"] {
  const links = { ...(fieldLinks || {}) };
  delete links[fieldName];
  return Object.keys(links).length > 0 ? links : undefined;
}
