'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TemplateEditorClient } from './TemplateEditorClient';

function TemplateEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <div className="min-h-screen bg-md-surface text-md-on-surface flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-md-on-surface mb-2">Template not found</h1>
          <p className="text-md-on-surface-variant mb-4">
            No template ID provided.
          </p>
          <button
            className="px-4 py-2 rounded-full bg-md-primary text-md-on-primary hover:bg-md-primary/90 transition-smooth"
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

export default function TemplateEditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-md-surface text-md-on-surface flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-md-on-surface-variant">Loading template editor...</p>
        </div>
      </div>
    }>
      <TemplateEditorContent />
    </Suspense>
  );
}

