import type {
  CalculationModule,
  Field,
  Labor,
  Material,
  QuoteLineItem,
  QuoteModuleInstance,
  SharedFunction,
} from "../types";
import { getInitialFieldValue } from "../field-defaults";
import { generateId } from "../utils";
import { resolveFieldLinks } from "../utils/field-linking";
import { buildQuoteLineItem } from "./line-item-builder";
import { normalizeNickname } from "./nickname";
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

// Restores only the module's current fields (new ones get defaults); links aren't restored because line items hold resolved values.
export function createWorkspaceInstanceFromLineItem(
  lineItem: QuoteLineItem,
  moduleDef: CalculationModule
): QuoteModuleInstance {
  const fieldValues = getDefaultQuoteFieldValues(moduleDef.fields);
  moduleDef.fields.forEach((field) => {
    if (field.variableName && field.variableName in lineItem.fieldValues) {
      fieldValues[field.variableName] = lineItem.fieldValues[field.variableName];
    }
  });

  const nickname = normalizeNickname(lineItem.nickname);
  return {
    id: generateId(),
    moduleId: moduleDef.id,
    fieldValues,
    calculatedCost: 0,
    ...(nickname ? { nickname } : {}),
  };
}

export function reopenQuoteLineItem(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext,
  lineItem: QuoteLineItem
): QuoteModuleInstance[] | null {
  const moduleDef = context.modules.find((module) => module.id === lineItem.moduleId);
  if (!moduleDef) return null;

  const reopened = createWorkspaceInstanceFromLineItem(lineItem, moduleDef);
  return recalculateQuoteWorkspace([...workspaceModules, reopened], context);
}

// Replaces links pointing at `sourceInstanceId` with the values they currently resolve to.
export function freezeLinksToQuoteWorkspaceModule(
  workspaceModules: QuoteModuleInstance[],
  sourceInstanceId: string
): QuoteModuleInstance[] {
  const resolvedValues = resolveFieldLinks(workspaceModules);

  return workspaceModules.map((instance) => {
    if (instance.id === sourceInstanceId || !instance.fieldLinks) return instance;

    const linkedFields = Object.entries(instance.fieldLinks)
      .filter(([, link]) => link.moduleInstanceId === sourceInstanceId)
      .map(([fieldName]) => fieldName);
    if (linkedFields.length === 0) return instance;

    const fieldLinks = { ...instance.fieldLinks };
    const fieldValues = { ...instance.fieldValues };
    linkedFields.forEach((fieldName) => {
      delete fieldLinks[fieldName];
      const resolved = resolvedValues[instance.id]?.[fieldName];
      if (resolved !== undefined) {
        fieldValues[fieldName] = resolved;
      }
    });

    return {
      ...instance,
      fieldValues,
      fieldLinks: Object.keys(fieldLinks).length > 0 ? fieldLinks : undefined,
    };
  });
}

export type CommitQuoteWorkspaceModuleResult =
  | { ok: true; lineItem: QuoteLineItem; workspaceModules: QuoteModuleInstance[] }
  | { ok: false; error?: string };

// Moves a draft out of the workspace into a line item; drafts linked to it keep their current values.
export function commitQuoteWorkspaceModule(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext,
  instanceId: string
): CommitQuoteWorkspaceModuleResult {
  const instance = workspaceModules.find((item) => item.id === instanceId);
  if (!instance) return { ok: false };

  const moduleDef = context.modules.find((module) => module.id === instance.moduleId);
  if (!moduleDef) return { ok: false };

  const resolvedValues = resolveFieldLinks(workspaceModules);
  const result = buildQuoteLineItem({
    instance,
    moduleDef,
    resolvedFieldValues: resolvedValues[instance.id] || instance.fieldValues,
    materials: context.materials,
    labor: context.labor,
    functions: context.functions,
  });
  if (!result.lineItem) {
    return { ok: false, error: result.error || "Calculation failed" };
  }

  return {
    ok: true,
    lineItem: result.lineItem,
    workspaceModules: removeQuoteWorkspaceModule(workspaceModules, context, instanceId),
  };
}

export function duplicateQuoteWorkspaceModule(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext,
  instanceId: string
): QuoteModuleInstance[] {
  const index = workspaceModules.findIndex((item) => item.id === instanceId);
  if (index === -1) return workspaceModules;

  const original = workspaceModules[index];
  const copy: QuoteModuleInstance = {
    ...original,
    id: generateId(),
    fieldValues: { ...original.fieldValues },
    fieldLinks: original.fieldLinks ? { ...original.fieldLinks } : undefined,
  };
  const nickname = normalizeNickname(original.nickname);
  if (nickname) {
    copy.nickname = `${nickname} (copy)`;
  } else {
    delete copy.nickname;
  }

  const next = [...workspaceModules];
  next.splice(index + 1, 0, copy);
  return recalculateQuoteWorkspace(next, context);
}

export function setQuoteWorkspaceModuleNickname(
  workspaceModules: QuoteModuleInstance[],
  instanceId: string,
  nickname: string
): QuoteModuleInstance[] {
  return workspaceModules.map((instance) =>
    instance.id === instanceId
      ? { ...instance, nickname: nickname === "" ? undefined : nickname }
      : instance
  );
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

// Drafts linked to the removed one keep their current values instead of falling back to stale ones.
export function removeQuoteWorkspaceModule(
  workspaceModules: QuoteModuleInstance[],
  context: QuoteWorkspaceContext,
  instanceId: string
): QuoteModuleInstance[] {
  return removeModuleWorkspaceInstance(
    freezeLinksToQuoteWorkspaceModule(workspaceModules, instanceId),
    context,
    instanceId
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
