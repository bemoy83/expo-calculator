import { useState, useCallback, useRef } from 'react';
import { nameAfterLabelChange } from '@/lib/utils/function-parameters';
import type { FunctionParamKind } from '@/lib/types';

export interface FunctionParameter {
  name: string;
  label: string;
  unitCategory?: 'length' | 'area' | 'volume' | 'weight' | 'percentage' | 'count';
  unitSymbol?: string;
  required?: boolean;
  kind?: FunctionParamKind;
}

interface UseParameterManagerProps {
  initialParameters?: FunctionParameter[];
  onParameterChange?: () => void; // Called when parameters change to trigger validation
  /** Whether the formula reads a name; a name in use doesn't follow its label. */
  isNameInUse?: (name: string) => boolean;
}

interface UseParameterManagerReturn {
  parameters: FunctionParameter[];
  expandedParameters: Set<string>;
  addParameter: () => void;
  updateParameter: (index: number, updates: Partial<FunctionParameter>) => void;
  removeParameter: (index: number) => void;
  toggleParameterExpanded: (index: number) => void;
  setParameters: (parameters: FunctionParameter[] | ((prev: FunctionParameter[]) => FunctionParameter[])) => void;
}

export function useParameterManager({
  initialParameters = [
    { name: '', label: '', unitCategory: undefined, unitSymbol: undefined, required: true },
  ],
  onParameterChange,
  isNameInUse,
}: UseParameterManagerProps = {}): UseParameterManagerReturn {
  // Read when a label changes, so it sees the formula as it is then.
  const isNameInUseRef = useRef(isNameInUse);
  isNameInUseRef.current = isNameInUse;
  const [parameters, setParametersInternal] = useState<FunctionParameter[]>(initialParameters);
  const [expandedParameters, setExpandedParameters] = useState<Set<string>>(new Set());

  // Wrapper to call onParameterChange callback
  const setParameters = useCallback(
    (newParameters: FunctionParameter[] | ((prev: FunctionParameter[]) => FunctionParameter[])) => {
      setParametersInternal((prev) => {
        const updated = typeof newParameters === 'function' ? newParameters(prev) : newParameters;
        onParameterChange?.();
        return updated;
      });
    },
    [onParameterChange]
  );

  const toggleParameterExpanded = useCallback((index: number) => {
    const paramKey = `param-${index}`;
    setExpandedParameters((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(paramKey)) {
        newExpanded.delete(paramKey);
      } else {
        newExpanded.add(paramKey);
      }
      return newExpanded;
    });
  }, []);

  const addParameter = useCallback(() => {
    setParameters((prev) => [
      ...prev,
      { name: '', label: '', unitCategory: undefined, unitSymbol: undefined, required: true },
    ]);
    // Auto-expand the newly added parameter
    setExpandedParameters((prev) => {
      const newExpanded = new Set(prev);
      newExpanded.add(`param-${parameters.length}`);
      return newExpanded;
    });
    onParameterChange?.();
  }, [setParameters, parameters.length, onParameterChange]);

  const updateParameter = useCallback(
    (index: number, updates: Partial<FunctionParameter>) => {
      // A new label renames the parameter while its name was made from the label (or is
      // empty) and the formula doesn't use it yet.
      if (updates.label !== undefined) {
        const name = nameAfterLabelChange({
          parameters,
          index,
          label: updates.label,
          inUse: !!isNameInUseRef.current?.(parameters[index].name.trim()),
        });
        setParameters((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates, name } : p)));
        onParameterChange?.();
        return;
      }

      setParameters((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
      onParameterChange?.();
    },
    [parameters, setParameters, onParameterChange]
  );

  const removeParameter = useCallback(
    (index: number) => {
      setParameters((prev) => prev.filter((_, i) => i !== index));
      setExpandedParameters((prev) => {
        const newExpanded = new Set(prev);
        newExpanded.delete(`param-${index}`);
        // Update keys for remaining parameters
        const updated = new Set<string>();
        prev.forEach((key) => {
          const keyIndex = parseInt(key.replace('param-', ''));
          if (keyIndex < index) {
            updated.add(key);
          } else if (keyIndex > index) {
            updated.add(`param-${keyIndex - 1}`);
          }
        });
        return updated;
      });
      onParameterChange?.();
    },
    [setParameters, onParameterChange]
  );

  return {
    parameters,
    expandedParameters,
    addParameter,
    updateParameter,
    removeParameter,
    toggleParameterExpanded,
    setParameters,
  };
}


