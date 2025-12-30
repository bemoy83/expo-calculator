"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { evaluateFormula } from "@/lib/formula-evaluator";
import {
  CalculationModule,
  Field,
  FieldType,
  Material,
  ModuleTemplate,
  QuoteModuleInstance,
} from "@/lib/types";
import { normalizeToBase } from "@/lib/units";
import { generateId } from "@/lib/utils";
import { canLinkFields, resolveFieldLinks } from "@/lib/utils/field-linking";
import { arrayMove } from "@dnd-kit/sortable";

interface UseTemplateEditorOptions {
  templateId: string;
  template: ModuleTemplate | null;
  modules: CalculationModule[];
  materials: Material[];
}

function getDefaultFieldValues(
  fields: Field[],
  materials: Material[]
): Record<string, string | number | boolean> {
  const defaults: Record<string, string | number | boolean> = {};

  fields.forEach((field) => {
    if (!field.variableName) return;

    if (field.defaultValue !== undefined) {
      defaults[field.variableName] = field.defaultValue;
      return;
    }

    switch (field.type) {
      case "number":
        defaults[field.variableName] = "";
        break;
      case "boolean":
        defaults[field.variableName] = false;
        break;
      case "dropdown":
        defaults[field.variableName] = "";
        break;
      case "material": {
        let candidateMaterials = materials;
        if (field.materialCategory && field.materialCategory.trim()) {
          candidateMaterials = materials.filter(
            (m) => m.category === field.materialCategory
          );
        }
        defaults[field.variableName] =
          candidateMaterials[0]?.variableName ?? "";
        break;
      }
      case "text":
        defaults[field.variableName] = "";
        break;
    }
  });

  return defaults;
}

export function useTemplateEditor({
  templateId,
  template,
  modules,
  materials,
}: UseTemplateEditorOptions) {
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [workspaceModules, setWorkspaceModules] = useState<
    QuoteModuleInstance[]
  >([]);

  const recalculateModules = useCallback(
    (modulesToRecalc: QuoteModuleInstance[]) => {
      const resolvedValues = resolveFieldLinks(modulesToRecalc);

      const updated = modulesToRecalc.map((instance) => {
        const moduleDef = modules.find((m) => m.id === instance.moduleId);
        if (!moduleDef) return instance;

        try {
          const resolved = resolvedValues[instance.id] || instance.fieldValues;
          const result = evaluateFormula(moduleDef.formula, {
            fieldValues: resolved,
            materials,
            fields: moduleDef.fields.map((f) => ({
              variableName: f.variableName,
              type: f.type,
              materialCategory: f.materialCategory,
            })),
          });

          return {
            ...instance,
            calculatedCost: result,
          };
        } catch {
          return {
            ...instance,
            calculatedCost: 0,
          };
        }
      });

      setWorkspaceModules(updated);
    },
    [materials, modules]
  );

  // Initialize from template or defaults
  useEffect(() => {
    if (templateId === "new") {
      setTemplateName("");
      setTemplateDescription("");
      setWorkspaceModules([]);
      return;
    }

    if (!template) return;

    setTemplateName(template.name);
    setTemplateDescription(template.description || "");

    const initialModules: QuoteModuleInstance[] = [];
    const instanceIdMap = new Map<number, string>();

    // First pass: create instances
    template.moduleInstances.forEach((instance, index) => {
      const moduleDef = modules.find((m) => m.id === instance.moduleId);
      if (!moduleDef) return;

      const fieldValues = getDefaultFieldValues(moduleDef.fields, materials);
      const newInstanceId = generateId();
      instanceIdMap.set(index, newInstanceId);

      initialModules.push({
        id: newInstanceId,
        moduleId: instance.moduleId,
        fieldValues,
        fieldLinks: {},
        calculatedCost: 0,
      });
    });

    // Second pass: restore links
    template.moduleInstances.forEach((templateInstance, sourceIndex) => {
      const sourceInstanceId = instanceIdMap.get(sourceIndex);
      if (!sourceInstanceId || !templateInstance.fieldLinks) return;

      const sourceInstance = initialModules.find(
        (m) => m.id === sourceInstanceId
      );
      if (!sourceInstance) return;

      const restoredLinks: Record<
        string,
        { moduleInstanceId: string; fieldVariableName: string }
      > = {};

      Object.entries(templateInstance.fieldLinks).forEach(([fieldName, link]) => {
        if (link.moduleInstanceId.startsWith("__index_")) {
          const targetIndex = Number(
            link.moduleInstanceId.replace("__index_", "").replace("__", "")
          );
          const targetInstanceId = instanceIdMap.get(targetIndex);
          if (targetInstanceId) {
            restoredLinks[fieldName] = {
              moduleInstanceId: targetInstanceId,
              fieldVariableName: link.fieldVariableName,
            };
          }
        }
      });

      if (Object.keys(restoredLinks).length > 0) {
        sourceInstance.fieldLinks = restoredLinks;
      }
    });

    setWorkspaceModules(initialModules);
    recalculateModules(initialModules);
  }, [materials, modules, recalculateModules, template, templateId]);

  const updateFieldValue = useCallback(
    (
      instanceId: string,
      fieldName: string,
      value: string | number | boolean
    ) => {
      setWorkspaceModules((prev) => {
        const updated = prev.map((instance) =>
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
        recalculateModules(updated);
        return updated;
      });
    },
    [recalculateModules]
  );

  const addModuleInstance = useCallback(
    (moduleId: string) => {
      const moduleDef = modules.find((m) => m.id === moduleId);
      if (!moduleDef) return;

      const fieldValues = getDefaultFieldValues(moduleDef.fields, materials);

      const newInstance: QuoteModuleInstance = {
        id: generateId(),
        moduleId,
        fieldValues,
        fieldLinks: {},
        calculatedCost: 0,
      };

      setWorkspaceModules((prev) => {
        const updated = [...prev, newInstance];
        recalculateModules(updated);
        return updated;
      });
    },
    [materials, modules, recalculateModules]
  );

  const removeModuleInstance = useCallback(
    (instanceId: string) => {
      setWorkspaceModules((prev) => {
        const updated = prev.filter((m) => m.id !== instanceId);
        recalculateModules(updated);
        return updated;
      });
    },
    [recalculateModules]
  );

  const reorderModules = useCallback(
    (activeId: string, overId: string | null, items: string[]) => {
      if (!overId || activeId === overId) return;
      const oldIndex = items.indexOf(activeId);
      const newIndex = items.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;
      setWorkspaceModules((prev) => {
        const reordered = arrayMove(prev, oldIndex, newIndex);
        // costs unchanged by order, so no recalc
        return reordered;
      });
    },
    []
  );

  const linkField = useCallback(
    (
      instanceId: string,
      fieldName: string,
      targetInstanceId: string,
      targetFieldName: string
    ) => {
      const validation = canLinkFields(
        workspaceModules,
        modules,
        instanceId,
        fieldName,
        targetInstanceId,
        targetFieldName
      );
      if (!validation.valid) {
        return validation;
      }

      setWorkspaceModules((prev) => {
        const updated = prev.map((instance) =>
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
        recalculateModules(updated);
        return updated;
      });

      return { valid: true };
    },
    [modules, recalculateModules, workspaceModules]
  );

  const unlinkField = useCallback(
    (instanceId: string, fieldName: string) => {
      setWorkspaceModules((prev) => {
        const updated = prev.map((instance) =>
          instance.id === instanceId
            ? {
                ...instance,
                fieldLinks: (() => {
                  const links = { ...(instance.fieldLinks || {}) };
                  delete links[fieldName];
                  return Object.keys(links).length > 0 ? links : undefined;
                })(),
              }
            : instance
        );
        recalculateModules(updated);
        return updated;
      });
    },
    [recalculateModules]
  );

  const isFieldLinked = useCallback(
    (instance: QuoteModuleInstance, fieldName: string) => {
      return !!(instance.fieldLinks && instance.fieldLinks[fieldName]);
    },
    []
  );

  const getResolvedValue = useCallback(
    (instance: QuoteModuleInstance, fieldName: string) => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return instance.fieldValues[fieldName];

      const targetInstance = workspaceModules.find(
        (m) => m.id === link.moduleInstanceId
      );
      if (!targetInstance) return instance.fieldValues[fieldName];

      return targetInstance.fieldValues[link.fieldVariableName];
    },
    [workspaceModules]
  );

  const isLinkBroken = useCallback(
    (instance: QuoteModuleInstance, fieldName: string) => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return false;

      const targetInstance = workspaceModules.find(
        (m) => m.id === link.moduleInstanceId
      );
      if (!targetInstance) return true;

      const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
      if (!targetModule) return true;

      const targetField = targetModule.fields.find(
        (f) => f.variableName === link.fieldVariableName
      );
      return !targetField;
    },
    [modules, workspaceModules]
  );

  const getLinkDisplayName = useCallback(
    (instance: QuoteModuleInstance, fieldName: string) => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return "";

      const targetInstance = workspaceModules.find(
        (m) => m.id === link.moduleInstanceId
      );
      if (!targetInstance) return "source unavailable";

      const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
      if (!targetModule) return "source unavailable";

      const targetField = targetModule.fields.find(
        (f) => f.variableName === link.fieldVariableName
      );
      if (!targetField) return "source unavailable";

      return `${targetModule.name} — ${targetField.label}`;
    },
    [modules, workspaceModules]
  );

  const buildLinkOptions = useCallback(
    (instance: QuoteModuleInstance, field: { variableName: string; type: FieldType }) => {
      const options: Array<{ value: string; label: string }> = [
        { value: "none", label: "None" },
      ];

      workspaceModules.forEach((otherInstance) => {
        if (otherInstance.id === instance.id) return;

        const otherModule = modules.find((m) => m.id === otherInstance.moduleId);
        if (!otherModule) return;

        options.push({
          value: `sep-${otherInstance.id}`,
          label: `--- ${otherModule.name} ---`,
        });

        otherModule.fields.forEach((otherField) => {
          if (otherField.type === "material") return;

          const validation = canLinkFields(
            workspaceModules,
            modules,
            instance.id,
            field.variableName,
            otherInstance.id,
            otherField.variableName
          );

          if (validation.valid) {
            options.push({
              value: `${otherInstance.id}.${otherField.variableName}`,
              label: otherField.label,
            });
          }
        });
      });

      return options;
    },
    [modules, workspaceModules]
  );

  const getCurrentLinkValue = useCallback(
    (instance: QuoteModuleInstance, fieldName: string) => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return "none";
      return `${link.moduleInstanceId}.${link.fieldVariableName}`;
    },
    []
  );

  const serializeForSave = useCallback(() => {
    const instanceIdToIndex = new Map<string, number>();
    workspaceModules.forEach((instance, index) => {
      instanceIdToIndex.set(instance.id, index);
    });

    const moduleInstances = workspaceModules.map((instance) => {
      const convertedLinks: Record<
        string,
        { moduleInstanceId: string; fieldVariableName: string }
      > = {};

      if (instance.fieldLinks) {
        Object.entries(instance.fieldLinks).forEach(([fieldName, link]) => {
          const targetIndex = instanceIdToIndex.get(link.moduleInstanceId);
          if (targetIndex !== undefined) {
            convertedLinks[fieldName] = {
              moduleInstanceId: `__index_${targetIndex}__`,
              fieldVariableName: link.fieldVariableName,
            };
          }
        });
      }

      return {
        moduleId: instance.moduleId,
        fieldLinks:
          Object.keys(convertedLinks).length > 0 ? convertedLinks : undefined,
      };
    });

    const categories = Array.from(
      new Set(
        workspaceModules
          .map((instance) => {
            const moduleDef = modules.find((m) => m.id === instance.moduleId);
            return moduleDef?.category;
          })
          .filter(Boolean) as string[]
      )
    );

    return {
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      moduleInstances,
      categories,
    };
  }, [modules, templateDescription, templateName, workspaceModules]);

  return {
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    workspaceModules,
    setWorkspaceModules,
    addModuleInstance,
    removeModuleInstance,
    reorderModules,
    updateFieldValue,
    isFieldLinked,
    getResolvedValue,
    isLinkBroken,
    getLinkDisplayName,
    buildLinkOptions,
    getCurrentLinkValue,
    linkField,
    unlinkField,
    serializeForSave,
    recalculateModules,
  };
}
