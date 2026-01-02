import { useState, useCallback } from 'react';
import { generateParameterName } from '@/lib/utils/function-parameters';

export interface FunctionParameter {
  name: string;
  label: string;
  unitCategory?: 'length' | 'area' | 'volume' | 'weight' | 'percentage' | 'count';
  unitSymbol?: string;
  required?: boolean;
}

interface UseParameterManagerProps {
  initialParameters?: FunctionParameter[];
  onParameterChange?: () => void; // Called when parameters change to trigger validation
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
}: UseParameterManagerProps = {}): UseParameterManagerReturn {
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
      // If label is being updated, auto-generate name if name is empty or matches the old label-based name
      if (updates.label !== undefined) {
        const currentParam = parameters[index];
        const oldName = currentParam.name.trim();
        const oldLabel = currentParam.label.trim();

        // Generate name from old label to check if current name was auto-generated
        const oldGeneratedName = oldLabel ? generateParameterName(oldLabel, parameters, index) : '';

        // Auto-generate name if:
        // 1. Name is empty, OR
        // 2. Name matches the old auto-generated name (meaning it was auto-generated before)
        if (!oldName || oldName === oldGeneratedName) {
          const newName = updates.label.trim()
            ? generateParameterName(updates.label.trim(), parameters, index)
            : '';
          setParameters((prev) =>
            prev.map((p, i) => (i === index ? { ...p, ...updates, name: newName } : p))
          );
          onParameterChange?.();
          return;
        }
        // Otherwise, user has manually edited the name, so keep it unchanged
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


