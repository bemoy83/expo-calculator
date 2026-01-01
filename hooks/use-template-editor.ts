"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluateFormula } from "@/lib/formula-evaluator";
import { resolveFieldLinks } from "@/lib/utils/field-linking";
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
import { canLinkFields } from "@/lib/utils/field-linking";

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

  // Track the last initialized templateId and template to prevent duplicate initialization
  const initializedTemplateIdRef = useRef<string | null>(null);
  const initializedTemplateRef = useRef<ModuleTemplate | null>(null);

  // Recalculate all module costs - follows quotes store pattern
  // Always reads latest state and recalculates, avoiding stale closure issues
  const recalculateModules = useCallback(() => {
    setWorkspaceModules((prev) => {
      if (prev.length === 0) return prev;

      const resolvedValues = resolveFieldLinks(prev);

      const updated = prev.map((instance) => {
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

      return updated;
    });
  }, [materials, modules]);

  // Initialize from template or defaults
  useEffect(() => {
    if (templateId === "new") {
      // Reset for new template
      if (initializedTemplateIdRef.current !== "new") {
        setTemplateName("");
        setTemplateDescription("");
        setWorkspaceModules([]);
        initializedTemplateIdRef.current = "new";
        initializedTemplateRef.current = null;
      }
      return;
    }

    if (!template) return;

    // Prevent duplicate initialization - check if we've already initialized for this template
    const templateChanged =
      initializedTemplateIdRef.current !== templateId ||
      initializedTemplateRef.current !== template;

    if (!templateChanged) {
      return;
    }

    // Mark this template as initialized
    initializedTemplateIdRef.current = templateId;
    initializedTemplateRef.current = template;

    setTemplateName(template.name);
    setTemplateDescription(template.description || "");

    const initialModules: QuoteModuleInstance[] = [];
    const instanceIdMap = new Map<string | number, string>(); // Map old indices or IDs to new IDs

    // Single pass: create instances with ID-based links
    template.moduleInstances.forEach((instance, index) => {
      const moduleDef = modules.find((m) => m.id === instance.moduleId);
      if (!moduleDef) return;

      // Use saved instance ID if available (type-safe access)
      const savedInstance = instance as any; // Template instances may have id/fieldValues from serializeForSave
      const instanceId = savedInstance.id || generateId();
      instanceIdMap.set(index, instanceId); // Map index for migration
      if (savedInstance.id) {
        instanceIdMap.set(savedInstance.id, instanceId); // Map ID to itself
      }

      // Use saved field values if available, otherwise use defaults
      const fieldValues = savedInstance.fieldValues
        ? { ...getDefaultFieldValues(moduleDef.fields, materials), ...savedInstance.fieldValues }
        : getDefaultFieldValues(moduleDef.fields, materials);

      // Migrate field links: convert __index_* format to ID-based (one-time migration)
      let fieldLinks: Record<string, { moduleInstanceId: string; fieldVariableName: string }> | undefined;
      if (instance.fieldLinks && Object.keys(instance.fieldLinks).length > 0) {
        const migratedLinks: Record<string, { moduleInstanceId: string; fieldVariableName: string }> = {};

        Object.entries(instance.fieldLinks).forEach(([fieldName, link]) => {
          if (link.moduleInstanceId.startsWith("__index_")) {
            // OLD FORMAT: Migrate from index-based to ID-based
            const targetIndex = Number(
              link.moduleInstanceId.replace("__index_", "").replace("__", "")
            );
            // We'll resolve this in a second pass since we need all instances created first
            migratedLinks[fieldName] = {
              moduleInstanceId: `__MIGRATE_INDEX_${targetIndex}__`,
              fieldVariableName: link.fieldVariableName,
            };
          } else {
            // NEW FORMAT: Already ID-based, use as-is
            migratedLinks[fieldName] = link;
          }
        });

        fieldLinks = Object.keys(migratedLinks).length > 0 ? migratedLinks : undefined;
      }

      initialModules.push({
        id: instanceId,
        moduleId: instance.moduleId,
        fieldValues,
        fieldLinks: fieldLinks || {},
        calculatedCost: 0,
      });
    });

    // Second pass: Resolve migrated index-based links
    initialModules.forEach((instance) => {
      if (!instance.fieldLinks) return;

      const resolvedLinks: Record<string, { moduleInstanceId: string; fieldVariableName: string }> = {};
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
        } else {
          resolvedLinks[fieldName] = link;
        }
      });

      if (needsResolution) {
        instance.fieldLinks = Object.keys(resolvedLinks).length > 0 ? resolvedLinks : undefined;
      }
    });

    // Calculate costs for initial modules
    const resolvedValues = resolveFieldLinks(initialModules);
    const modulesWithCosts = initialModules.map((instance) => {
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

    setWorkspaceModules(modulesWithCosts);
  }, [templateId, template?.id, modules, materials]); // Include modules/materials for initialization, but ref prevents duplicates

  const updateFieldValue = useCallback(
    (
      instanceId: string,
      fieldName: string,
      value: string | number | boolean
    ) => {
      setWorkspaceModules((prev) => {
        return prev.map((instance) =>
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
      });
      // Recalculate after updating (separate call, like quotes store)
      recalculateModules();
    },
    [recalculateModules]
  );

  const addModuleInstance = useCallback(
    (moduleId: string) => {
      const moduleDef = modules.find((m) => m.id === moduleId);
      if (!moduleDef) return;

      const fieldValues = getDefaultFieldValues(moduleDef.fields, materials);

      // Create instance with cost 0, then recalculate (follows quotes store pattern)
      const newInstance: QuoteModuleInstance = {
        id: generateId(),
        moduleId,
        fieldValues,
        fieldLinks: {},
        calculatedCost: 0,
      };

      setWorkspaceModules((prev) => [...prev, newInstance]);
      // Recalculate after adding (separate call, like quotes store)
      recalculateModules();
    },
    [materials, modules, recalculateModules]
  );

  const removeModuleInstance = useCallback(
    (instanceId: string) => {
      setWorkspaceModules((prev) => prev.filter((m) => m.id !== instanceId));
      // Recalculate after removing (separate call, like quotes store)
      recalculateModules();
    },
    [recalculateModules]
  );

  const reorderModules = useCallback(
    (oldIndex: number, newIndex: number) => {
      if (oldIndex === newIndex) return;
      if (oldIndex < 0 || newIndex < 0) return;
      setWorkspaceModules((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(oldIndex, 1);
        updated.splice(newIndex, 0, moved);
        // costs unchanged by order, so no recalc
        return updated;
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
        return prev.map((instance) =>
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
      });
      // Recalculate after linking (separate call, like quotes store)
      recalculateModules();

      return { valid: true };
    },
    [modules, recalculateModules, workspaceModules]
  );

  const unlinkField = useCallback(
    (instanceId: string, fieldName: string) => {
      setWorkspaceModules((prev) => {
        return prev.map((instance) =>
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
      });
      // Recalculate after unlinking (separate call, like quotes store)
      recalculateModules();
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
    // NEW: Serialize with instance IDs preserved (not converted to indices)
    const moduleInstances = workspaceModules.map((instance) => {
      return {
        id: instance.id, // Preserve instance ID
        moduleId: instance.moduleId,
        fieldValues: instance.fieldValues, // Save field values
        fieldLinks: instance.fieldLinks && Object.keys(instance.fieldLinks).length > 0
          ? instance.fieldLinks // Keep ID-based links as-is
          : undefined,
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
