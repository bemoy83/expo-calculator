'use client';

import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Package, LayoutDashboard, Calculator } from 'lucide-react';
import Link from 'next/link';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useQuotesStore } from '@/lib/stores/quotes-store';

export default function Home() {
  const materialsCount = useMaterialsStore((state) => state.materials.length);
  const modulesCount = useModulesStore((state) => state.modules.length);
  const quotesCount = useQuotesStore((state) => state.quotes.length);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-md-on-surface mb-2 tracking-tight">Dashboard</h1>
        <p className="text-lg text-md-on-surface-variant">Welcome to the Event Construction Cost Estimator</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-md-on-surface-variant mb-1 uppercase tracking-wide">Materials</p>
                <p className="text-4xl font-bold text-md-on-surface tabular-nums tracking-tight">{materialsCount}</p>
            </div>
            <Package className="h-12 w-12 text-md-primary" />
          </div>
          <Link href="/materials" className="block mt-4 text-sm text-md-primary hover:text-md-primary/80 transition-smooth">
            Manage Materials →
          </Link>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-md-on-surface-variant mb-1 uppercase tracking-wide">Calculation Modules</p>
                <p className="text-4xl font-bold text-md-on-surface tabular-nums tracking-tight">{modulesCount}</p>
            </div>
            <LayoutDashboard className="h-12 w-12 text-success" />
          </div>
          <Link href="/modules" className="block mt-4 text-sm text-success hover:text-success/80 transition-smooth">
            Manage Modules →
          </Link>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-md-on-surface-variant mb-1 uppercase tracking-wide">Saved Quotes</p>
                <p className="text-4xl font-bold text-md-on-surface tabular-nums tracking-tight">{quotesCount}</p>
            </div>
            <Calculator className="h-12 w-12 text-md-primary" />
          </div>
          <Link href="/quotes" className="block mt-4 text-sm text-md-primary hover:text-md-primary/80">
            Build Quote →
          </Link>
        </Card>
      </div>

      <Card title="Quick Start Guide">
        <div className="space-y-4 text-md-on-surface">
          <div>
            <h3 className="font-semibold text-md-on-surface mb-2">1. Set Up Materials</h3>
            <p className="text-sm text-md-on-surface-variant">
              Start by adding materials that you&apos;ll reference in your calculation formulas. 
              Each material needs a unique variable name that you can use in formulas.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-md-on-surface mb-2">2. Create Calculation Modules</h3>
            <p className="text-sm text-md-on-surface-variant">
              Define reusable calculation modules with custom input fields and formulas. 
              Use variable names from fields and materials in your formulas.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-md-on-surface mb-2">3. Build Quotes</h3>
            <p className="text-sm text-md-on-surface-variant">
              Combine multiple modules to create comprehensive quotes. 
              All calculations update automatically as you change values.
            </p>
          </div>
        </div>
      </Card>
    </Layout>
  );
}

