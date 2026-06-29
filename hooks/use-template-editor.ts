"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceFieldLinking } from "@/hooks/use-workspace-field-linking";
import { useFunctionsStore } from "@/lib/stores/functions-store";
import {
  initializeTemplateWorkspaceModules,
  serializeTemplateWorkspace,
} from "@/lib/templates/template-instance-helpers";
import {
  addTemplateWorkspaceModule,
  linkTemplateWorkspaceField,
  recalculateTemplateWorkspace,
  removeTemplateWorkspaceModule,
  reorderTemplateWorkspaceModules,
  unlinkTemplateWorkspaceField,
  updateTemplateWorkspaceFieldValue,
  validateTemplateWorkspaceFieldLink,
} from "@/lib/templates/template-workspace-actions";
import type {
  CalculationModule,
  Labor,
  Material,
  ModuleTemplate,
  QuoteModuleInstance,
} from "@/lib/types";

interface UseTemplateEditorOptions {
  templateId: string;
  template: ModuleTemplate | null;
  modules: CalculationModule[];
  materials: Material[];
  labor?: Labor[];
}

export function useTemplateEditor({
  templateId,
  template,
  modules,
  materials,
  labor = [],
}: UseTemplateEditorOptions) {
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [workspaceModules, setWorkspaceModules] = useState<QuoteModuleInstance[]>([]);

  const initializedTemplateIdRef = useRef<string | null>(null);
  const initializedTemplateRef = useRef<ModuleTemplate | null>(null);

  const recalculateWorkspace = useCallback(
    (nextWorkspaceModules: QuoteModuleInstance[]) => {
      return recalculateTemplateWorkspace(nextWorkspaceModules, {
        modules,
        materials,
        labor,
        functions: useFunctionsStore.getState().functions,
      });
    },
    [labor, materials, modules]
  );

  const recalculateModules = useCallback(() => {
    setWorkspaceModules((prev) => recalculateWorkspace(prev));
  }, [recalculateWorkspace]);

  useEffect(() => {
    if (templateId === "new") {
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

    const templateChanged =
      initializedTemplateIdRef.current !== templateId ||
      initializedTemplateRef.current !== template;

    if (!templateChanged) return;

    initializedTemplateIdRef.current = templateId;
    initializedTemplateRef.current = template;

    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    setWorkspaceModules(
      initializeTemplateWorkspaceModules({
        template,
        modules,
        materials,
        labor,
        functions: useFunctionsStore.getState().functions,
      })
    );
  }, [labor, materials, modules, template, templateId]);

  const updateFieldValue = useCallback(
    (instanceId: string, fieldName: string, value: string | number | boolean) => {
      setWorkspaceModules((prev) =>
        updateTemplateWorkspaceFieldValue(
          prev,
          {
            modules,
            materials,
            labor,
            functions: useFunctionsStore.getState().functions,
          },
          instanceId,
          fieldName,
          value
        )
      );
    },
    [labor, materials, modules]
  );

  const addModuleInstance = useCallback(
    (moduleId: string) => {
      setWorkspaceModules((prev) =>
        addTemplateWorkspaceModule(
          prev,
          {
            modules,
            materials,
            labor,
            functions: useFunctionsStore.getState().functions,
          },
          moduleId
        )
      );
    },
    [labor, materials, modules]
  );

  const removeModuleInstance = useCallback(
    (instanceId: string) => {
      setWorkspaceModules((prev) =>
        removeTemplateWorkspaceModule(
          prev,
          {
            modules,
            materials,
            labor,
            functions: useFunctionsStore.getState().functions,
          },
          instanceId
        )
      );
    },
    [labor, materials, modules]
  );

  const reorderModules = useCallback((oldIndex: number, newIndex: number) => {
    setWorkspaceModules((prev) => reorderTemplateWorkspaceModules(prev, oldIndex, newIndex));
  }, []);

  const canLinkWorkspaceFields = useCallback(
    (
      instanceId: string,
      fieldName: string,
      targetInstanceId: string,
      targetFieldName: string
    ) => {
      return validateTemplateWorkspaceFieldLink(
        workspaceModules,
        { modules },
        instanceId,
        fieldName,
        targetInstanceId,
        targetFieldName
      );
    },
    [modules, workspaceModules]
  );

  const linkField = useCallback(
    (
      instanceId: string,
      fieldName: string,
      targetInstanceId: string,
      targetFieldName: string
    ) => {
      const validation = canLinkWorkspaceFields(
        instanceId,
        fieldName,
        targetInstanceId,
        targetFieldName
      );
      if (!validation.valid) return validation;

      setWorkspaceModules((prev) => {
        const result = linkTemplateWorkspaceField(
          prev,
          {
            modules,
            materials,
            labor,
            functions: useFunctionsStore.getState().functions,
          },
          instanceId,
          fieldName,
          targetInstanceId,
          targetFieldName
        );
        return result.workspaceModules;
      });

      return { valid: true };
    },
    [canLinkWorkspaceFields, labor, materials, modules]
  );

  const unlinkField = useCallback(
    (instanceId: string, fieldName: string) => {
      setWorkspaceModules((prev) =>
        unlinkTemplateWorkspaceField(
          prev,
          {
            modules,
            materials,
            labor,
            functions: useFunctionsStore.getState().functions,
          },
          instanceId,
          fieldName
        )
      );
    },
    [labor, materials, modules]
  );

  const {
    isFieldLinked,
    getResolvedValue,
    isLinkBroken,
    getLinkDisplayName,
    buildLinkOptions,
    getCurrentLinkValue,
  } = useWorkspaceFieldLinking({
    workspaceModules,
    modules,
    canLinkFields: canLinkWorkspaceFields,
  });

  const serializeForSave = useCallback(() => {
    return serializeTemplateWorkspace({
      workspaceModules,
      modules,
      name: templateName,
      description: templateDescription,
    });
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
