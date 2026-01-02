'use client';

import { useState, useCallback, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EditorActionBar } from '@/components/shared/EditorActionBar';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { SharedFunction } from '@/lib/types';
import { validateFormula } from '@/lib/formula-evaluator';
import { Save, X, Plus, Trash2 } from 'lucide-react';

export interface FunctionEditorViewProps {
  functionId: string; // 'new' or existing function ID
  onClose: () => void;
}

export function FunctionEditorView({ functionId, onClose }: FunctionEditorViewProps) {
  const isNew = functionId === 'new';
  const functions = useFunctionsStore((state) => state.functions);
  const addFunction = useFunctionsStore((state) => state.addFunction);
  const updateFunction = useFunctionsStore((state) => state.updateFunction);
  const getFunction = useFunctionsStore((state) => state.getFunction);

  const existingFunction = isNew ? null : getFunction(functionId);

  const [formData, setFormData] = useState({
    name: existingFunction?.name || '',
    description: existingFunction?.description || '',
    formula: existingFunction?.formula || '',
    category: existingFunction?.category || '',
  });

  const [parameters, setParameters] = useState(
    existingFunction?.parameters || [
      { name: '', label: '', unitCategory: undefined, unitSymbol: undefined, required: true },
    ]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formulaValidation, setFormulaValidation] = useState<{ valid: boolean; error?: string }>({
    valid: true,
  });

  // Validate formula when it changes
  useEffect(() => {
    if (!formData.formula.trim()) {
      setFormulaValidation({ valid: true });
      return;
    }

    // Get parameter names for validation
    const paramNames = parameters.filter(p => p.name.trim()).map(p => p.name);
    
    const validation = validateFormula(
      formData.formula,
      paramNames,
      [], // No materials in function formulas
      undefined, // No fields
      functions // Allow nested functions
    );

    setFormulaValidation(validation);
  }, [formData.formula, parameters, functions]);

  const handleSave = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Function name is required';
    }

    // Check for duplicate names
    const duplicate = functions.find(
      f => f.name.toLowerCase() === formData.name.toLowerCase().trim() && f.id !== functionId
    );
    if (duplicate) {
      newErrors.name = 'A function with this name already exists';
    }

    // Validate parameters
    const validParameters = parameters.filter(p => p.name.trim() && p.label.trim());
    if (validParameters.length === 0) {
      newErrors.parameters = 'At least one parameter is required';
    }

    // Check for duplicate parameter names
    const paramNames = validParameters.map(p => p.name.toLowerCase());
    const duplicateParams = paramNames.filter((name, index) => paramNames.indexOf(name) !== index);
    if (duplicateParams.length > 0) {
      newErrors.parameters = `Duplicate parameter names: ${duplicateParams.join(', ')}`;
    }

    if (!formData.formula.trim()) {
      newErrors.formula = 'Formula is required';
    } else if (!formulaValidation.valid) {
      newErrors.formula = formulaValidation.error || 'Invalid formula';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const functionData: Omit<SharedFunction, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      formula: formData.formula.trim(),
      parameters: validParameters.map(p => ({
        name: p.name.trim(),
        label: p.label.trim(),
        unitCategory: p.unitCategory,
        unitSymbol: p.unitSymbol,
        required: p.required !== false,
      })),
      category: formData.category.trim() || undefined,
    };

    if (isNew) {
      addFunction(functionData);
    } else {
      updateFunction(functionId, functionData);
    }

    onClose();
  }, [formData, parameters, formulaValidation, functions, functionId, isNew, addFunction, updateFunction, onClose]);

  const addParameter = () => {
    setParameters([
      ...parameters,
      { name: '', label: '', unitCategory: undefined, unitSymbol: undefined, required: true },
    ]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, updates: Partial<typeof parameters[0]>) => {
    setParameters(parameters.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  return (
    <Layout>
      <PageHeader
        title={isNew ? 'Create Function' : 'Edit Function'}
        subtitle="Define a reusable calculation function"
        actions={
          <Button variant="ghost" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Function Details">
            <div className="space-y-4">
              <Input
                label="Function Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                placeholder="e.g., m2, area, volume"
              />

              <Textarea
                label="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Describe what this function calculates..."
              />

              <Input
                label="Category (optional)"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Geometry, Material"
              />
            </div>
          </Card>

          <Card title="Parameters">
            <div className="space-y-4">
              {parameters.map((param, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      label="Parameter Name"
                      value={param.name}
                      onChange={(e) => updateParameter(index, { name: e.target.value })}
                      placeholder="e.g., width"
                    />
                    <Input
                      label="Display Label"
                      value={param.label}
                      onChange={(e) => updateParameter(index, { label: e.target.value })}
                      placeholder="e.g., Width"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => removeParameter(index)}
                    disabled={parameters.length === 1}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {errors.parameters && (
                <p className="text-sm text-destructive">{errors.parameters}</p>
              )}
              <Button variant="ghost" onClick={addParameter} className="rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Parameter
              </Button>
            </div>
          </Card>

          <Card title="Formula">
            <div className="space-y-4">
              <Textarea
                label="Formula"
                value={formData.formula}
                onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                rows={4}
                placeholder="e.g., width * height"
                error={errors.formula}
              />
              {formulaValidation.error && (
                <p className="text-sm text-destructive">{formulaValidation.error}</p>
              )}
              {formulaValidation.valid && formData.formula && (
                <p className="text-sm text-success">Formula is valid</p>
              )}
              <p className="text-xs text-md-on-surface-variant">
                Use parameter names in your formula. Example: if you have parameters &quot;width&quot; and &quot;height&quot;,
                your formula could be &quot;width * height&quot;.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <EditorActionBar justifyContent="end">
        <Button variant="ghost" onClick={onClose} className="rounded-full">
          Cancel
        </Button>
        <Button onClick={handleSave} className="rounded-full">
          <Save className="h-4 w-4 mr-2" />
          {isNew ? 'Create Function' : 'Save Changes'}
        </Button>
      </EditorActionBar>
    </Layout>
  );
}

