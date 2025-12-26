'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { TemplateEditorClient } from './TemplateEditorClient';

export default function TemplateEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Template not found</h1>
          <p className="text-muted-foreground mb-4">
            No template ID provided.
          </p>
          <button
            className="px-4 py-2 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 transition-smooth"
            onClick={() => router.push('/templates')}
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  return <TemplateEditorClient templateId={id} />;
}

