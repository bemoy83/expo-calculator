import { recalculateWorkspaceModuleInstances } from "../quotes/workspace-recalculation";
import type {
  CalculationModule,
  Field,
  FieldLink,
  Labor,
  Material,
  ModuleTemplate,
  QuoteModuleInstance,
  SharedFunction,
} from "../types";
import { getInitialFieldValue } from "../field-defaults";
import { generateId } from "../utils";

export function getDefaultTemplateFieldValues(
  fields: Field[],
  materials: Material[],
  labor: Labor[] = []
): Record<string, string | number | boolean> {
  const defaults: Record<string, string | number | boolean> = {};

  fields.forEach((field) => {
    if (!field.variableName) return;

    if (field.type === "material") {
      defaults[field.variableName] = getFirstMaterialVariableName(field, materials);
      return;
    }

    if (field.type === "labor") {
      defaults[field.variableName] = getFirstLaborVariableName(field, labor);
      return;
    }

    defaults[field.variableName] = getInitialFieldValue(field);
  });

  return defaults;
}

export function createTemplateModuleInstance(input: {
  moduleDef: CalculationModule;
  materials: Material[];
  labor: Labor[];
  moduleId?: string;
}): QuoteModuleInstance {
  return {
    id: generateId(),
    moduleId: input.moduleId ?? input.moduleDef.id,
    fieldValues: getDefaultTemplateFieldValues(input.moduleDef.fields, input.materials, input.labor),
    fieldLinks: {},
    calculatedCost: 0,
  };
}

export function initializeTemplateWorkspaceModules(input: {
  template: ModuleTemplate;
  modules: CalculationModule[];
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}): QuoteModuleInstance[] {
  const initialModules: QuoteModuleInstance[] = [];
  const instanceIdMap = new Map<string | number, string>();

  input.template.moduleInstances.forEach((instance, index) => {
    const moduleDef = input.modules.find((module) => module.id === instance.moduleId);
    if (!moduleDef) return;

    const instanceId = instance.id || generateId();
    instanceIdMap.set(index, instanceId);
    if (instance.id) {
      instanceIdMap.set(instance.id, instanceId);
    }

    const defaultValues = getDefaultTemplateFieldValues(
      moduleDef.fields,
      input.materials,
      input.labor
    );

    initialModules.push({
      id: instanceId,
      moduleId: instance.moduleId,
      fieldValues: instance.fieldValues
        ? { ...defaultValues, ...instance.fieldValues }
        : defaultValues,
      fieldLinks: migrateTemplateFieldLinks(instance.fieldLinks),
      calculatedCost: 0,
    });
  });

  const migratedModules = resolveMigratedTemplateLinks(initialModules, instanceIdMap);

  return recalculateWorkspaceModuleInstances({
    workspaceModules: migratedModules,
    modules: input.modules,
    materials: input.materials,
    labor: input.labor,
    functions: input.functions,
  }).workspaceModules;
}

export function serializeTemplateWorkspace(input: {
  workspaceModules: QuoteModuleInstance[];
  modules: CalculationModule[];
  name: string;
  description: string;
}): {
  name: string;
  description?: string;
  moduleInstances: Array<{
    id: string;
    moduleId: string;
    fieldValues: Record<string, string | number | boolean>;
    fieldLinks?: Record<string, FieldLink>;
  }>;
  categories: string[];
} {
  const moduleInstances = input.workspaceModules.map((instance) => ({
    id: instance.id,
    moduleId: instance.moduleId,
    fieldValues: instance.fieldValues,
    fieldLinks:
      instance.fieldLinks && Object.keys(instance.fieldLinks).length > 0
        ? instance.fieldLinks
        : undefined,
  }));

  const categories = Array.from(
    new Set(
      input.workspaceModules
        .map((instance) => {
          const moduleDef = input.modules.find((module) => module.id === instance.moduleId);
          return moduleDef?.category;
        })
        .filter(Boolean) as string[]
    )
  );

  return {
    name: input.name.trim(),
    description: input.description.trim() || undefined,
    moduleInstances,
    categories,
  };
}

function getFirstMaterialVariableName(field: Field, materials: Material[]): string {
  let candidateMaterials = materials;
  if (field.materialCategory && field.materialCategory.trim()) {
    candidateMaterials = materials.filter((material) => material.category === field.materialCategory);
  }
  return candidateMaterials[0]?.variableName ?? "";
}

function getFirstLaborVariableName(field: Field, labor: Labor[]): string {
  let candidateLabor = labor;
  if (field.laborCategory && field.laborCategory.trim()) {
    candidateLabor = labor.filter((item) => item.category === field.laborCategory);
  }
  return candidateLabor[0]?.variableName ?? "";
}

function migrateTemplateFieldLinks(
  fieldLinks?: Record<string, FieldLink>
): Record<string, FieldLink> | undefined {
  if (!fieldLinks || Object.keys(fieldLinks).length === 0) return undefined;

  const migratedLinks: Record<string, FieldLink> = {};

  Object.entries(fieldLinks).forEach(([fieldName, link]) => {
    if (link.moduleInstanceId.startsWith("__index_")) {
      const targetIndex = Number(link.moduleInstanceId.replace("__index_", "").replace("__", ""));
      migratedLinks[fieldName] = {
        moduleInstanceId: `__MIGRATE_INDEX_${targetIndex}__`,
        fieldVariableName: link.fieldVariableName,
      };
      return;
    }

    migratedLinks[fieldName] = link;
  });

  return migratedLinks;
}

function resolveMigratedTemplateLinks(
  initialModules: QuoteModuleInstance[],
  instanceIdMap: Map<string | number, string>
): QuoteModuleInstance[] {
  return initialModules.map((instance) => {
    if (!instance.fieldLinks) return instance;

    const resolvedLinks: Record<string, FieldLink> = {};
    let needsResolution = false;

    Object.entries(instance.fieldLinks).forEach(([fieldName, link]) => {
      if (link.moduleInstanceId.startsWith("__MIGRATE_INDEX_")) {
        needsResolution = true;
        const targetIndex = Number(
          link.moduleInstanceId.replace("__MIGRATE_INDEX_", "").replace("__", "")
        );
        const targetInstanceId = instanceIdMap.get(targetIndex);
        if (targetInstanceId) {
          resolvedLinks[fieldName] = {
            moduleInstanceId: targetInstanceId,
            fieldVariableName: link.fieldVariableName,
          };
        }
        return;
      }

      resolvedLinks[fieldName] = link;
    });

    if (!needsResolution) return instance;

    return {
      ...instance,
      fieldLinks: Object.keys(resolvedLinks).length > 0 ? resolvedLinks : undefined,
    };
  });
}
