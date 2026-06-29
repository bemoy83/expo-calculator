'use client';

import { Layout } from '@/components/Layout';
import { ModuleEditorWorkspace } from '@/components/module-editor/ModuleEditorWorkspace';
import { ModulesListView } from '@/components/module-editor/ModulesListView';
import { useModuleEditorState } from '@/components/module-editor/useModuleEditorState';
import { useCategoriesStore } from '@/lib/stores/categories-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useModulesStore } from '@/lib/stores/modules-store';

export default function ModulesPage() {
  const modules = useModulesStore((state) => state.modules);
  const addModule = useModulesStore((state) => state.addModule);
  const updateModule = useModulesStore((state) => state.updateModule);
  const deleteModule = useModulesStore((state) => state.deleteModule);
  const materials = useMaterialsStore((state) => state.materials);
  const labor = useLaborStore((state) => state.labor);
  const getAllCategories = useCategoriesStore((state) => state.getAllCategories);
  const addCategory = useCategoriesStore((state) => state.addCategory);

  const editor = useModuleEditorState({
    addModule,
    updateModule,
    materials,
    labor,
    getAllCategories,
    addCategory,
  });

  return (
    <Layout>
      {editor.editingModuleId ? (
        <ModuleEditorWorkspace editor={editor} />
      ) : (
        <ModulesListView
          modules={modules}
          onCreate={() => editor.actions.startEditing()}
          onEdit={editor.actions.startEditing}
          onDelete={deleteModule}
        />
      )}
    </Layout>
  );
}
