import type { CalculationModule, Material } from "../types";
import { convertFromBase } from "../units";

export function buildLineItemSummaries(input: {
  moduleDef: CalculationModule;
  resolvedFieldValues: Record<string, any>;
  fieldValuesWithComputed: Record<string, any>;
  materials: Material[];
}): {
  fieldSummary: string;
  primarySummary?: string;
  secondarySummary?: string;
} {
  return {
    fieldSummary: buildFieldSummary(input.moduleDef, input.resolvedFieldValues),
    primarySummary: buildPrimarySummary(input),
    secondarySummary: buildSecondarySummary(input.moduleDef, input.resolvedFieldValues),
  };
}

function buildPrimarySummary(input: {
  moduleDef: CalculationModule;
  resolvedFieldValues: Record<string, any>;
  fieldValuesWithComputed: Record<string, any>;
  materials: Material[];
}): string | undefined {
  const checkedOutputs =
    input.moduleDef.computedOutputs?.filter((output) => output.showInQuote) || [];
  if (checkedOutputs.length === 0) return undefined;

  const outputSummaries = checkedOutputs
    .map((output) => {
      const value = input.fieldValuesWithComputed[`out.${output.variableName}`];
      if (value === null || value === undefined) return null;

      const unitStr = output.unitSymbol ? ` ${output.unitSymbol}` : "";
      return `${output.label}: ${value}${unitStr}`;
    })
    .filter((summary): summary is string => summary !== null);

  if (outputSummaries.length === 0) return undefined;

  const materialName = getSelectedMaterialName(
    input.moduleDef,
    input.resolvedFieldValues,
    input.materials
  );

  return materialName
    ? `${outputSummaries.join(", ")} — ${materialName}`
    : outputSummaries.join(", ");
}

function buildSecondarySummary(
  moduleDef: CalculationModule,
  resolvedFieldValues: Record<string, any>
): string | undefined {
  const dimensionFields = moduleDef.fields.flatMap((field) => {
    const value = resolvedFieldValues[field.variableName];
    if (value === null || value === undefined) return [];
    if (field.unitCategory !== "length" || !field.unitSymbol) return [];

    const displayValue =
      typeof value === "number" ? convertFromBase(value, field.unitSymbol) : value;

    return [`${field.label}: ${displayValue} ${field.unitSymbol}`];
  });

  return dimensionFields.length > 0 ? dimensionFields.join(" - ") : undefined;
}

function buildFieldSummary(
  moduleDef: CalculationModule,
  resolvedFieldValues: Record<string, any>
): string {
  const summaryParts = moduleDef.fields.slice(0, 4).flatMap((field) => {
    const value = resolvedFieldValues[field.variableName];
    if (value === null || value === undefined) return [];
    return [`${field.label}: ${value}`];
  });

  return summaryParts.join(", ") || "No details";
}

function getSelectedMaterialName(
  moduleDef: CalculationModule,
  resolvedFieldValues: Record<string, any>,
  materials: Material[]
): string | undefined {
  const materialField = moduleDef.fields.find((field) => field.type === "material");
  if (!materialField) return undefined;

  const materialVarName = resolvedFieldValues[materialField.variableName];
  if (typeof materialVarName !== "string") return undefined;

  return materials.find((item) => item.variableName === materialVarName)?.name;
}
