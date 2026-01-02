'use client';

interface ModuleEditorHeaderProps {
  editingModuleId: string | null;
}

export function ModuleEditorHeader({ editingModuleId }: ModuleEditorHeaderProps) {
  if (!editingModuleId) return null;

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
        {editingModuleId === 'new' ? 'Create Module' : 'Edit Module'}
      </h1>
      <p className="text-lg text-md-on-surface-variant">Define → Configure → Calculate</p>
    </div>
  );
}










