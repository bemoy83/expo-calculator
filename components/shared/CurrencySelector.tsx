'use client';

import { Select } from '@/components/ui/Select';
import { useCurrencyStore } from '@/lib/stores/currency-store';

export function CurrencySelector() {
    const currency = useCurrencyStore((state) => state.currency);
    const setCurrency = useCurrencyStore((state) => state.setCurrency);
    const getAllCurrencies = useCurrencyStore((state) => state.getAllCurrencies);

    const currencies = getAllCurrencies();

    return (
        <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as typeof currency)}
            options={currencies.map((curr) => ({
                value: curr.code,
                label: `${curr.name} (${curr.symbol})`,
            }))}
        />
    );
}

