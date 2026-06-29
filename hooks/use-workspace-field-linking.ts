import { useCallback } from "react";
import type { CalculationModule, FieldType, QuoteModuleInstance } from "@/lib/types";

interface UseWorkspaceFieldLinkingOptions {
  workspaceModules: QuoteModuleInstance[];
  modules: CalculationModule[];
  canLinkFields: (
    instanceId: string,
    fieldName: string,
    targetInstanceId: string,
    targetFieldName: string
  ) => { valid: boolean; error?: string };
}

export function useWorkspaceFieldLinking({
  workspaceModules,
  modules,
  canLinkFields,
}: UseWorkspaceFieldLinkingOptions) {
  const isFieldLinked = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): boolean => {
      return !!(instance.fieldLinks && instance.fieldLinks[fieldName]);
    },
    []
  );

  const getCurrentLinkValue = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): string => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return "none";
      return `${link.moduleInstanceId}.${link.fieldVariableName}`;
    },
    []
  );

  const isLinkBroken = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): boolean => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return false;

      const targetInstance = workspaceModules.find((item) => item.id === link.moduleInstanceId);
      if (!targetInstance) return true;

      const targetModule = modules.find((module) => module.id === targetInstance.moduleId);
      if (!targetModule) return true;

      if (link.fieldVariableName.startsWith("out.")) {
        const outputVarName = link.fieldVariableName.replace("out.", "");
        const computedOutput = targetModule.computedOutputs?.find(
          (output) => output.variableName === outputVarName
        );
        return !computedOutput;
      }

      const targetField = targetModule.fields.find(
        (field) => field.variableName === link.fieldVariableName
      );
      return !targetField;
    },
    [modules, workspaceModules]
  );

  const getLinkDisplayName = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): string => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return "";

      const targetInstance = workspaceModules.find((item) => item.id === link.moduleInstanceId);
      if (!targetInstance) return "source unavailable";

      const targetModule = modules.find((module) => module.id === targetInstance.moduleId);
      if (!targetModule) return "source unavailable";

      if (link.fieldVariableName.startsWith("out.")) {
        const outputVarName = link.fieldVariableName.replace("out.", "");
        const computedOutput = targetModule.computedOutputs?.find(
          (output) => output.variableName === outputVarName
        );
        if (!computedOutput) return "source unavailable";
        const unitStr = computedOutput.unitSymbol ? ` (${computedOutput.unitSymbol})` : "";
        return `${targetModule.name} — Computed: ${computedOutput.label}${unitStr}`;
      }

      const targetField = targetModule.fields.find(
        (field) => field.variableName === link.fieldVariableName
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

        const otherModule = modules.find((module) => module.id === otherInstance.moduleId);
        if (!otherModule) return;

        options.push({
          value: `sep-${otherInstance.id}`,
          label: `--- ${otherModule.name} ---`,
        });

        otherModule.fields.forEach((otherField) => {
          if (otherField.type === "material") return;

          const validation = canLinkFields(
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

        otherModule.computedOutputs?.forEach((output) => {
          const computedOutputVarName = `out.${output.variableName}`;
          const validation = canLinkFields(
            instance.id,
            field.variableName,
            otherInstance.id,
            computedOutputVarName
          );

          if (validation.valid) {
            const unitStr = output.unitSymbol ? ` (${output.unitSymbol})` : "";
            options.push({
              value: `${otherInstance.id}.${computedOutputVarName}`,
              label: `Computed: ${output.label}${unitStr}`,
            });
          }
        });
      });

      return options;
    },
    [canLinkFields, modules, workspaceModules]
  );

  const getResolvedValue = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): any => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return instance.fieldValues[fieldName];

      const targetInstance = workspaceModules.find((item) => item.id === link.moduleInstanceId);
      if (!targetInstance) return instance.fieldValues[fieldName];

      return targetInstance.fieldValues[link.fieldVariableName];
    },
    [workspaceModules]
  );

  return {
    isFieldLinked,
    getCurrentLinkValue,
    isLinkBroken,
    getLinkDisplayName,
    buildLinkOptions,
    getResolvedValue,
  };
}
