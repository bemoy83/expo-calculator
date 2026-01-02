'use client';

interface FunctionEditorHeaderProps {
  functionId: string | null;
}

export function FunctionEditorHeader({ functionId }: FunctionEditorHeaderProps) {
  if (!functionId) return null;

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
        {functionId === 'new' ? 'Create Function' : 'Edit Function'}
      </h1>
      <p className="text-lg text-md-on-surface-variant">Define → Configure → Calculate</p>
    </div>
  );
}


