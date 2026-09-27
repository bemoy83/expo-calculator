'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FunctionSquare } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/Button';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { FunctionEditorView } from '../FunctionEditorView';

// Functions live in the browser, so the one to edit comes from ?id=; without it, a new function.
function FunctionEditContent() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const exists = useFunctionsStore((state) => (id ? state.functions.some((func) => func.id === id) : true));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Deleting the function navigates away; it shouldn't flash "not found" on the way out.
  const seen = useRef(false);
  if (mounted && exists) seen.current = true;

  if (!mounted) return null;
  if (!exists && !seen.current) {
    return (
      <div className="px-4 sm:px-6 py-10">
        <EmptyState
          icon={FunctionSquare}
          title="Function not found"
          description="It may have been deleted, or the link is incomplete."
          iconSize="small"
          actions={<Button onClick={() => router.push('/functions')}>All functions</Button>}
        />
      </div>
    );
  }
  if (!exists) return null;
  // Keyed by id, so going to another function (Duplicate) starts a fresh editor.
  return <FunctionEditorView key={id ?? 'new'} functionId={id ?? 'new'} />;
}

export default function FunctionEditPage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <FunctionEditContent />
      </Suspense>
    </Layout>
  );
}
