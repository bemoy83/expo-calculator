'use client';

import { ComputedOutputsManager } from '@/components/module-editor/ComputedOutputsManager';
import { FieldsManager } from '@/components/module-editor/FieldsManager';
import { FormulaBuilder } from '@/components/module-editor/FormulaBuilder';
import { ModuleDetailsCard } from '@/components/module-editor/ModuleDetailsCard';
import { ModuleEditorHeader } from '@/components/module-editor/ModuleEditorHeader';
import { ModuleTestPanel } from '@/components/module-editor/ModuleTestPanel';
import type { ModuleEditorState } from '@/components/module-editor/useModuleEditorState';

interface ModuleEditorWorkspaceProps {
  editor: ModuleEditorState;
}

// Left: what the module asks for (details, fields, computed outputs). Right, sticky: the
// formula and a live test with sample values, so every edit is checked against real numbers.
export function ModuleEditorWorkspace({ editor }: ModuleEditorWorkspaceProps) {
  return (
    <>
      <ModuleEditorHeader
        editingModuleId={editor.editingModuleId}
        moduleName={editor.formData.name}
        formulaValid={editor.formulaValidation.valid}
        formulaError={editor.formulaValidation.error}
        onCancel={editor.actions.cancelEditing}
        onSubmit={editor.actions.handleSubmit}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-5 items-start pb-10">
        <div className="min-w-0 space-y-6">
          <ModuleDetailsCard
            formData={editor.formData}
            errors={editor.errors}
            onFormDataChange={(updates) => editor.actions.setFormData({ ...editor.formData, ...updates })}
            getAllCategories={editor.getAllCategories}
            addCategory={editor.addCategory}
          />

          <FieldsManager
            fields={editor.fields}
            expandedFields={editor.expandedFields}
            fieldErrors={editor.fieldErrors}
            onToggleExpanded={editor.fieldActions.toggleFieldExpanded}
            onUpdateField={editor.fieldActions.updateField}
            onRemoveField={editor.fieldActions.removeField}
            onReorder={editor.fieldActions.handleReorderFields}
            onAddField={editor.fieldActions.addField}
            setFieldRef={editor.fieldActions.setFieldRef}
          />

          <ComputedOutputsManager
            computedOutputs={editor.computedOutputs}
            fields={editor.fields}
            materials={editor.materials}
            labor={editor.labor}
            onUpdateOutput={editor.computedOutputActions.updateComputedOutput}
            onRemoveOutput={editor.computedOutputActions.removeComputedOutput}
            onAddOutput={editor.computedOutputActions.addComputedOutput}
            errors={editor.computedOutputErrors}
            onValidationError={editor.computedOutputActions.setComputedOutputValidationError}
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-sticky-offset lg:max-h-[calc(100vh-var(--app-header-h)-3rem)] lg:overflow-y-auto lg:pr-1">
          <FormulaBuilder {...editor.formulaBuilderProps} />
          <ModuleTestPanel
            key={editor.editingModuleId ?? 'none'}
            fields={editor.fields}
            formula={editor.formData.formula}
            computedOutputs={editor.computedOutputs}
            materials={editor.materials}
            labor={editor.labor}
          />
        </div>
      </div>
    </>
  );
}
