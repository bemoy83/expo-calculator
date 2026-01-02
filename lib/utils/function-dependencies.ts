/**
 * Function Dependencies Analyzer
 * 
 * Analyzes function dependencies and determines if required variables are available.
 */

import { QuoteModuleInstance, CalculationModule, SharedFunction } from '../types';
import { parseFunctionCalls } from '../formula-evaluator';

export interface FunctionDependency {
  functionName: string;
  requiredVariables: string[];
  missingVariables: string[];
  satisfied: boolean;
}

/**
 * Analyzes function dependencies for a module instance
 * Checks if all required variables for function calls are available
 */
export function analyzeFunctionDependencies(
  instance: QuoteModuleInstance,
  module: CalculationModule,
  functions: SharedFunction[],
  availableVariables: string[]
): FunctionDependency[] {
  const dependencies: FunctionDependency[] = [];
  
  // Parse function calls in the module's formula
  const functionCalls = parseFunctionCalls(module.formula);
  
  for (const call of functionCalls) {
    // Find function definition
    const func = functions.find(f => f.name === call.functionName);
    if (!func) {
      // Function not found - skip
      continue;
    }
    
    // Get required variables (function arguments)
    const requiredVariables = call.arguments.filter(arg => {
      // Skip numeric literals
      return isNaN(Number(arg)) || !isFinite(Number(arg));
    });
    
    // Check which variables are missing
    const missingVariables = requiredVariables.filter(
      varName => !availableVariables.includes(varName)
    );
    
    dependencies.push({
      functionName: call.functionName,
      requiredVariables,
      missingVariables,
      satisfied: missingVariables.length === 0,
    });
  }
  
  return dependencies;
}

/**
 * Get all function dependencies for a set of instances
 */
export function getAllFunctionDependencies(
  instances: QuoteModuleInstance[],
  modules: CalculationModule[],
  functions: SharedFunction[]
): Map<string, FunctionDependency[]> {
  const allDependencies = new Map<string, FunctionDependency[]>();
  
  instances.forEach(instance => {
    const moduleDef = modules.find(m => m.id === instance.moduleId);
    if (!moduleDef) return;
    
    // Get available variables from instance field values
    const availableVariables = Object.keys(instance.fieldValues);
    
    // Also include variables from linked fields (simplified - would need full resolution)
    if (instance.fieldLinks) {
      Object.values(instance.fieldLinks).forEach(link => {
        const targetInstance = instances.find(i => i.id === link.moduleInstanceId);
        if (targetInstance && targetInstance.fieldValues[link.fieldVariableName] !== undefined) {
          availableVariables.push(link.fieldVariableName);
        }
      });
    }
    
    const dependencies = analyzeFunctionDependencies(
      instance,
      moduleDef,
      functions,
      availableVariables
    );
    
    if (dependencies.length > 0) {
      allDependencies.set(instance.id, dependencies);
    }
  });
  
  return allDependencies;
}

