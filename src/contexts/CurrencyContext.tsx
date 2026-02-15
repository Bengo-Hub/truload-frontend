'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';

export type CurrencyCode = 'KES' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyOption {
  code: CurrencyCode;
  name: string;
  flag: string;
  symbol: string;
  locale: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪', symbol: 'KES', locale: 'en-KE' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', symbol: '£', locale: 'en-GB' },
];

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  currencyOption: CurrencyOption;
}

const STORAGE_KEY = 'truload-currency';

function getInitialCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'KES';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && CURRENCIES.some((c) => c.code === stored)) {
    return stored as CurrencyCode;
  }
  return 'KES';
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(getInitialCurrency);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  const currencyOption = useMemo(
    () => CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0],
    [currency]
  );

  const value = useMemo(
    () => ({ currency, setCurrency, currencyOption }),
    [currency, setCurrency, currencyOption]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useSelectedCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useSelectedCurrency must be used within a CurrencyProvider');
  }
  return context;
}
