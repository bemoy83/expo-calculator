'use client';

import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ComputedOutput, Field, SharedFunction, Material } from '@/lib/types';
import { Plus } from 'lucide-react';
import { generateComputedOutputVariableName, validateComputedOutputVariableName, validateComputedOutputExpression } from '@/lib/utils/computed-outputs';
import { getUnitCategory, getUnitsByCategory, UnitCategory } from '@/lib/units';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { ComputedOutputItem } from '@/components/module-editor/ComputedOutputItem';

interface ComputedOutputsManagerProps {
    computedOutputs: ComputedOutput[];
    fields: Field[];
    materials: Material[]; // Materials needed to validate field property references
    onUpdateOutput: (id: string, updates: Partial<ComputedOutput>) => void;
    onRemoveOutput: (id: string) => void;
    onAddOutput: () => void;
    errors?: Record<string, Record<string, string>>;
    onValidationError?: (id: string, field: string, error: string | undefined) => void;
}

export function ComputedOutputsManager({
    computedOutputs,
    fields,
    materials,
    onUpdateOutput,
    onRemoveOutput,
    onAddOutput,
    errors = {},
    onValidationError,
}: ComputedOutputsManagerProps) {
    const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(new Set());
    const formulaTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

    const toggleExpanded = useCallback((outputId: string) => {
        setExpandedOutputs((prev) => {
            const updated = new Set(prev);
            if (updated.has(outputId)) {
                updated.delete(outputId);
            } else {
                updated.add(outputId);
            }
            return updated;
        });
    }, []);

    const handleLabelChange = useCallback(
        (outputId: string, label: string) => {
            const output = computedOutputs.find((o) => o.id === outputId);
            if (!output) return;

            const newVariableName = generateComputedOutputVariableName(
                label,
                computedOutputs.filter((o) => o.id !== outputId),
                fields
            );

            onUpdateOutput(outputId, {
                label,
                variableName: newVariableName,
            });

            // Validate the generated variable name and show errors if any
            if (onValidationError && newVariableName) {
                const validation = validateComputedOutputVariableName(
                    newVariableName,
                    computedOutputs.filter((o) => o.id !== outputId),
                    fields
                );
                if (validation.valid) {
                    onValidationError(outputId, 'variableName', undefined);
                } else {
                    onValidationError(outputId, 'variableName', validation.error);
                }
            }
        },
        [computedOutputs, fields, onUpdateOutput, onValidationError]
    );

    const handleVariableNameChange = useCallback(
        (outputId: string, variableName: string) => {
            const output = computedOutputs.find((o) => o.id === outputId);
            if (!output) return;

            // Always update the variable name so user can see what they typed
            onUpdateOutput(outputId, { variableName });

            // Validate and report errors in real-time
            const validation = validateComputedOutputVariableName(
                variableName,
                computedOutputs.filter((o) => o.id !== outputId),
                fields
            );

            if (onValidationError) {
                if (validation.valid) {
                    onValidationError(outputId, 'variableName', undefined);
                } else {
                    onValidationError(outputId, 'variableName', validation.error);
                }
            }
        },
        [computedOutputs, fields, onUpdateOutput, onValidationError]
    );

    const handleExpressionChange = useCallback(
        (outputId: string, expression: string) => {
            onUpdateOutput(outputId, { expression });
        },
        [onUpdateOutput]
    );

    const handleUnitChange = useCallback(
        (outputId: string, unitSymbol: string) => {
            const unitCategory = unitSymbol ? getUnitCategory(unitSymbol) : undefined;
            onUpdateOutput(outputId, { unitSymbol: unitSymbol || undefined, unitCategory });
        },
        [onUpdateOutput]
    );

    const unitCategoryOptions: Array<{ value: UnitCategory; label: string }> = [
        { value: 'length', label: 'Length' },
        { value: 'area', label: 'Area' },
        { value: 'volume', label: 'Volume' },
        { value: 'weight', label: 'Weight' },
        { value: 'percentage', label: 'Percentage' },
        { value: 'count', label: 'Count' },
    ];

    const outputFunctions = useFunctionsStore.getState().functions;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Computed Outputs</h2>
                <Button size="sm" onClick={onAddOutput} className="rounded-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Computed Output
                </Button>
            </div>

            {computedOutputs.length === 0 ? (
                <Card>
                    <div className="text-center py-6">
                        <p className="text-sm text-md-on-surface-variant mb-3">
                            Computed outputs are named expressions that calculate values before your main formula.
                            They can be linked to other modules and displayed in quote summaries.
                        </p>
                        <Button size="sm" onClick={onAddOutput} className="rounded-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Computed Output
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="flex flex-col gap-3">
                    {computedOutputs.map((output) => {
                        const isExpanded = expandedOutputs.has(output.id);
                        const outputError = errors[output.id] || {};
                        const unitSymbolOptions = output.unitCategory ? getUnitsByCategory(output.unitCategory) : [];

                        // Validate expression (not using hooks in map)
                        // Pass all computed outputs and current output ID to check order
                        const expressionValidation = validateComputedOutputExpression(
                            output.expression,
                            fields,
                            computedOutputs, // Pass all outputs to check order
                            outputFunctions,
                            materials, // Pass materials to validate field property references
                            output.id // Pass current output ID to check if references are to previous outputs
                        );

                        // Variable name validation
                        const variableNameValidation = validateComputedOutputVariableName(
                            output.variableName,
                            computedOutputs.filter((o) => o.id !== output.id),
                            fields
                        );

                        return (
                            <ComputedOutputItem
                                key={output.id}
                                output={output}
                                isExpanded={isExpanded}
                                outputError={outputError}
                                unitCategoryOptions={unitCategoryOptions}
                                unitSymbolOptions={unitSymbolOptions}
                                variableNameValidation={variableNameValidation}
                                expressionValidation={expressionValidation}
                                fields={fields}
                                functions={outputFunctions}
                                computedOutputs={computedOutputs}
                                onToggle={() => toggleExpanded(output.id)}
                                onRemove={() => onRemoveOutput(output.id)}
                                onLabelChange={(label) => handleLabelChange(output.id, label)}
                                onVariableNameChange={(variableName) => handleVariableNameChange(output.id, variableName)}
                                onDescriptionChange={(description) => onUpdateOutput(output.id, { description: description || undefined })}
                                onUnitCategoryChange={(unitCategory) =>
                                    onUpdateOutput(output.id, {
                                        unitCategory,
                                        unitSymbol: undefined, // Reset unit symbol when category changes
                                    })
                                }
                                onUnitSymbolChange={(unitSymbol) => handleUnitChange(output.id, unitSymbol)}
                                onExpressionChange={(expression) => handleExpressionChange(output.id, expression)}
                                onShowInQuoteChange={(showInQuote) => onUpdateOutput(output.id, { showInQuote })}
                                setTextareaRef={(el) => {
                                    formulaTextareaRefs.current[output.id] = el;
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
