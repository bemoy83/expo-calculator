'use client';

import { useCallback, useState } from "react";
import { ModuleFieldInput } from "@/components/shared/ModuleFieldInput";
import { useQuoteFieldLinking } from "@/hooks/use-quote-field-linking";
import type {
  CalculationModule,
  Field,
  Labor,
  Material,
  Quote,
  QuoteModuleInstance,
} from "@/lib/types";

export function useQuoteFieldInputRenderer(input: {
  currentQuote: Quote | null;
  modules: CalculationModule[];
  materials: Material[];
  labor: Labor[];
  canLinkFields: (
    instanceId: string,
    fieldName: string,
    targetInstanceId: string,
    targetFieldName: string
  ) => { valid: boolean; error?: string };
  linkField: (
    instanceId: string,
    fieldName: string,
    targetInstanceId: string,
    targetFieldName: string
  ) => { valid: boolean; error?: string };
  unlinkField: (instanceId: string, fieldName: string) => void;
  updateWorkspaceModuleFieldValue: (
    instanceId: string,
    fieldName: string,
    value: string | number | boolean
  ) => void;
}) {
  const {
    currentQuote,
    modules,
    materials,
    labor,
    canLinkFields,
    linkField,
    unlinkField,
    updateWorkspaceModuleFieldValue,
  } = input;
  const [linkUIOpen, setLinkUIOpen] = useState<Record<string, Record<string, boolean>>>({});

  const {
    isFieldLinked,
    getCurrentLinkValue,
    isLinkBroken,
    getLinkDisplayName,
    buildLinkOptions,
    getResolvedValue,
  } = useQuoteFieldLinking({
    currentQuote,
    modules,
    canLinkFields,
  });

  const toggleLinkUI = useCallback((instanceId: string, fieldName: string) => {
    setLinkUIOpen((prev) => ({
      ...prev,
      [instanceId]: {
        ...(prev[instanceId] || {}),
        [fieldName]: !prev[instanceId]?.[fieldName],
      },
    }));
  }, []);

  const isLinkUIOpen = useCallback(
    (instanceId: string, fieldName: string): boolean => {
      return !!(linkUIOpen[instanceId]?.[fieldName]);
    },
    [linkUIOpen]
  );

  const closeLinkUI = useCallback((instanceId: string, fieldName: string) => {
    setLinkUIOpen((prev) => {
      const updated = { ...prev };
      if (updated[instanceId]) {
        const instanceLinks = { ...updated[instanceId] };
        delete instanceLinks[fieldName];
        if (Object.keys(instanceLinks).length === 0) {
          delete updated[instanceId];
        } else {
          updated[instanceId] = instanceLinks;
        }
      }
      return updated;
    });
  }, []);

  const handleLinkChange = useCallback(
    (instance: QuoteModuleInstance, fieldName: string, value: string) => {
      if (value === "none") {
        unlinkField(instance.id, fieldName);
        closeLinkUI(instance.id, fieldName);
        return;
      }

      const firstDotIndex = value.indexOf(".");
      if (firstDotIndex === -1) return;

      const targetInstanceId = value.substring(0, firstDotIndex);
      const targetFieldName = value.substring(firstDotIndex + 1);

      if (!targetInstanceId || !targetFieldName) return;

      const result = linkField(instance.id, fieldName, targetInstanceId, targetFieldName);
      if (!result.valid && result.error) {
        alert(result.error);
      } else {
        closeLinkUI(instance.id, fieldName);
      }
    },
    [closeLinkUI, linkField, unlinkField]
  );

  const handleUnlink = useCallback(
    (instanceId: string, fieldName: string) => {
      unlinkField(instanceId, fieldName);
      closeLinkUI(instanceId, fieldName);
    },
    [closeLinkUI, unlinkField]
  );

  const renderFieldInput = useCallback(
    (instance: QuoteModuleInstance, field: Field) => {
      const isLinkedToValue = isFieldLinked(instance, field.variableName);
      const displayValue = isLinkedToValue
        ? getResolvedValue(instance, field.variableName)
        : instance.fieldValues[field.variableName];

      const linkProps =
        field.type !== "material"
          ? {
              canLink: true,
              isLinked: isLinkedToValue,
              isLinkBroken: isLinkBroken(instance, field.variableName),
              linkDisplayName: getLinkDisplayName(instance, field.variableName),
              linkUIOpen: isLinkUIOpen(instance.id, field.variableName),
              currentLinkValue: getCurrentLinkValue(instance, field.variableName),
              linkOptions: buildLinkOptions(instance, field),
              onToggleLink: () => toggleLinkUI(instance.id, field.variableName),
              onLinkChange: (value: string) => handleLinkChange(instance, field.variableName, value),
              onUnlink: () => handleUnlink(instance.id, field.variableName),
            }
          : undefined;

      return (
        <ModuleFieldInput
          field={field}
          value={displayValue}
          materials={materials}
          labor={labor}
          onChange={(val) => {
            if (linkProps?.isLinked) return;
            updateWorkspaceModuleFieldValue(instance.id, field.variableName, val);
          }}
          linkProps={linkProps}
        />
      );
    },
    [
      buildLinkOptions,
      getCurrentLinkValue,
      getLinkDisplayName,
      getResolvedValue,
      handleLinkChange,
      handleUnlink,
      isFieldLinked,
      isLinkBroken,
      isLinkUIOpen,
      labor,
      materials,
      toggleLinkUI,
      updateWorkspaceModuleFieldValue,
    ]
  );

  return {
    renderFieldInput,
  };
}
