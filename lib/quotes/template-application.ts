import type {
  CalculationModule,
  Labor,
  Material,
  ModuleTemplate,
  QuoteModuleInstance,
  SharedFunction,
} from "../types";
import {
  addQuoteWorkspaceModule,
  linkQuoteWorkspaceField,
  QuoteWorkspaceContext,
  recalculateQuoteWorkspace,
} from "./workspace-actions";
import { getRestorableTemplateLinks } from "./template-helpers";

export function applyTemplateToQuoteWorkspace(input: {
  template: ModuleTemplate;
  workspaceModules: QuoteModuleInstance[];
  modules: CalculationModule[];
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
  getModule: (id: string) => CalculationModule | undefined;
}): {
  workspaceModules: QuoteModuleInstance[];
  warnings: string[];
  appliedModules: number;
} {
  const warnings: string[] = [];
  let appliedModules = 0;
  let workspaceModules = input.workspaceModules;
  const instanceMap = new Map<number, string>();
  const context: QuoteWorkspaceContext = {
    modules: input.modules,
    materials: input.materials,
    labor: input.labor,
    functions: input.functions,
  };

  input.template.moduleInstances.forEach((templateInstance, index) => {
    const moduleDef = input.getModule(templateInstance.moduleId);
    if (!moduleDef) {
      warnings.push(`Module "${templateInstance.moduleId}" no longer exists`);
      return;
    }

    const beforeCount = workspaceModules.length;
    // Applying quote templates intentionally creates fresh quote workspace defaults.
    // Saved template field values are preserved for template editing, not restored into quotes.
    workspaceModules = addQuoteWorkspaceModule(workspaceModules, context, templateInstance.moduleId);

    if (workspaceModules.length > beforeCount) {
      const newInstance = workspaceModules[workspaceModules.length - 1];
      instanceMap.set(index, newInstance.id);
      appliedModules++;
    }
  });

  const restorable = getRestorableTemplateLinks({
    template: input.template,
    workspaceModules,
    instanceMap,
    getModule: input.getModule,
    canLink: (sourceInstanceId, fieldName, targetInstanceId, targetFieldName) =>
      linkQuoteWorkspaceField(
        workspaceModules,
        context,
        sourceInstanceId,
        fieldName,
        targetInstanceId,
        targetFieldName
      ),
  });
  warnings.push(...restorable.warnings);

  restorable.links.forEach((link) => {
    const linkResult = linkQuoteWorkspaceField(
      workspaceModules,
      context,
      link.sourceInstanceId,
      link.fieldName,
      link.targetInstanceId,
      link.targetFieldName
    );

    if (!linkResult.valid) {
      warnings.push(`Link from "${link.fieldName}" could not be restored: ${linkResult.error || "unknown error"}`);
      return;
    }

    workspaceModules = linkResult.workspaceModules;
  });

  return {
    workspaceModules: recalculateQuoteWorkspace(workspaceModules, context),
    warnings,
    appliedModules,
  };
}
