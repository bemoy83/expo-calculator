'use client';

import dynamic from 'next/dynamic';

// The editor is loaded when a page that has one is opened, not with the app's own code: it's
// CodeMirror, around 50 kB gzipped. Types come from the real file (a type import costs nothing).
export type { FormulaEditorHandle } from './FormulaEditor';

export const FormulaEditor = dynamic(() => import('./FormulaEditor'), {
  ssr: false,
  loading: () => <div className="min-h-[1.5em]" aria-hidden="true" />,
});
