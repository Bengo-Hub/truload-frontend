'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CURRENCIES, useSelectedCurrency } from '@/contexts/CurrencyContext';
import { Check } from 'lucide-react';

export function CurrencySwitcher() {
  const { currency, setCurrency, currencyOption } = useSelectedCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 px-2.5 hover:bg-gray-100 rounded-full text-gray-600"
        >
          <span className="text-base leading-none">{currencyOption.flag}</span>
          <span className="text-xs font-medium hidden sm:inline">{currency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {CURRENCIES.map((opt) => (
          <DropdownMenuItem
            key={opt.code}
            onClick={() => setCurrency(opt.code)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span className="text-lg leading-none">{opt.flag}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{opt.code}</span>
              <span className="text-xs text-muted-foreground ml-1.5">{opt.name}</span>
            </div>
            {currency === opt.code && (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
