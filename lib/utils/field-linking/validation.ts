import type { CalculationModule, Field, QuoteModuleInstance } from "../../types";

export function areTypesCompatible(sourceField: Field, targetField: Field): boolean {
  if (sourceField.type === "material" || targetField.type === "material") {
    return false;
  }

  if (sourceField.type === "number" && targetField.type === "number") {
    if (sourceField.unitCategory && targetField.unitCategory) {
      return sourceField.unitCategory === targetField.unitCategory;
    }
    return true;
  }

  if (sourceField.type === "boolean" && targetField.type === "boolean") {
    return true;
  }

  if (sourceField.type === "dropdown" && targetField.type === "dropdown") {
    return true;
  }

  return false;
}

export function detectCircularReference(
  instances: QuoteModuleInstance[],
  instanceId: string,
  fieldName: string,
  targetInstanceId: string,
  targetFieldName: string
): string | null {
  const graph = buildFieldLinkGraph(instances);
  addGraphEdge(graph, `${instanceId}.${fieldName}`, `${targetInstanceId}.${targetFieldName}`);

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): string | null {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      return [...path.slice(cycleStart), node].join(" → ");
    }

    if (visited.has(node)) return null;

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    for (const neighbor of graph[node] || []) {
      const cycle = dfs(neighbor);
      if (cycle) return cycle;
    }

    recursionStack.delete(node);
    path.pop();
    return null;
  }

  return dfs(`${instanceId}.${fieldName}`);
}

export function canLinkFields(
  instances: QuoteModuleInstance[],
  modules: CalculationModule[],
  instanceId: string,
  fieldName: string,
  targetInstanceId: string,
  targetFieldName: string
): { valid: boolean; error?: string } {
  if (instanceId === targetInstanceId && fieldName === targetFieldName) {
    return { valid: false, error: "Cannot link field to itself" };
  }

  const context = getLinkValidationContext(
    instances,
    modules,
    instanceId,
    fieldName,
    targetInstanceId
  );
  if (!context.valid) return context;

  if (targetFieldName.startsWith("out.")) {
    const computedOutputValidation = validateComputedOutputLink(context, targetFieldName);
    if (!computedOutputValidation.valid) return computedOutputValidation;
  } else {
    const targetField = context.targetModule.fields.find(
      (field) => field.variableName === targetFieldName
    );

    if (!targetField) {
      return { valid: false, error: "Target field not found" };
    }

    if (!areTypesCompatible(context.sourceField, targetField)) {
      return {
        valid: false,
        error: `Cannot link ${context.sourceField.type} field to ${targetField.type} field`,
      };
    }
  }

  const cycle = detectCircularReference(
    instances,
    instanceId,
    fieldName,
    targetInstanceId,
    targetFieldName
  );
  if (cycle) {
    return { valid: false, error: `Circular reference detected: ${cycle}` };
  }

  return { valid: true };
}

type LinkValidationContext =
  | {
      valid: true;
      sourceField: Field;
      targetModule: CalculationModule;
    }
  | {
      valid: false;
      error: string;
    };

function getLinkValidationContext(
  instances: QuoteModuleInstance[],
  modules: CalculationModule[],
  instanceId: string,
  fieldName: string,
  targetInstanceId: string
): LinkValidationContext {
  const sourceInstance = instances.find((instance) => instance.id === instanceId);
  const targetInstance = instances.find((instance) => instance.id === targetInstanceId);

  if (!sourceInstance) {
    return { valid: false, error: "Source module instance not found" };
  }
  if (!targetInstance) {
    return { valid: false, error: "Target module instance not found" };
  }

  const sourceModule = modules.find((module) => module.id === sourceInstance.moduleId);
  const targetModule = modules.find((module) => module.id === targetInstance.moduleId);

  if (!sourceModule || !targetModule) {
    return { valid: false, error: "Module definition not found" };
  }

  const sourceField = sourceModule.fields.find((field) => field.variableName === fieldName);
  if (!sourceField) {
    return { valid: false, error: "Source field not found" };
  }

  return { valid: true, sourceField, targetModule };
}

function validateComputedOutputLink(
  context: Extract<LinkValidationContext, { valid: true }>,
  targetFieldName: string
): { valid: boolean; error?: string } {
  const outputVarName = targetFieldName.replace("out.", "");
  const computedOutput = context.targetModule.computedOutputs?.find(
    (output) => output.variableName === outputVarName
  );

  if (!computedOutput) {
    return { valid: false, error: "Computed output not found" };
  }

  if (context.sourceField.type !== "number") {
    return {
      valid: false,
      error: `Cannot link computed output to ${context.sourceField.type} field`,
    };
  }

  if (
    computedOutput.unitCategory &&
    context.sourceField.unitCategory &&
    computedOutput.unitCategory !== context.sourceField.unitCategory
  ) {
    return {
      valid: false,
      error: `Cannot link computed output with ${computedOutput.unitCategory} unit to field with ${context.sourceField.unitCategory} unit`,
    };
  }

  return { valid: true };
}

function buildFieldLinkGraph(instances: QuoteModuleInstance[]): Record<string, string[]> {
  const graph: Record<string, string[]> = {};

  instances.forEach((instance) => {
    Object.keys(instance.fieldValues).forEach((fieldName) => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return;

      addGraphEdge(
        graph,
        `${instance.id}.${fieldName}`,
        `${link.moduleInstanceId}.${link.fieldVariableName}`
      );
    });
  });

  return graph;
}

function addGraphEdge(graph: Record<string, string[]>, source: string, target: string) {
  graph[source] = graph[source] || [];
  graph[source].push(target);
}
