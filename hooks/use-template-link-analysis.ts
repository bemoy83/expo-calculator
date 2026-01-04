"use client";

import { useMemo } from "react";
import {
  CalculationModule,
  QuoteModuleInstance,
  Field,
  ComputedOutput,
} from "@/lib/types";
import { areTypesCompatible } from "@/lib/utils/field-linking";

/**
 * Template Link Analysis Hook
 *
 * Analyzes template structure to identify:
 * - Link sources (fields that other modules link to)
 * - Link opportunities (unlinked fields with suggested sources)
 * - Primary module (first module in template hierarchy)
 * - Statistics (coverage, counts, etc.)
 *
 * Key Features:
 * - Respects module order hierarchy (earlier modules = higher priority sources)
 * - Supports computed outputs as link sources
 * - Smart name/unit matching with confidence scoring
 * - Detects primary module pattern (first module = source of truth)
 *
 * @example
 * ```tsx
 * const analysis = useTemplateLinkAnalysis(workspaceModules, modules);
 *
 * console.log(analysis.stats.coveragePercent); // 75
 * console.log(analysis.primaryModule?.name); // "Framing"
 * console.log(analysis.linkOpportunities.length); // 3
 * ```
 */

/**
 * Represents a field or computed output that acts as a link source
 */
export interface LinkSource {
  moduleInstanceId: string;
  moduleName: string;
  moduleOrder: number; // Position in template (0 = primary)
  fieldVariableName: string; // Could be "width" or "out.area"
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
    hasLocalValue: boolean; // Does target have stored value?
  }>;
}

/**
 * Represents a suggested link source for an unlinked field
 */
export interface SuggestedSource {
  moduleInstanceId: string;
  moduleName: string;
  moduleOrder: number;
  fieldVariableName: string;
  fieldLabel: string;
  isComputedOutput: boolean;
  confidence: number; // 0-100
  reason: string; // Human-readable explanation
}

/**
 * Represents an unlinked field with suggested sources
 */
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

/**
 * Primary module information
 */
export interface PrimaryModuleInfo {
  id: string;
  name: string;
  fieldsAsSource: number;
  computedOutputsAsSource: number;
}

/**
 * Complete analysis result
 */
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

/**
 * Check if two variable names are similar (for matching suggestions)
 */
function similarVariableNames(name1: string, name2: string): boolean {
  const normalize = (name: string) => name.toLowerCase().replace(/[_\s]/g, "");
  const n1 = normalize(name1);
  const n2 = normalize(name2);

  // Common variations
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

  // Substring matching (one contains the other)
  if (n1.includes(n2) || n2.includes(n1)) return true;

  return false;
}

/**
 * Calculate confidence score for a potential link
 */
function calculateConfidence(
  sourceField: Field | ComputedOutput,
  targetField: Field,
  sourceVarName: string
): number {
  let score = 0;

  // Name matching (highest weight)
  if (sourceVarName === targetField.variableName) {
    score += 50; // Exact match
  } else if (similarVariableNames(sourceVarName, targetField.variableName)) {
    score += 30; // Similar names
  }

  // Unit matching (important for correctness)
  const sourceUnit = "unitCategory" in sourceField ? sourceField.unitCategory : undefined;
  const targetUnit = targetField.unitCategory;

  if (sourceUnit && targetUnit) {
    if (sourceUnit === targetUnit) {
      score += 30; // Same category
      const sourceSymbol = "unitSymbol" in sourceField ? sourceField.unitSymbol : undefined;
      if (sourceSymbol === targetField.unitSymbol) {
        score += 10; // Same unit symbol
      }
    }
  } else if (!sourceUnit && !targetUnit) {
    score += 20; // Both have no units (likely compatible)
  }

  // Type matching
  const sourceType = "type" in sourceField ? sourceField.type : "number";
  if (sourceType === targetField.type) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Get human-readable reason for match suggestion
 */
function getMatchReason(
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
    reasons.push(`Compatible unit`);
  }

  const sourceType = "type" in sourceField ? sourceField.type : "number";
  if (sourceType === targetField.type) {
    reasons.push("Compatible type");
  }

  return reasons.join(" • ") || "Type compatible";
}

/**
 * Check if a computed output can be linked to a field
 */
function canLinkComputedOutputToField(
  output: ComputedOutput,
  targetField: Field
): boolean {
  // Computed outputs are always number type
  if (targetField.type !== "number") return false;

  // Check unit compatibility
  if (output.unitCategory && targetField.unitCategory) {
    return output.unitCategory === targetField.unitCategory;
  }

  return true; // No units or one missing = compatible
}

/**
 * Hook to analyze template link topology and find opportunities
 */
export function useTemplateLinkAnalysis(
  workspaceModules: QuoteModuleInstance[],
  modules: CalculationModule[]
): TemplateLinkAnalysis {
  return useMemo(() => {
    // Build module lookup map
    const moduleMap = new Map(modules.map((m) => [m.id, m]));

    // Initialize statistics
    let totalFields = 0;
    let totalComputedOutputs = 0;
    let linkedFields = 0;

    // Build reverse link map (who links to what)
    const reverseLinkMap = new Map<string, Array<{
      instanceId: string;
      fieldName: string;
    }>>();

    workspaceModules.forEach((instance) => {
      const moduleDef = moduleMap.get(instance.moduleId);
      if (!moduleDef) return;

      // Count fields
      totalFields += moduleDef.fields.length;
      totalComputedOutputs += moduleDef.computedOutputs?.length || 0;

      // Process field links
      Object.entries(instance.fieldLinks || {}).forEach(([fieldName, link]) => {
        linkedFields++;
        const targetKey = `${link.moduleInstanceId}.${link.fieldVariableName}`;

        if (!reverseLinkMap.has(targetKey)) {
          reverseLinkMap.set(targetKey, []);
        }
        reverseLinkMap.get(targetKey)!.push({
          instanceId: instance.id,
          fieldName,
        });
      });
    });

    // Build link sources
    const linkSources: LinkSource[] = [];

    workspaceModules.forEach((instance, index) => {
      const moduleDef = moduleMap.get(instance.moduleId);
      if (!moduleDef) return;

      // Check regular fields as sources
      moduleDef.fields.forEach((field) => {
        const key = `${instance.id}.${field.variableName}`;
        const linkedBy = reverseLinkMap.get(key) || [];

        if (linkedBy.length > 0) {
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
            linkedBy: linkedBy.map((link) => {
              const linkInstance = workspaceModules.find((m) => m.id === link.instanceId);
              const linkModule = linkInstance ? moduleMap.get(linkInstance.moduleId) : null;
              const linkField = linkModule?.fields.find((f) => f.variableName === link.fieldName);

              return {
                moduleInstanceId: link.instanceId,
                moduleName: linkModule?.name || "Unknown",
                fieldVariableName: link.fieldName,
                fieldLabel: linkField?.label || link.fieldName,
                hasLocalValue: !!linkInstance?.fieldValues[link.fieldName],
              };
            }),
          });
        }
      });

      // Check computed outputs as sources
      (moduleDef.computedOutputs || []).forEach((output) => {
        const key = `${instance.id}.out.${output.variableName}`;
        const linkedBy = reverseLinkMap.get(key) || [];

        if (linkedBy.length > 0) {
          linkSources.push({
            moduleInstanceId: instance.id,
            moduleName: moduleDef.name,
            moduleOrder: index,
            fieldVariableName: `out.${output.variableName}`,
            fieldLabel: output.label,
            isComputedOutput: true,
            unitCategory: output.unitCategory,
            unitSymbol: output.unitSymbol,
            linkedBy: linkedBy.map((link) => {
              const linkInstance = workspaceModules.find((m) => m.id === link.instanceId);
              const linkModule = linkInstance ? moduleMap.get(linkInstance.moduleId) : null;
              const linkField = linkModule?.fields.find((f) => f.variableName === link.fieldName);

              return {
                moduleInstanceId: link.instanceId,
                moduleName: linkModule?.name || "Unknown",
                fieldVariableName: link.fieldName,
                fieldLabel: linkField?.label || link.fieldName,
                hasLocalValue: !!linkInstance?.fieldValues[link.fieldName],
              };
            }),
          });
        }
      });
    });

    // Find link opportunities (unlinked fields with suggestions)
    const linkOpportunities: LinkOpportunity[] = [];

    workspaceModules.forEach((instance, targetIndex) => {
      const moduleDef = moduleMap.get(instance.moduleId);
      if (!moduleDef) return;

      moduleDef.fields.forEach((field) => {
        // Skip if field is already linked
        if (instance.fieldLinks?.[field.variableName]) return;

        // Skip material type fields (cannot be linked)
        if (field.type === "material") return;

        const suggestedSources: SuggestedSource[] = [];

        // Look at modules ABOVE current module (earlier in order)
        const potentialSourceModules = workspaceModules.slice(0, targetIndex);

        potentialSourceModules.forEach((sourceInstance, sourceIndex) => {
          const sourceModule = moduleMap.get(sourceInstance.moduleId);
          if (!sourceModule) return;

          // Check regular fields
          sourceModule.fields.forEach((sourceField) => {
            // Skip material fields
            if (sourceField.type === "material") return;

            // Check type compatibility using existing utility
            if (!areTypesCompatible(sourceField, field)) return;

            const confidence = calculateConfidence(sourceField, field, sourceField.variableName);

            // Only suggest if confidence is reasonable (>= 30%)
            if (confidence >= 30) {
              suggestedSources.push({
                moduleInstanceId: sourceInstance.id,
                moduleName: sourceModule.name,
                moduleOrder: sourceIndex,
                fieldVariableName: sourceField.variableName,
                fieldLabel: sourceField.label,
                isComputedOutput: false,
                confidence,
                reason: getMatchReason(sourceField, field, sourceField.variableName),
              });
            }
          });

          // Check computed outputs
          (sourceModule.computedOutputs || []).forEach((output) => {
            if (!canLinkComputedOutputToField(output, field)) return;

            const confidence = calculateConfidence(output, field, output.variableName);

            if (confidence >= 30) {
              suggestedSources.push({
                moduleInstanceId: sourceInstance.id,
                moduleName: sourceModule.name,
                moduleOrder: sourceIndex,
                fieldVariableName: `out.${output.variableName}`,
                fieldLabel: output.label,
                isComputedOutput: true,
                confidence,
                reason: getMatchReason(output, field, output.variableName),
              });
            }
          });
        });

        // Sort suggestions by priority
        suggestedSources.sort((a, b) => {
          // 1. Earlier modules first (primary module = highest priority)
          if (a.moduleOrder !== b.moduleOrder) {
            return a.moduleOrder - b.moduleOrder;
          }
          // 2. Higher confidence first
          if (a.confidence !== b.confidence) {
            return b.confidence - a.confidence;
          }
          // 3. Regular fields before computed outputs
          if (a.isComputedOutput !== b.isComputedOutput) {
            return a.isComputedOutput ? 1 : -1;
          }
          return 0;
        });

        // Only add if we have suggestions
        if (suggestedSources.length > 0) {
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
        }
      });
    });

    // Sort opportunities by module order (show earlier modules first)
    linkOpportunities.sort((a, b) => {
      if (a.moduleOrder !== b.moduleOrder) {
        return a.moduleOrder - b.moduleOrder;
      }
      // Within same module, sort by highest confidence of best suggestion
      const aMaxConfidence = Math.max(...a.suggestedSources.map(s => s.confidence), 0);
      const bMaxConfidence = Math.max(...b.suggestedSources.map(s => s.confidence), 0);
      return bMaxConfidence - aMaxConfidence;
    });

    // Calculate primary module info
    let primaryModule: PrimaryModuleInfo | null = null;
    if (workspaceModules.length > 0) {
      const firstInstance = workspaceModules[0];
      const firstModule = moduleMap.get(firstInstance.moduleId);

      if (firstModule) {
        const fieldsAsSource = linkSources.filter(
          (s) => s.moduleInstanceId === firstInstance.id && !s.isComputedOutput
        ).length;

        const computedOutputsAsSource = linkSources.filter(
          (s) => s.moduleInstanceId === firstInstance.id && s.isComputedOutput
        ).length;

        primaryModule = {
          id: firstInstance.id,
          name: firstModule.name,
          fieldsAsSource,
          computedOutputsAsSource,
        };
      }
    }

    // Calculate statistics
    const unlinkedFields = totalFields - linkedFields;
    const coveragePercent = totalFields > 0
      ? Math.round((linkedFields / totalFields) * 100)
      : 0;

    return {
      primaryModule,
      linkSources,
      linkOpportunities,
      stats: {
        totalModules: workspaceModules.length,
        totalFields,
        totalComputedOutputs,
        linkedFields,
        unlinkedFields,
        coveragePercent,
      },
    };
  }, [workspaceModules, modules]);
}
