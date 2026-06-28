import { Material, SharedFunction } from '../types';
import { FormulaDebugInfo } from './types';
import { MATH_FUNCTIONS, parseFieldPropertyReferences, parseFunctionCalls, parseMaterialPropertyReferences } from './parser';
import { FormulaField } from './validation-types';

export function analyzeFormulaVariables(
  formula: string,
  availableVariables: string[],
  materials: Material[],
  fields?: FormulaField[],
  functions?: SharedFunction[]
): FormulaDebugInfo {
  const mathFunctionsList = Array.from(MATH_FUNCTIONS);
  const availableFunctions = functions || [];

  const functionCalls = parseFunctionCalls(formula);
  const functionNames = new Set<string>();
  const functionCallsFormatted: Array<{ name: string; arguments: string[]; fullMatch: string }> = [];
  functionCalls.forEach(call => {
    functionNames.add(call.functionName);
    functionCallsFormatted.push({
      name: call.functionName,
      arguments: call.arguments,
      fullMatch: call.fullMatch,
    });
  });

  const fieldPropertyRefs = parseFieldPropertyReferences(formula, availableVariables);
  const materialPropertyRefs = parseMaterialPropertyReferences(formula);
  const filteredMaterialPropertyRefs = materialPropertyRefs.filter(ref =>
    !fieldPropertyRefs.some(fpr => fpr.fullMatch === ref.fullMatch)
  );

  const fieldPropertyRefsFormatted = fieldPropertyRefs.map(ref => ({
    full: ref.fullMatch,
    fieldVar: ref.fieldVar,
    property: ref.propertyName,
  }));

  const materialPropertyRefsFormatted = filteredMaterialPropertyRefs.map(ref => ({
    full: ref.fullMatch,
    materialVar: ref.materialVar,
    property: ref.propertyName,
  }));

  const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\b/g;
  const matches = formula.match(variableRegex) || [];
  const computedOutputRefs = matches.filter(m => m.startsWith('out.'));
  const regularMatches = matches.filter(m => !m.startsWith('out.'));

  const allPropertyRefs = new Set([
    ...fieldPropertyRefs.map(ref => ref.fullMatch),
    ...filteredMaterialPropertyRefs.map(ref => ref.fullMatch)
  ]);

  const allAvailableVars = [
    ...availableVariables,
    ...materials.map(m => m.variableName),
    ...mathFunctionsList
  ];

  const allFunctionNames = new Set([
    ...functionNames,
    ...availableFunctions.map(f => f.name)
  ]);

  const variables: string[] = [];
  const computedOutputs: string[] = [];
  const mathFunctions: string[] = [];
  const unknownVariables: string[] = [];

  computedOutputRefs.forEach(ref => {
    if (allAvailableVars.includes(ref)) {
      computedOutputs.push(ref);
    } else {
      unknownVariables.push(ref);
    }
  });

  for (const match of regularMatches) {
    if (!isNaN(Number(match))) continue;

    if (mathFunctionsList.includes(match)) {
      mathFunctions.push(match);
      continue;
    }

    if (allFunctionNames.has(match)) {
      continue;
    }

    if (allPropertyRefs.has(match)) {
      continue;
    }

    let isPartOfPropertyRef = false;
    for (const propRef of allPropertyRefs) {
      const parts = propRef.split('.');
      if (parts.length === 2 && parts[1] === match) {
        isPartOfPropertyRef = true;
        break;
      }
    }

    if (isPartOfPropertyRef) {
      continue;
    }

    if (allAvailableVars.includes(match)) {
      variables.push(match);
    } else {
      unknownVariables.push(match);
    }
  }

  return {
    fieldPropertyRefs: fieldPropertyRefsFormatted,
    materialPropertyRefs: materialPropertyRefsFormatted,
    variables: [...new Set(variables)],
    computedOutputs: [...new Set(computedOutputs)],
    mathFunctions: [...new Set(mathFunctions)],
    functionCalls: functionCallsFormatted,
    unknownVariables: [...new Set(unknownVariables)],
  };
}
