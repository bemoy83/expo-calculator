import { Banknote, Hash, ListOrdered, Percent } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { displayUnit } from '@/lib/calculator/format';
import type { CalculatorStep, StepFormat } from '@/lib/calculator/types';
import { getAllUnitSymbols, getUnitCategory } from '@/lib/units';

// An icon per format; the chosen one also shows its name, so the control fits any width.
const FORMATS: Array<{ value: StepFormat; label: string; Icon: typeof Hash }> = [
  { value: 'number', label: 'Number', Icon: Hash },
  { value: 'money', label: 'Money', Icon: Banknote },
  { value: 'count', label: 'Count', Icon: ListOrdered },
  { value: 'percent', label: 'Percent', Icon: Percent },
];

function formatOptions(selected: StepFormat) {
  return FORMATS.map(({ value, label, Icon }) => ({
    value,
    title: label,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
        <span className={value === selected ? undefined : 'sr-only'}>{label}</span>
      </span>
    ),
  }));
}

// How a step's value is shown: as a number, money, a count or a percent, and in what unit.
export function StepFormatControls({ id, step, onChange }: { id: string; step: CalculatorStep; onChange: (step: CalculatorStep) => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
      <div>
        <span id={`${id}-format`} className="mb-1.5 block text-xs text-ink-muted">
          Shows as
        </span>
        <Segmented
          block
          aria-labelledby={`${id}-format`}
          className="!h-[42px]"
          options={formatOptions(step.format ?? 'number')}
          value={step.format ?? 'number'}
          onChange={(format) => onChange({ ...step, format })}
        />
      </div>
      {/* Money and percent fix the unit; the field stays so the row keeps its shape. */}
      {step.format === 'money' || step.format === 'percent' ? (
        <Select label="Unit" disabled value="" options={[{ value: '', label: step.format === 'money' ? 'kr' : '%' }]} />
      ) : (
        <Select
          label="Unit"
          value={step.unitSymbol ?? ''}
          options={[
            { value: '', label: 'No unit' },
            ...getAllUnitSymbols().map((symbol) => ({ value: symbol, label: displayUnit(symbol) ?? symbol })),
            ...(step.unitSymbol && !getAllUnitSymbols().includes(step.unitSymbol)
              ? [{ value: step.unitSymbol, label: `${step.unitSymbol} (label only)` }]
              : []),
          ]}
          onChange={(event) => {
            const unitSymbol = event.target.value || undefined;
            onChange({
              ...step,
              unitSymbol,
              unitCategory: unitSymbol ? getUnitCategory(unitSymbol) : undefined,
              unitIsLabel: undefined,
            });
          }}
        />
      )}
    </div>
  );
}
