'use client';

import { ComputedOutputsManager } from '@/components/module-editor/ComputedOutputsManager';
import { FieldsManager } from '@/components/module-editor/FieldsManager';
import { FormulaBuilder } from '@/components/module-editor/FormulaBuilder';
import { ModuleDetailsCard } from '@/components/module-editor/ModuleDetailsCard';
import { ModuleEditorActions } from '@/components/module-editor/ModuleEditorActions';
import { ModuleEditorHeader } from '@/components/module-editor/ModuleEditorHeader';
import { ModulePreview } from '@/components/module-editor/ModulePreview';
import type { ModuleEditorState } from '@/components/module-editor/useModuleEditorState';

interface ModuleEditorWorkspaceProps {
  editor: ModuleEditorState;
}

export function ModuleEditorWorkspace({ editor }: ModuleEditorWorkspaceProps) {
  return (
    <>
      <ModuleEditorHeader editingModuleId={editor.editingModuleId} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-24">
        <div className="lg:col-span-3 space-y-6">
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

        <div className="lg:col-span-2">
          <FormulaBuilder {...editor.formulaBuilderProps} />
        </div>
      </div>

      {editor.preview.showPreview && (
        <ModulePreview
          formData={editor.formData}
          fields={editor.fields}
          previewFieldValues={editor.preview.previewFieldValues}
          previewCalculatedCost={editor.preview.previewCalculatedCost}
          previewError={editor.preview.previewError}
          materials={editor.materials}
          onClose={editor.preview.closePreview}
          onFieldValueChange={editor.preview.setFieldValue}
        />
      )}

      <ModuleEditorActions
        editingModuleId={editor.editingModuleId}
        fields={editor.fields}
        formulaValidationValid={editor.formulaValidation.valid}
        onAddField={editor.fieldActions.addField}
        onAddComputedOutput={editor.computedOutputActions.addComputedOutput}
        onPreview={editor.actions.initializePreview}
        onCancel={editor.actions.cancelEditing}
        onSubmit={editor.actions.handleSubmit}
      />
    </>
  );
}
