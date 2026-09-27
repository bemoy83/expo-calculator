'use client';

import { Suspense, useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { FunctionsBrowse } from '@/components/function-editor/FunctionsBrowse';

// Catalog › Functions: browse and try functions; /functions/edit edits one.
export default function FunctionsPage() {
  // The stores load from localStorage, so show them only after mount (prerender = first render).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Layout>
      {/* The chosen function is read from ?id=, which a static export reads on the client. */}
      <Suspense fallback={null}>{mounted && <FunctionsBrowse />}</Suspense>
    </Layout>
  );
}
