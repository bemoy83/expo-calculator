'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useCalculators } from '@/hooks/use-calculators';
import { defaultPackSelection, functionsUsedBy, packStatus } from '@/lib/calculator/pack';
import { useDeviceStore } from '@/lib/stores/device-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { notify } from '@/lib/stores/notifications-store';
import { downloadDataAsJSON, exportCalculatorPack } from '@/lib/utils/data-export';
import { formatPackDate } from '@/lib/calculator/format';

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

// Picks the calculators for a pack (the ones in the last pack start ticked, so new drafts
// stay out until chosen) and downloads it.
export function PackExporter({ onClose }: { onClose: () => void }) {
  const calculators = useCalculators();
  const functions = useFunctionsStore((state) => state.functions);
  const materialsCount = useMaterialsStore((state) => state.materials.length);
  const laborCount = useLaborStore((state) => state.labor.length);
  const lastExport = useDeviceStore((state) => state.lastPackExport);

  const sorted = useMemo(() => [...calculators].sort((a, b) => a.name.localeCompare(b.name)), [calculators]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(defaultPackSelection(calculators, lastExport)));
  const chosen = sorted.filter((calculator) => selected.has(calculator.id));
  const functionsCount = useMemo(() => functionsUsedBy(chosen, functions).length, [chosen, functions]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleExport = () => {
    // Keep the calculators store's order in the file.
    downloadDataAsJSON(exportCalculatorPack(calculators.filter((calculator) => selected.has(calculator.id)).map((c) => c.id)));
    notify({ message: `Calculator pack exported with ${pluralize(chosen.length, 'calculator')}.`, variant: 'success' });
    onClose();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        A pack is what staff devices load: the calculators you tick, the functions they use, and your materials
        and labor. Loading it on a device replaces that device&apos;s calculators, functions and catalogs; its
        quotes are kept. Leave out anything you&apos;re still building or testing.
      </p>
      {lastExport && (
        <p className="text-xs text-ink-muted">
          Last pack exported {formatPackDate(lastExport.exportedAt)}. Calculators added since start unticked.
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-ink">There are no calculators to export yet.</p>
      ) : (
        <fieldset>
          <div className="flex items-center justify-between gap-2 mb-2">
            <legend className="text-[12.5px] font-semibold text-ink">Calculators in the pack</legend>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(sorted.map((c) => c.id)))}>
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                None
              </Button>
            </div>
          </div>
          <ul className="max-h-[45vh] overflow-y-auto rounded-md border border-border divide-y divide-border">
            {sorted.map((calculator) => {
              const status = packStatus(calculator, lastExport);
              return (
                <li key={calculator.id}>
                  <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-hover">
                    <input
                      type="checkbox"
                      checked={selected.has(calculator.id)}
                      onChange={() => toggle(calculator.id)}
                      className="h-4 w-4 rounded-sm accent-action-solid cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-ink truncate">{calculator.name}</span>
                      {calculator.category && (
                        <span className="block text-xs text-ink-faint truncate">{calculator.category}</span>
                      )}
                    </span>
                    {status === 'new' && <Chip size="sm" variant="muted">Not in last pack</Chip>}
                    {status === 'changed' && <Chip size="sm" variant="primaryTonal">Changed since</Chip>}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <p className="text-xs text-ink-muted" aria-live="polite">
        {pluralize(chosen.length, 'calculator')}, {pluralize(functionsCount, 'function')},{' '}
        {pluralize(materialsCount, 'material')}, {pluralize(laborCount, 'labor item')}
      </p>

      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleExport} disabled={chosen.length === 0}>
          <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Export pack
        </Button>
      </div>
    </div>
  );
}
