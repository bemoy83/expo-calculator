/**
 * Field Linking Utilities
 * 
 * Pure functions for validating and managing field links.
 * These utilities are decoupled from store logic and can be used
 * in both Quote Builder and Template Editor contexts.
 */

import { QuoteModuleInstance, Field, CalculationModule } from '../types';

/**
 * Check if two field types are compatible for linking
 */
export function areTypesCompatible(sourceField: Field, targetField: Field): boolean {
  // Material types cannot be linked (per spec)
  if (sourceField.type === 'material' || targetField.type === 'material') {
    return false;
  }
  
  // Numeric types are compatible
  if (sourceField.type === 'number' && targetField.type === 'number') {
    // Check unit compatibility if both have unit categories
    if (sourceField.unitCategory && targetField.unitCategory) {
      return sourceField.unitCategory === targetField.unitCategory;
    }
    return true; // No units or one missing unit = compatible
  }
  
  // Boolean types are compatible
  if (sourceField.type === 'boolean' && targetField.type === 'boolean') {
    return true;
  }
  
  // String types (future - skip for MVP)
  // Dropdown types: only compatible if same type
  if (sourceField.type === 'dropdown' && targetField.type === 'dropdown') {
    return true;
  }
  
  return false;
}

/**
 * Detect circular references in field links
 * 
 * @param instances - Array of module instances to check
 * @param instanceId - Source instance ID
 * @param fieldName - Source field name
 * @param targetInstanceId - Target instance ID
 * @param targetFieldName - Target field name
 * @returns Cycle path string if cycle detected, null otherwise
 */
export function detectCircularReference(
  instances: QuoteModuleInstance[],
  instanceId: string,
  fieldName: string,
  targetInstanceId: string,
  targetFieldName: string
): string | null {
  // Build dependency graph
  const graph: Record<string, string[]> = {};
  instances.forEach((instance) => {
    Object.keys(instance.fieldValues).forEach((fName) => {
      const key = `${instance.id}.${fName}`;
      const link = instance.fieldLinks?.[fName];
      if (link) {
        const targetKey = `${link.moduleInstanceId}.${link.fieldVariableName}`;
        if (!graph[key]) {
          graph[key] = [];
        }
        graph[key].push(targetKey);
      }
    });
  });
  
  // Add the proposed link temporarily
  const sourceKey = `${instanceId}.${fieldName}`;
  const targetKey = `${targetInstanceId}.${targetFieldName}`;
  if (!graph[sourceKey]) {
    graph[sourceKey] = [];
  }
  graph[sourceKey].push(targetKey);
  
  // DFS to detect cycles
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(node: string): string | null {
    if (recStack.has(node)) {
      // Cycle detected
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
 * Validate if two fields can be linked
 * 
 * @param instances - Array of module instances
 * @param modules - Array of module definitions
 * @param instanceId - Source instance ID
 * @param fieldName - Source field name
 * @param targetInstanceId - Target instance ID
 * @param targetFieldName - Target field name
 * @returns Validation result with valid flag and optional error message
 */
export function canLinkFields(
  instances: QuoteModuleInstance[],
  modules: CalculationModule[],
  instanceId: string,
  fieldName: string,
  targetInstanceId: string,
  targetFieldName: string
): { valid: boolean; error?: string } {
  // Prevent self-linking
  if (instanceId === targetInstanceId && fieldName === targetFieldName) {
    return { valid: false, error: 'Cannot link field to itself' };
  }
  
  // Find source and target instances
  const sourceInstance = instances.find((m) => m.id === instanceId);
  const targetInstance = instances.find((m) => m.id === targetInstanceId);
  
  if (!sourceInstance) {
    return { valid: false, error: 'Source module instance not found' };
  }
  if (!targetInstance) {
    return { valid: false, error: 'Target module instance not found' };
  }
  
  // Get module definitions
  const sourceModule = modules.find((m) => m.id === sourceInstance.moduleId);
  const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
  
  if (!sourceModule || !targetModule) {
    return { valid: false, error: 'Module definition not found' };
  }
  
  // Find field definitions
  const sourceField = sourceModule.fields.find((f) => f.variableName === fieldName);
  const targetField = targetModule.fields.find((f) => f.variableName === targetFieldName);
  
  if (!sourceField) {
    return { valid: false, error: 'Source field not found' };
  }
  if (!targetField) {
    return { valid: false, error: 'Target field not found' };
  }
  
  // Check type compatibility
  if (!areTypesCompatible(sourceField, targetField)) {
    return { valid: false, error: `Cannot link ${sourceField.type} field to ${targetField.type} field` };
  }
  
  // Check for circular references
  const cycle = detectCircularReference(instances, instanceId, fieldName, targetInstanceId, targetFieldName);
  if (cycle) {
    return { valid: false, error: `Circular reference detected: ${cycle}` };
  }
  
  return { valid: true };
}

/**
 * Resolve field links to their actual values
 * 
 * @param instances - Array of module instances with field links
 * @returns Resolved field values mapped by instance ID and field name
 */
export function resolveFieldLinks(
  instances: QuoteModuleInstance[]
): Record<string, Record<string, any>> {
  const resolved: Record<string, Record<string, any>> = {};
  const brokenLinks: Array<{ instanceId: string; fieldName: string }> = [];
  
  function resolve(instanceId: string, fieldName: string, path: string[]): any {
    const key = `${instanceId}.${fieldName}`;
    
    // Detect cycles
    if (path.includes(key)) {
      const cycleStart = path.indexOf(key);
      const cycle = [...path.slice(cycleStart), key].join(' → ');
      console.warn(`Circular reference detected: ${cycle}`);
      throw new Error(`Circular reference: ${cycle}`);
    }
    
    const instance = instances.find((i) => i.id === instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    
    const link = instance.fieldLinks?.[fieldName];
    if (!link) {
      // No link, return direct value
      return instance.fieldValues[fieldName];
    }
    
    // Check if target exists
    const targetInstance = instances.find((i) => i.id === link.moduleInstanceId);
    if (!targetInstance) {
      brokenLinks.push({ instanceId, fieldName });
      // Return direct value as fallback
      return instance.fieldValues[fieldName];
    }
    
    // Check if target field exists
    if (!(link.fieldVariableName in targetInstance.fieldValues)) {
      brokenLinks.push({ instanceId, fieldName });
      // Return direct value as fallback
      return instance.fieldValues[fieldName];
    }
    
    // Resolve linked value recursively
    return resolve(link.moduleInstanceId, link.fieldVariableName, [...path, key]);
  }
  
  // Resolve all fields for all instances
  instances.forEach((instance) => {
    resolved[instance.id] = {};
    Object.keys(instance.fieldValues).forEach((fieldName) => {
      try {
        resolved[instance.id][fieldName] = resolve(instance.id, fieldName, []);
      } catch (error: any) {
        // Handle broken links or cycles - use direct value
        console.warn(`Error resolving link for ${instance.id}.${fieldName}:`, error.message);
        resolved[instance.id][fieldName] = instance.fieldValues[fieldName];
      }
    });
  });
  
  // Note: Broken links are tracked but not auto-removed here
  // The caller should handle broken link cleanup if needed
  
  return resolved;
}








