'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { normalizePropertyValue, propertyValueInUnit } from '@/lib/catalog/prices';
import type { MaterialProperty } from '@/lib/types';
import { getAllUnitSymbols } from '@/lib/units';
import { formatDisplayNumber, generateId, labelToVariableName } from '@/lib/utils';

// Common "per" units besides the measurement units: count units are labels, never converted.
const COUNT_UNITS = ['pcs', 'sheet', 'bucket', 'roll', 'pack', 'pallet'];

/** The name a price gets from its unit until one is typed: price_per_m2, price_per_sheet. */
export function suggestPriceName(unit: string): string {
  const cleaned = labelToVariableName(unit.replace('²', '2').replace('³', '3')).toLowerCase();
  return cleaned ? `price_per_${cleaned}` : 'price_per_unit';
}

// Adds or edits one of a material's other prices: an amount per a unit, under a name formulas
// use (sheets.price_per_m2). Prices per mm/cm/l are stored per base unit (see prices.ts).
export function PriceForm({
  price,
  validateName,
  onSave,
  onCancel,
}: {
  /** The price to edit; a new one when undefined. */
  price?: MaterialProperty;
  /** An error for the name, or null when it can be used. */
  validateName: (name: string, id?: string) => string | null;
  onSave: (price: MaterialProperty) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [per, setPer] = useState(price?.unitSymbol ?? '');
  const [amount, setAmount] = useState(() => {
    const shown = price ? propertyValueInUnit(price) : undefined;
    return shown === undefined ? '' : formatDisplayNumber(shown);
  });
  const [name, setName] = useState(price?.name ?? '');
  const [nameTouched, setNameTouched] = useState(!!price);
  const [error, setError] = useState<string | null>(null);
  const shownName = nameTouched ? name : suggestPriceName(per);

  const save = () => {
    const finalName = shownName.trim();
    const nameError = finalName === 'price' ? '“price” is the default price; name this one e.g. price_per_m2.' : validateName(finalName, price?.id);
    const number = Number(amount);
    if (nameError) return setError(nameError);
    if (amount.trim() === '' || !Number.isFinite(number) || number < 0) return setError('Enter the price as a number.');
    const unitSymbol = per.trim() || undefined;
    onSave({
      id: price?.id ?? generateId(),
      name: finalName,
      type: 'price',
      value: number,
      unitSymbol,
      ...normalizePropertyValue(number, 'price', unitSymbol),
    });
  };

  return (
    <div className="my-2 p-3 rounded-md border border-border space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Price"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError(null);
          }}
          className="font-numeric"
        />
        <div>
          <Input
            label="Per"
            value={per}
            list={`${id}-units`}
            placeholder="m2, sheet, pallet…"
            onChange={(event) => setPer(event.target.value)}
          />
          <datalist id={`${id}-units`}>
            {[...getAllUnitSymbols(), ...COUNT_UNITS.filter((unit) => !getAllUnitSymbols().includes(unit))].map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </div>
      </div>
      <Input
        label="Name in formulas"
        value={shownName}
        className="font-numeric"
        onChange={(event) => {
          setNameTouched(true);
          setName(event.target.value.trim());
          setError(null);
        }}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={save}>
          {price ? 'Save price' : 'Add price'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
