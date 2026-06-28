import { SharedFunction } from '../types';
import { EvaluationContext } from './types';
import { mathInstance } from './math-runtime';
import { FunctionCall, MATH_FUNCTIONS, getOutermostFunctionCalls, parseFieldPropertyReferences, parseFunctionCalls, parseMaterialPropertyReferences, replaceIdentifiers } from './parser';
import { createFormulaResolver } from './resolver';

function evaluateFunctionCall(
  call: FunctionCall,
  context: EvaluationContext,
  functions: SharedFunction[]
): number {
  const resolver = createFormulaResolver(context);
  const funcDef = functions.find(f => f.name === call.functionName);
  if (!funcDef) {
    throw new Error(`Function '${call.functionName}' not found`);
  }

  if (call.arguments.length !== funcDef.parameters.length) {
    throw new Error(
      `Function '${call.functionName}' expects ${funcDef.parameters.length} argument(s), but got ${call.arguments.length}`
    );
  }

  const functionContext: EvaluationContext = {
    fieldValues: {},
    materials: context.materials,
    fields: context.fields,
    functions: functions,
  };

  for (let i = 0; i < funcDef.parameters.length; i++) {
    const paramName = funcDef.parameters[i].name;
    const argVarName = call.arguments[i];

    let argValue: string | number | boolean;
    
    const nestedFunctionCalls = parseFunctionCalls(argVarName);
    if (nestedFunctionCalls.length > 0) {
      const nestedContext: EvaluationContext = {
        fieldValues: context.fieldValues,
        materials: context.materials,
        fields: context.fields,
        functionOutputs: context.functionOutputs,
        functions: functions,
      };
      try {
        argValue = evaluateFormula(argVarName, nestedContext);
      } catch (error: any) {
        throw new Error(`Error evaluating nested function call '${argVarName}' for function '${call.functionName}' parameter '${paramName}': ${error.message}`);
      }
    }
    else if (argVarName in context.fieldValues) {
      argValue = context.fieldValues[argVarName];
    } 
    else if (context.fields) {
      const field = context.fields.find(f => f.variableName === argVarName);
      if (field && field.defaultValue !== undefined) {
        argValue = field.defaultValue;
      } else {
        if (context.functionOutputs && argVarName in context.functionOutputs) {
          argValue = context.functionOutputs[argVarName];
        }
        else {
          const material = resolver.materialsByVariableName.get(argVarName);
          if (material) {
            argValue = material.price;
          } else {
            const numValue = Number(argVarName);
            if (!isNaN(numValue) && isFinite(numValue)) {
              argValue = numValue;
            } else {
              throw new Error(`Variable '${argVarName}' not found for function '${call.functionName}' parameter '${paramName}'`);
            }
          }
        }
      }
    }
    else if (context.functionOutputs && argVarName in context.functionOutputs) {
      argValue = context.functionOutputs[argVarName];
    }
    else {
      const material = resolver.materialsByVariableName.get(argVarName);
      if (material) {
        argValue = material.price;
      } else {
        const numValue = Number(argVarName);
        if (!isNaN(numValue) && isFinite(numValue)) {
          argValue = numValue;
        } else {
          throw new Error(`Variable '${argVarName}' not found for function '${call.functionName}' parameter '${paramName}'`);
        }
      }
    }

    functionContext.fieldValues[paramName] = argValue;
  }

  return evaluateFormula(funcDef.formula, functionContext);
}

export function evaluateFormula(
  formula: string,
  context: EvaluationContext
): number {
  try {
    let processedFormula = formula;
    const functions = context.functions || [];
    const resolver = createFormulaResolver(context);

    let functionCalls = parseFunctionCalls(processedFormula);
    
    const updateExclusionRanges = (): Array<[number, number]> => {
      return functionCalls.map(call => {
        return [call.startIndex, call.endIndex];
      });
    };
    
    let functionNames = new Set(functionCalls.map(call => call.functionName));

    const fieldVariableNames = Object.keys(context.fieldValues);
    const fieldPropertyRefs = parseFieldPropertyReferences(processedFormula, fieldVariableNames);
    const fieldPropertyValueMap = new Map<string, string>();
    for (const ref of fieldPropertyRefs) {
      const propertyValue = resolver.resolveFieldProperty(ref.fieldVar, ref.propertyName);
      fieldPropertyValueMap.set(ref.fullMatch, propertyValue.toString());
    }
    processedFormula = replaceIdentifiers(processedFormula, (token) => {
      if (token.hasDot && fieldPropertyValueMap.has(token.text)) {
        return fieldPropertyValueMap.get(token.text);
      }
      return null;
    }, updateExclusionRanges());
    
    functionCalls = parseFunctionCalls(processedFormula);
    functionNames = new Set(functionCalls.map(call => call.functionName));

    const fieldValueMap = new Map<string, number>();
    for (const [varName, value] of Object.entries(context.fieldValues)) {
      const numValue = resolver.resolveNumericValue(value);
      if (numValue !== null) {
        fieldValueMap.set(varName, numValue);
      }
    }

    processedFormula = replaceIdentifiers(processedFormula, (token) => {
      if (functionNames.has(token.text)) return null;
      
      if (token.hasDot && token.text.startsWith('out.')) {
        if (fieldValueMap.has(token.text)) {
          return fieldValueMap.get(token.text)?.toString();
        }
        return null;
      }
      if (token.hasDot) return null;
      if (MATH_FUNCTIONS.has(token.text)) return null;
      if (fieldValueMap.has(token.text)) {
        return fieldValueMap.get(token.text)?.toString();
      }
      return null;
    }, updateExclusionRanges());
    
    functionCalls = parseFunctionCalls(processedFormula);
    functionNames = new Set(functionCalls.map(call => call.functionName));

    const materialPropertyRefs = parseMaterialPropertyReferences(processedFormula);
    const fieldPropertyFullMatches = new Set(fieldPropertyRefs.map(ref => ref.fullMatch));
    const materialPropertyValueMap = new Map<string, string>();
    for (const ref of materialPropertyRefs) {
      if (fieldPropertyFullMatches.has(ref.fullMatch)) continue;

      const propertyValue = resolver.resolveMaterialPropertyOrPrice(ref.materialVar, ref.propertyName);
      if (propertyValue !== null) {
        materialPropertyValueMap.set(ref.fullMatch, propertyValue.toString());
      }
    }

    processedFormula = replaceIdentifiers(processedFormula, (token) => {
      if (token.hasDot && materialPropertyValueMap.has(token.text)) {
        return materialPropertyValueMap.get(token.text);
      }
      return null;
    }, updateExclusionRanges());
    
    functionCalls = parseFunctionCalls(processedFormula);
    functionNames = new Set(functionCalls.map(call => call.functionName));

    processedFormula = replaceIdentifiers(processedFormula, (token) => {
      if (functionNames.has(token.text)) return null;
      
      if (token.hasDot) return null;
      if (MATH_FUNCTIONS.has(token.text)) return null;
      const material = resolver.materialsByVariableName.get(token.text);
      if (material) {
        return material.price.toString();
      }
      return null;
    }, updateExclusionRanges());
    
    functionCalls = parseFunctionCalls(processedFormula);
    functionNames = new Set(functionCalls.map(call => call.functionName));

    const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\b/g;
    const matches = processedFormula.match(variableRegex);
    const unreplacedVars: string[] = [];

    const fieldVarsInPropertyRefs = new Set(fieldPropertyRefs.map(ref => ref.fieldVar));
    const materialVarsInPropertyRefs = new Set(materialPropertyRefs.map(ref => ref.materialVar));
    
    const functionCallArgs = new Set<string>();
    for (const call of functionCalls) {
      for (const arg of call.arguments) {
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(arg.trim()) && isNaN(Number(arg.trim()))) {
          functionCallArgs.add(arg.trim());
        }
      }
    }

    if (matches) {
      for (const match of matches) {
        if (!isNaN(Number(match))) continue;
        if (MATH_FUNCTIONS.has(match)) continue;
        if (functionNames.has(match)) continue;
        if (match.includes('.')) continue;
        if (fieldVarsInPropertyRefs.has(match)) continue;
        if (materialVarsInPropertyRefs.has(match)) continue;
        if (functionCallArgs.has(match)) continue;
        unreplacedVars.push(match);
      }
    }

    if (unreplacedVars.length > 0) {
      throw new Error(`Missing values for variables: ${unreplacedVars.join(', ')}`);
    }

    const sortedCalls = getOutermostFunctionCalls(functionCalls).sort((a, b) => b.startIndex - a.startIndex);
    
    for (const call of sortedCalls) {
      try {
        const result = evaluateFunctionCall(call, context, functions);
        processedFormula = 
          processedFormula.slice(0, call.startIndex) +
          result.toString() +
          processedFormula.slice(call.endIndex);
      } catch (error: any) {
        throw new Error(`Error evaluating function '${call.functionName}': ${error.message}`);
      }
    }

    let result: any;
    try {
      result = mathInstance.evaluate(processedFormula);
    } catch (evalError: any) {
      throw new Error(`Formula evaluation failed: ${evalError.message || 'Invalid expression'}`);
    }

    if (typeof result !== 'number') {
      throw new Error(`Formula returned non-numeric result: ${typeof result}`);
    }

    if (isNaN(result)) {
      throw new Error('Formula evaluated to NaN (Not a Number)');
    }

    if (!isFinite(result)) {
      throw new Error(`Formula evaluated to ${result > 0 ? 'positive' : 'negative'} infinity`);
    }

    return result;
  } catch (error: any) {
    if (error.message && (
      error.message.includes('round()') ||
      error.message.includes('ceil()') ||
      error.message.includes('floor()') ||
      error.message.includes('Missing values for variables') ||
      error.message.includes('Formula evaluation failed') ||
      error.message.includes('Formula returned non-numeric') ||
      error.message.includes('Formula evaluated to')
    )) {
      throw error;
    }
    console.error('Formula evaluation error:', {
      formula,
      error: error.message || error,
      stack: error.stack
    });
    throw new Error(`Formula evaluation failed: ${error.message || 'Invalid formula syntax'}`);
  }
}
