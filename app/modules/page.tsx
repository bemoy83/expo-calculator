'use client';

import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { ModulesListView } from '@/components/module-editor/ModulesListView';
import { useModulesStore } from '@/lib/stores/modules-store';

// Read-only since modules became calculators: a module opens as its calculator on the
// Calculators page, where Edit turns it into a calculator of your own.
export default function ModulesPage() {
  const modules = useModulesStore((state) => state.modules);
  const deleteModule = useModulesStore((state) => state.deleteModule);
  const router = useRouter();

  return (
    <Layout>
      <ModulesListView
        modules={modules}
        onOpen={(module) => router.push(`/calculator?id=${encodeURIComponent(`module-${module.id}`)}`)}
        onDelete={deleteModule}
      />
    </Layout>
  );
}
