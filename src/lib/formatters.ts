/**
 * Format large numbers into compact form (e.g., 1500 → "1.5K", 2500000 → "2.5M").
 * Numbers below 10,000 are returned with locale formatting (e.g., "1,500").
 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000)
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 10_000)
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return value.toLocaleString();
}

/**
 * Format a number with full locale formatting (e.g., 1500000 → "1,500,000").
 */
export function formatFullNumber(value: number): string {
  return value.toLocaleString();
}
