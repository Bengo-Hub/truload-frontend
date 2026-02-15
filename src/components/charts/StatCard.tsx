/**
 * Dashboard Stats Cards Component
 * Displays key metrics with icons, compact number formatting, and tooltips
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCompact } from '@/lib/formatters';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  /** Raw numeric value — when provided and value is long, displays compact form with tooltip */
  rawValue?: number;
  icon: LucideIcon;
  color: string;
}

export function StatCard({ title, value, rawValue, icon: Icon, color }: StatCardProps) {
  const displayValue = rawValue !== undefined && value.length > 7
    ? formatCompact(rawValue)
    : value;
  const needsTooltip = displayValue !== value;

  const valueElement = (
    <div className="text-lg font-semibold truncate sm:text-xl lg:text-2xl">
      {displayValue}
    </div>
  );

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs text-gray-600 truncate sm:text-sm">{title}</CardTitle>
        <div className={`${color} rounded-lg p-1.5 sm:p-2 shrink-0`}>
          <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
        </div>
      </CardHeader>
      <CardContent>
        {needsTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>{valueElement}</TooltipTrigger>
            <TooltipContent>
              <p>{value}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          valueElement
        )}
      </CardContent>
    </Card>
  );
}
