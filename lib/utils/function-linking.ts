/**
 * Function Linking Utilities
 * 
 * Pure functions for validating and managing function links.
 * Similar to field linking, but for linking function outputs to field inputs.
 */

import { QuoteModuleInstance, CalculationModule, SharedFunction, FunctionLink, FunctionOutput } from '../types';
import { useFunctionsStore } from '../stores/functions-store';

/**
 * Get required variables for a function based on its parameters
 */
export function getFunctionDependencies(
  func: SharedFunction,
  argumentMapping: Record<string, string> // Maps parameter name -> field variable name
): string[] {
  return func.parameters.map(param => argumentMapping[param.name] || param.name);
}

/**
 * Detect circular references in function links
 */
export function detectFunctionCircularReference(
  instances: QuoteModuleInstance[],
  instanceId: string,
  fieldName: string,
  sourceInstanceId: string,
  functionName: string
): string | null {
  // Build dependency graph including both field links and function links
  const graph: Record<string, string[]> = {};
  
  instances.forEach((instance) => {
    Object.keys(instance.fieldValues).forEach((fName) => {
      const key = `${instance.id}.${fName}`;
      
      // Add field links
      const fieldLink = instance.fieldLinks?.[fName];
      if (fieldLink) {
        const targetKey = `${fieldLink.moduleInstanceId}.${fieldLink.fieldVariableName}`;
        if (!graph[key]) {
          graph[key] = [];
        }
        graph[key].push(targetKey);
      }
      
      // Add function links
      const functionLink = instance.functionInputs?.[fName];
      if (functionLink) {
        // Function links point to function outputs
        const sourceInstance = instances.find(i => i.id === functionLink.sourceInstanceId);
        if (sourceInstance && sourceInstance.functionOutputs) {
          // Find the function output
          const outputName = functionLink.outputName || functionLink.functionName;
          const funcOutput = sourceInstance.functionOutputs[outputName];
          if (funcOutput) {
            // Function output depends on its arguments (field values)
            const func = useFunctionsStore.getState().getFunctionByName(functionLink.functionName);
            if (func) {
              Object.values(funcOutput.arguments).forEach(argFieldName => {
                const argKey = `${funcOutput.instanceId}.${argFieldName}`;
                if (!graph[key]) {
                  graph[key] = [];
                }
                graph[key].push(argKey);
              });
            }
          }
        }
      }
    });
  });
  
  // Add the proposed function link temporarily
  const sourceKey = `${instanceId}.${fieldName}`;
  const sourceInstance = instances.find(i => i.id === sourceInstanceId);
  if (sourceInstance && sourceInstance.functionOutputs) {
    const outputName = functionName; // Use function name as output name
    const funcOutput = sourceInstance.functionOutputs[outputName];
    if (funcOutput) {
      const func = useFunctionsStore.getState().getFunctionByName(functionName);
      if (func) {
        Object.values(funcOutput.arguments).forEach(argFieldName => {
          const argKey = `${funcOutput.instanceId}.${argFieldName}`;
          if (!graph[sourceKey]) {
            graph[sourceKey] = [];
          }
          graph[sourceKey].push(argKey);
        });
      }
    }
  }
  
  // DFS to detect cycles (reuse logic from field-linking)
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(node: string): string | null {
    if (recStack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = [...path.slice(cycleStart), node].join(' → ');
      return cycle;
    }
    
    if (visited.has(node)) {
      return null;
    }
    
    visited.add(node);
    recStack.add(node);
    path.push(node);
    
    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      const cycle = dfs(neighbor);
      if (cycle) {
        return cycle;
      }
    }
    
    recStack.delete(node);
    path.pop();
    return null;
  }
  
  return dfs(sourceKey);
}

/**
 * Validate if a function can be linked to a field
 */
export function canLinkFunction(
  instances: QuoteModuleInstance[],
  modules: CalculationModule[],
  functions: SharedFunction[],
  instanceId: string,
  fieldName: string,
  sourceInstanceId: string,
  functionName: string
): { valid: boolean; error?: string } {
  // Find function definition
  const func = functions.find(f => f.name === functionName);
  if (!func) {
    return { valid: false, error: `Function '${functionName}' not found` };
  }
  
  // Find source and target instances
  const sourceInstance = instances.find((m) => m.id === sourceInstanceId);
  const targetInstance = instances.find((m) => m.id === instanceId);
  
  if (!sourceInstance) {
    return { valid: false, error: 'Source module instance not found' };
  }
  if (!targetInstance) {
    return { valid: false, error: 'Target module instance not found' };
  }
  
  // Check if source instance has this function output
  const functionOutput = sourceInstance.functionOutputs?.[functionName];
  if (!functionOutput) {
    return { valid: false, error: `Source instance does not have function output '${functionName}'` };
  }
  
  // Get module definitions
  const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
  if (!targetModule) {
    return { valid: false, error: 'Target module definition not found' };
  }
  
  // Find target field definition
  const targetField = targetModule.fields.find((f) => f.variableName === fieldName);
  if (!targetField) {
    return { valid: false, error: 'Target field not found' };
  }
  
  // Check type compatibility (function outputs are always numbers)
  if (targetField.type !== 'number') {
    return { valid: false, error: `Cannot link function output to ${targetField.type} field` };
  }
  
  // Check unit compatibility if both have units
  if (func.returnUnitCategory && targetField.unitCategory) {
    if (func.returnUnitCategory !== targetField.unitCategory) {
      return { 
        valid: false, 
        error: `Cannot link function returning ${func.returnUnitCategory} to field with ${targetField.unitCategory}` 
      };
    }
  }
  
  // Check for circular references
  const cycle = detectFunctionCircularReference(instances, instanceId, fieldName, sourceInstanceId, functionName);
  if (cycle) {
    return { valid: false, error: `Circular reference detected: ${cycle}` };
  }
  
  return { valid: true };
}

/**
 * Resolve function links to their actual values
 * 
 * @param instances - Array of module instances with function links
 * @param functions - Array of function definitions
 * @returns Resolved function outputs mapped by instance ID and output name
 */
export function resolveFunctionLinks(
  instances: QuoteModuleInstance[],
  functions: SharedFunction[]
): Record<string, Record<string, number>> {
  const resolved: Record<string, Record<string, number>> = {};
  const brokenLinks: Array<{ instanceId: string; outputName: string }> = [];
  
  // First, compute all function outputs
  instances.forEach((instance) => {
    if (!instance.functionOutputs) return;
    
    resolved[instance.id] = {};
    
    Object.entries(instance.functionOutputs).forEach(([outputName, funcOutput]) => {
      try {
        const func = functions.find(f => f.name === funcOutput.functionName);
        if (!func) {
          brokenLinks.push({ instanceId: instance.id, outputName });
          return;
        }
        
        // Get the source instance
        const sourceInstance = instances.find(i => i.id === funcOutput.instanceId);
        if (!sourceInstance) {
          brokenLinks.push({ instanceId: instance.id, outputName });
          return;
        }
        
        // Map function parameters to actual field values
        const functionContext: Record<string, string | number | boolean> = {};
        for (const [paramName, fieldVarName] of Object.entries(funcOutput.arguments)) {
          if (fieldVarName in sourceInstance.fieldValues) {
            functionContext[paramName] = sourceInstance.fieldValues[fieldVarName];
          } else {
            // Missing argument
            brokenLinks.push({ instanceId: instance.id, outputName });
            return;
          }
        }
        
        // Evaluate function formula (simplified - would need full context)
        // For now, we'll compute this in the main evaluation context
        // This is a placeholder - actual evaluation happens in formula evaluator
        resolved[instance.id][outputName] = 0; // Placeholder
      } catch (error: any) {
        brokenLinks.push({ instanceId: instance.id, outputName });
      }
    });
  });
  
  return resolved;
}

