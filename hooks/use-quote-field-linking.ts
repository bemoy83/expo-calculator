import { useCallback } from 'react';
import { Quote, QuoteModuleInstance, Field, FieldType } from '@/lib/types';
import { CalculationModule } from '@/lib/types';

interface UseQuoteFieldLinkingOptions {
  currentQuote: Quote | null;
  modules: CalculationModule[];
  canLinkFields: (instanceId: string, fieldName: string, targetInstanceId: string, targetFieldName: string) => { valid: boolean; error?: string };
}

/**
 * Hook for managing field linking logic in the quote builder.
 *
 * Provides helper functions to check field link status, build link options,
 * resolve linked values, and display link information in the UI.
 *
 * @param options - Configuration options
 * @param options.currentQuote - The current quote with workspace modules (can be null)
 * @param options.modules - All available calculation modules
 * @param options.canLinkFields - Validation function to check if two fields can be linked
 *
 * @returns Object containing field linking helper functions:
 * - isFieldLinked: Check if a field has a link configured
 * - getCurrentLinkValue: Get the current link value for dropdown display
 * - isLinkBroken: Check if a link references a missing target
 * - getLinkDisplayName: Get human-readable link target name
 * - buildLinkOptions: Build dropdown options for linking UI
 * - getResolvedValue: Get the actual value (from link target or direct value)
 */
export function useQuoteFieldLinking({
  currentQuote,
  modules,
  canLinkFields,
}: UseQuoteFieldLinkingOptions) {
  const isFieldLinked = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): boolean => {
      return !!(instance.fieldLinks && instance.fieldLinks[fieldName]);
    },
    []
  );

  const getCurrentLinkValue = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): string => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return 'none';
      return `${link.moduleInstanceId}.${link.fieldVariableName}`;
    },
    []
  );

  const isLinkBroken = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): boolean => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return false;

      const targetInstance = currentQuote?.workspaceModules.find(
        (m) => m.id === link.moduleInstanceId
      );
      if (!targetInstance) return true;

      const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
      if (!targetModule) return true;

      // Check if it's a computed output (starts with 'out.')
      if (link.fieldVariableName.startsWith('out.')) {
        const outputVarName = link.fieldVariableName.replace('out.', '');
        const computedOutput = targetModule.computedOutputs?.find(
          (o) => o.variableName === outputVarName
        );
        return !computedOutput; // Broken if computed output not found
      }

      // Regular field check
      const targetField = targetModule.fields.find(
        (f) => f.variableName === link.fieldVariableName
      );
      if (!targetField) return true;

      return false;
    },
    [currentQuote?.workspaceModules, modules]
  );

  const getLinkDisplayName = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): string => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return '';

      const targetInstance = currentQuote?.workspaceModules.find(
        (m) => m.id === link.moduleInstanceId
      );
      if (!targetInstance) return 'source unavailable';

      const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
      if (!targetModule) return 'source unavailable';

      // Check if it's a computed output (starts with 'out.')
      if (link.fieldVariableName.startsWith('out.')) {
        const outputVarName = link.fieldVariableName.replace('out.', '');
        const computedOutput = targetModule.computedOutputs?.find(
          (o) => o.variableName === outputVarName
        );
        if (!computedOutput) return 'source unavailable';
        const unitStr = computedOutput.unitSymbol ? ` (${computedOutput.unitSymbol})` : '';
        return `${targetModule.name} — Computed: ${computedOutput.label}${unitStr}`;
      }

      const targetField = targetModule.fields.find(
        (f) => f.variableName === link.fieldVariableName
      );
      if (!targetField) return 'source unavailable';

      return `${targetModule.name} — ${targetField.label}`;
    },
    [currentQuote?.workspaceModules, modules]
  );

  const buildLinkOptions = useCallback(
    (instance: QuoteModuleInstance, field: { variableName: string; type: FieldType }) => {
      if (!currentQuote) return [{ value: 'none', label: 'None' }];

      const options: Array<{ value: string; label: string }> = [
        { value: 'none', label: 'None' },
      ];

      currentQuote.workspaceModules.forEach((otherInstance) => {
        if (otherInstance.id === instance.id) return;

        const otherModule = modules.find((m) => m.id === otherInstance.moduleId);
        if (!otherModule) return;

        options.push({
          value: `sep-${otherInstance.id}`,
          label: `--- ${otherModule.name} ---`,
        });

        otherModule.fields.forEach((otherField) => {
          if (otherField.type === 'material') return;
          if (
            otherInstance.id === instance.id &&
            otherField.variableName === field.variableName
          )
            return;

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

        // Add computed outputs as link sources
        if (otherModule.computedOutputs && otherModule.computedOutputs.length > 0) {
          otherModule.computedOutputs.forEach((output) => {
            const computedOutputVarName = `out.${output.variableName}`;
            // Validate using canLinkFields to ensure proper validation
            const validation = canLinkFields(
              instance.id,
              field.variableName,
              otherInstance.id,
              computedOutputVarName
            );
            if (validation.valid) {
              const unitStr = output.unitSymbol ? ` (${output.unitSymbol})` : '';
              options.push({
                value: `${otherInstance.id}.${computedOutputVarName}`,
                label: `Computed: ${output.label}${unitStr}`,
              });
            }
          });
        }
      });

      return options;
    },
    [canLinkFields, currentQuote, modules]
  );

  const getResolvedValue = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): any => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return instance.fieldValues[fieldName];

      const targetInstance = currentQuote?.workspaceModules.find(
        (m) => m.id === link.moduleInstanceId
      );
      if (!targetInstance) return instance.fieldValues[fieldName];

      return targetInstance.fieldValues[link.fieldVariableName];
    },
    [currentQuote?.workspaceModules]
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
