import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'NOK' | 'SEK' | 'DKK' | 'CAD' | 'AUD';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    NOK: 'kr',
    SEK: 'kr',
    DKK: 'kr',
    CAD: 'C$',
    AUD: 'A$',
};

const CURRENCY_NAMES: Record<Currency, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    NOK: 'Norwegian Krone',
    SEK: 'Swedish Krona',
    DKK: 'Danish Krone',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
};

interface CurrencyStore {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    formatCurrency: (amount: number) => string;
    getCurrencySymbol: () => string;
    getCurrencyName: () => string;
    getAllCurrencies: () => Array<{ code: Currency; name: string; symbol: string }>;
}

export const useCurrencyStore = create<CurrencyStore>()(
    persist(
        (set, get) => ({
            currency: 'USD',
            setCurrency: (currency) => set({ currency }),
            formatCurrency: (amount: number) => {
                const symbol = CURRENCY_SYMBOLS[get().currency];
                // For currencies like NOK/SEK/DKK, symbol goes after the amount
                if (['NOK', 'SEK', 'DKK'].includes(get().currency)) {
                    return `${amount.toFixed(2)} ${symbol}`;
                }
                return `${symbol}${amount.toFixed(2)}`;
            },
            getCurrencySymbol: () => CURRENCY_SYMBOLS[get().currency],
            getCurrencyName: () => CURRENCY_NAMES[get().currency],
            getAllCurrencies: () => {
                return Object.keys(CURRENCY_SYMBOLS).map((code) => ({
                    code: code as Currency,
                    name: CURRENCY_NAMES[code as Currency],
                    symbol: CURRENCY_SYMBOLS[code as Currency],
                }));
            },
        }),
        { name: 'currency-store' }
    )
);

