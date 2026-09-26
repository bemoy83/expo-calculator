'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calculator as CalculatorIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Calculator } from '@/lib/calculator/types';
import { formatPackDate } from '@/lib/calculator/format';
import { useDeviceStore } from '@/lib/stores/device-store';
import { useUseOnlyMode } from '@/hooks/use-device';

function pluralize(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

// Calculators grouped by category, alphabetically, with uncategorised ones last.
function groupByCategory(calculators: Calculator[]) {
  const groups = new Map<string, Calculator[]>();
  for (const calculator of calculators) {
    const category = calculator.category?.trim() || '';
    groups.set(category, [...(groups.get(category) ?? []), calculator]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([category, items]) => ({
      category: category || 'Other',
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function CalculatorsListView({ calculators }: { calculators: Calculator[] }) {
  const router = useRouter();
  const groups = groupByCategory(calculators);
  const newCalculator = () => router.push('/calculator/edit');
  const useOnly = useUseOnlyMode();
  const loadedPack = useDeviceStore((state) => state.loadedPack);
  const lastPackExport = useDeviceStore((state) => state.lastPackExport);
  // Which pack this device has, so an out-of-date one is easy to spot; on the device packs
  // are made on, when the last one was exported, to compare against.
  const packNote = loadedPack
    ? `Calculator pack from ${formatPackDate(loadedPack.exportedAt)}`
    : lastPackExport && !useOnly
      ? `Last pack exported ${formatPackDate(lastPackExport.exportedAt)}`
      : undefined;

  return (
    <>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Calculators</h1>
          <p className="text-xs text-ink-muted">
            {pluralize(calculators.length, 'calculator')}
            {packNote && (
              <>
                {' · '}
                <span title={loadedPack ? `Loaded ${formatPackDate(loadedPack.loadedAt)}` : undefined}>{packNote}</span>
              </>
            )}
          </p>
        </div>
        {!useOnly && (
          <Button onClick={newCalculator} className="shrink-0 self-start sm:self-auto">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            New calculator
          </Button>
        )}
      </div>

      {calculators.length === 0 && useOnly ? (
        <EmptyState
          icon={CalculatorIcon}
          title="No calculators on this device yet"
          description="Ask for a calculator pack file, then load it from Settings → Load calculator pack."
          iconSize="small"
        />
      ) : calculators.length === 0 ? (
        <EmptyState
          icon={CalculatorIcon}
          title="No calculators yet"
          description="Build one from inputs and steps, test each part as you go, and staff get one simple form."
          iconSize="small"
          actions={
            <Button onClick={newCalculator}>
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              New calculator
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.category} aria-labelledby={`category-${group.category}`}>
              <h2
                id={`category-${group.category}`}
                className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
              >
                {group.category}
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {group.items.map((calculator) => (
                  <li key={calculator.id}>
                    <CalculatorCard calculator={calculator} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function CalculatorCard({ calculator }: { calculator: Calculator }) {
  const inputCount = calculator.inputs.length;
  const partCount = calculator.parts.length;

  return (
    <Link
      href={`/calculator?id=${encodeURIComponent(calculator.id)}`}
      className="block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      <Card className="h-full p-4 hover:bg-surface-hover transition-colors">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-ink">{calculator.name}</h3>
        </div>
        {calculator.description && <p className="mt-1 text-sm text-ink-muted line-clamp-2">{calculator.description}</p>}
        <p className="mt-3 text-xs text-ink-faint">
          {pluralize(inputCount, 'input')}
          {partCount > 1 && ` · ${pluralize(partCount, 'part')}`}
        </p>
      </Card>
    </Link>
  );
}
