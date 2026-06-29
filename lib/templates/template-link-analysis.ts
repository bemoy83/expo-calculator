import type {
  CalculationModule,
  ComputedOutput,
  Field,
  QuoteModuleInstance,
} from "../types";
import { areTypesCompatible } from "../utils/field-linking";

export interface LinkSource {
  moduleInstanceId: string;
  moduleName: string;
  moduleOrder: number;
  fieldVariableName: string;
  fieldLabel: string;
  isComputedOutput: boolean;
  fieldType?: string;
  unitCategory?: string;
  unitSymbol?: string;
  linkedBy: Array<{
    moduleInstanceId: string;
    moduleName: string;
    fieldVariableName: string;
    fieldLabel: string;
    hasLocalValue: boolean;
  }>;
}

export interface SuggestedSource {
  moduleInstanceId: string;
  moduleName: string;
  moduleOrder: number;
  fieldVariableName: string;
  fieldLabel: string;
  isComputedOutput: boolean;
  confidence: number;
  reason: string;
}

export interface LinkOpportunity {
  moduleInstanceId: string;
  moduleName: string;
  moduleOrder: number;
  fieldVariableName: string;
  fieldLabel: string;
  fieldType: string;
  hasLocalValue: boolean;
  suggestedSources: SuggestedSource[];
}

export interface PrimaryModuleInfo {
  id: string;
  name: string;
  fieldsAsSource: number;
  computedOutputsAsSource: number;
}

export interface TemplateLinkAnalysis {
  primaryModule: PrimaryModuleInfo | null;
  linkSources: LinkSource[];
  linkOpportunities: LinkOpportunity[];
  stats: {
    totalModules: number;
    totalFields: number;
    totalComputedOutputs: number;
    linkedFields: number;
    unlinkedFields: number;
    coveragePercent: number;
  };
}

type ReverseLink = {
  instanceId: string;
  fieldName: string;
};

export function analyzeTemplateLinks(input: {
  workspaceModules: QuoteModuleInstance[];
  modules: CalculationModule[];
}): TemplateLinkAnalysis {
  const moduleMap = new Map(input.modules.map((module) => [module.id, module]));
  const { reverseLinkMap, stats } = buildReverseLinkMap(input.workspaceModules, moduleMap);
  const linkSources = buildLinkSources(input.workspaceModules, moduleMap, reverseLinkMap);
  const linkOpportunities = buildLinkOpportunities(input.workspaceModules, moduleMap);
  const primaryModule = buildPrimaryModuleInfo(input.workspaceModules, moduleMap, linkSources);

  return {
    primaryModule,
    linkSources,
    linkOpportunities,
    stats: {
      ...stats,
      totalModules: input.workspaceModules.length,
      unlinkedFields: stats.totalFields - stats.linkedFields,
      coveragePercent:
        stats.totalFields > 0
          ? Math.round((stats.linkedFields / stats.totalFields) * 100)
          : 0,
    },
  };
}

export function calculateTemplateLinkConfidence(
  sourceField: Field | ComputedOutput,
  targetField: Field,
  sourceVarName: string
): number {
  let score = 0;

  if (sourceVarName === targetField.variableName) {
    score += 50;
  } else if (similarVariableNames(sourceVarName, targetField.variableName)) {
    score += 30;
  }

  const sourceUnit = "unitCategory" in sourceField ? sourceField.unitCategory : undefined;
  const targetUnit = targetField.unitCategory;

  if (sourceUnit && targetUnit) {
    if (sourceUnit === targetUnit) {
      score += 30;
      const sourceSymbol = "unitSymbol" in sourceField ? sourceField.unitSymbol : undefined;
      if (sourceSymbol === targetField.unitSymbol) {
        score += 10;
      }
    }
  } else if (!sourceUnit && !targetUnit) {
    score += 20;
  }

  const sourceType = "type" in sourceField ? sourceField.type : "number";
  if (sourceType === targetField.type) {
    score += 10;
  }

  return Math.min(score, 100);
}

export function getTemplateLinkMatchReason(
  sourceField: Field | ComputedOutput,
  targetField: Field,
  sourceVarName: string
): string {
  const reasons: string[] = [];

  if (sourceVarName === targetField.variableName) {
    reasons.push("Matching name");
  } else if (similarVariableNames(sourceVarName, targetField.variableName)) {
    reasons.push("Similar name");
  }

  const sourceUnit = "unitCategory" in sourceField ? sourceField.unitCategory : undefined;
  const targetUnit = targetField.unitCategory;
  const sourceSymbol = "unitSymbol" in sourceField ? sourceField.unitSymbol : undefined;

  if (sourceUnit === targetUnit && sourceSymbol) {
    reasons.push(`Matching unit (${sourceSymbol})`);
  } else if (sourceUnit === targetUnit) {
    reasons.push("Compatible unit");
  }

  const sourceType = "type" in sourceField ? sourceField.type : "number";
  if (sourceType === targetField.type) {
    reasons.push("Compatible type");
  }

  return reasons.join(" • ") || "Type compatible";
}

function buildReverseLinkMap(
  workspaceModules: QuoteModuleInstance[],
  moduleMap: Map<string, CalculationModule>
): {
  reverseLinkMap: Map<string, ReverseLink[]>;
  stats: {
    totalFields: number;
    totalComputedOutputs: number;
    linkedFields: number;
  };
} {
  const reverseLinkMap = new Map<string, ReverseLink[]>();
  let totalFields = 0;
  let totalComputedOutputs = 0;
  let linkedFields = 0;

  workspaceModules.forEach((instance) => {
    const moduleDef = moduleMap.get(instance.moduleId);
    if (!moduleDef) return;

    totalFields += moduleDef.fields.length;
    totalComputedOutputs += moduleDef.computedOutputs?.length || 0;

    Object.entries(instance.fieldLinks || {}).forEach(([fieldName, link]) => {
      linkedFields++;
      const targetKey = `${link.moduleInstanceId}.${link.fieldVariableName}`;
      const links = reverseLinkMap.get(targetKey) || [];
      links.push({ instanceId: instance.id, fieldName });
      reverseLinkMap.set(targetKey, links);
    });
  });

  return {
    reverseLinkMap,
    stats: { totalFields, totalComputedOutputs, linkedFields },
  };
}

function buildLinkSources(
  workspaceModules: QuoteModuleInstance[],
  moduleMap: Map<string, CalculationModule>,
  reverseLinkMap: Map<string, ReverseLink[]>
): LinkSource[] {
  const linkSources: LinkSource[] = [];

  workspaceModules.forEach((instance, index) => {
    const moduleDef = moduleMap.get(instance.moduleId);
    if (!moduleDef) return;

    moduleDef.fields.forEach((field) => {
      const linkedBy = reverseLinkMap.get(`${instance.id}.${field.variableName}`) || [];
      if (linkedBy.length === 0) return;

      linkSources.push({
        moduleInstanceId: instance.id,
        moduleName: moduleDef.name,
        moduleOrder: index,
        fieldVariableName: field.variableName,
        fieldLabel: field.label,
        isComputedOutput: false,
        fieldType: field.type,
        unitCategory: field.unitCategory,
        unitSymbol: field.unitSymbol,
        linkedBy: mapLinkedBy(linkedBy, workspaceModules, moduleMap),
      });
    });

    moduleDef.computedOutputs?.forEach((output) => {
      const linkedBy = reverseLinkMap.get(`${instance.id}.out.${output.variableName}`) || [];
      if (linkedBy.length === 0) return;

      linkSources.push({
        moduleInstanceId: instance.id,
        moduleName: moduleDef.name,
        moduleOrder: index,
        fieldVariableName: `out.${output.variableName}`,
        fieldLabel: output.label,
        isComputedOutput: true,
        unitCategory: output.unitCategory,
        unitSymbol: output.unitSymbol,
        linkedBy: mapLinkedBy(linkedBy, workspaceModules, moduleMap),
      });
    });
  });

  return linkSources;
}

function buildLinkOpportunities(
  workspaceModules: QuoteModuleInstance[],
  moduleMap: Map<string, CalculationModule>
): LinkOpportunity[] {
  const linkOpportunities: LinkOpportunity[] = [];

  workspaceModules.forEach((instance, targetIndex) => {
    const moduleDef = moduleMap.get(instance.moduleId);
    if (!moduleDef) return;

    moduleDef.fields.forEach((field) => {
      if (instance.fieldLinks?.[field.variableName]) return;
      if (field.type === "material") return;

      const suggestedSources = buildSuggestedSources(
        workspaceModules.slice(0, targetIndex),
        moduleMap,
        field
      );

      if (suggestedSources.length === 0) return;

      linkOpportunities.push({
        moduleInstanceId: instance.id,
        moduleName: moduleDef.name,
        moduleOrder: targetIndex,
        fieldVariableName: field.variableName,
        fieldLabel: field.label,
        fieldType: field.type,
        hasLocalValue: !!instance.fieldValues[field.variableName],
        suggestedSources,
      });
    });
  });

  linkOpportunities.sort((a, b) => {
    if (a.moduleOrder !== b.moduleOrder) return a.moduleOrder - b.moduleOrder;

    const aMaxConfidence = Math.max(...a.suggestedSources.map((source) => source.confidence), 0);
    const bMaxConfidence = Math.max(...b.suggestedSources.map((source) => source.confidence), 0);
    return bMaxConfidence - aMaxConfidence;
  });

  return linkOpportunities;
}

function buildSuggestedSources(
  potentialSourceModules: QuoteModuleInstance[],
  moduleMap: Map<string, CalculationModule>,
  targetField: Field
): SuggestedSource[] {
  const suggestedSources: SuggestedSource[] = [];

  potentialSourceModules.forEach((sourceInstance, sourceIndex) => {
    const sourceModule = moduleMap.get(sourceInstance.moduleId);
    if (!sourceModule) return;

    sourceModule.fields.forEach((sourceField) => {
      if (sourceField.type === "material") return;
      if (!areTypesCompatible(sourceField, targetField)) return;

      addSuggestion({
        suggestedSources,
        sourceInstance,
        sourceModule,
        moduleOrder: sourceIndex,
        sourceField,
        targetField,
        sourceVarName: sourceField.variableName,
        fieldVariableName: sourceField.variableName,
        fieldLabel: sourceField.label,
        isComputedOutput: false,
      });
    });

    sourceModule.computedOutputs?.forEach((output) => {
      if (!canLinkComputedOutputToField(output, targetField)) return;

      addSuggestion({
        suggestedSources,
        sourceInstance,
        sourceModule,
        moduleOrder: sourceIndex,
        sourceField: output,
        targetField,
        sourceVarName: output.variableName,
        fieldVariableName: `out.${output.variableName}`,
        fieldLabel: output.label,
        isComputedOutput: true,
      });
    });
  });

  suggestedSources.sort((a, b) => {
    if (a.moduleOrder !== b.moduleOrder) return a.moduleOrder - b.moduleOrder;
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    if (a.isComputedOutput !== b.isComputedOutput) {
      return a.isComputedOutput ? 1 : -1;
    }
    return 0;
  });

  return suggestedSources;
}

function addSuggestion(input: {
  suggestedSources: SuggestedSource[];
  sourceInstance: QuoteModuleInstance;
  sourceModule: CalculationModule;
  moduleOrder: number;
  sourceField: Field | ComputedOutput;
  targetField: Field;
  sourceVarName: string;
  fieldVariableName: string;
  fieldLabel: string;
  isComputedOutput: boolean;
}) {
  const confidence = calculateTemplateLinkConfidence(
    input.sourceField,
    input.targetField,
    input.sourceVarName
  );

  if (confidence < 30) return;

  input.suggestedSources.push({
    moduleInstanceId: input.sourceInstance.id,
    moduleName: input.sourceModule.name,
    moduleOrder: input.moduleOrder,
    fieldVariableName: input.fieldVariableName,
    fieldLabel: input.fieldLabel,
    isComputedOutput: input.isComputedOutput,
    confidence,
    reason: getTemplateLinkMatchReason(input.sourceField, input.targetField, input.sourceVarName),
  });
}

function buildPrimaryModuleInfo(
  workspaceModules: QuoteModuleInstance[],
  moduleMap: Map<string, CalculationModule>,
  linkSources: LinkSource[]
): PrimaryModuleInfo | null {
  if (workspaceModules.length === 0) return null;

  const firstInstance = workspaceModules[0];
  const firstModule = moduleMap.get(firstInstance.moduleId);
  if (!firstModule) return null;

  return {
    id: firstInstance.id,
    name: firstModule.name,
    fieldsAsSource: linkSources.filter(
      (source) => source.moduleInstanceId === firstInstance.id && !source.isComputedOutput
    ).length,
    computedOutputsAsSource: linkSources.filter(
      (source) => source.moduleInstanceId === firstInstance.id && source.isComputedOutput
    ).length,
  };
}

function mapLinkedBy(
  linkedBy: ReverseLink[],
  workspaceModules: QuoteModuleInstance[],
  moduleMap: Map<string, CalculationModule>
): LinkSource["linkedBy"] {
  return linkedBy.map((link) => {
    const linkInstance = workspaceModules.find((instance) => instance.id === link.instanceId);
    const linkModule = linkInstance ? moduleMap.get(linkInstance.moduleId) : null;
    const linkField = linkModule?.fields.find((field) => field.variableName === link.fieldName);

    return {
      moduleInstanceId: link.instanceId,
      moduleName: linkModule?.name || "Unknown",
      fieldVariableName: link.fieldName,
      fieldLabel: linkField?.label || link.fieldName,
      hasLocalValue: !!linkInstance?.fieldValues[link.fieldName],
    };
  });
}

function canLinkComputedOutputToField(output: ComputedOutput, targetField: Field): boolean {
  if (targetField.type !== "number") return false;

  if (output.unitCategory && targetField.unitCategory) {
    return output.unitCategory === targetField.unitCategory;
  }

  return true;
}

function similarVariableNames(name1: string, name2: string): boolean {
  const normalize = (name: string) => name.toLowerCase().replace(/[_\s]/g, "");
  const n1 = normalize(name1);
  const n2 = normalize(name2);

  const variations: Record<string, string[]> = {
    qty: ["quantity", "count"],
    quantity: ["qty", "count"],
    w: ["width"],
    h: ["height"],
    l: ["length"],
    width: ["w"],
    height: ["h"],
    length: ["l"],
  };

  if (n1 === n2) return true;
  if (variations[n1]?.includes(n2)) return true;
  if (variations[n2]?.includes(n1)) return true;

  return n1.includes(n2) || n2.includes(n1);
}
