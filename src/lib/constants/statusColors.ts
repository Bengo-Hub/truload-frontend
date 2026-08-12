/**
 * Canonical compliance-status colours, shared across every chart/badge that represents
 * Compliant/Warning/Overloaded - the 2026-08-12 audit found the dashboard's own inline chart
 * series colours (`#10b981` emerald for Compliant, `#f59e0b` amber for Warning) didn't match
 * `StatusBadge.tsx`'s Tailwind green-500/yellow-500 used everywhere else in the app, so the same
 * status showed as two visibly different colours depending on which component rendered it.
 * `StatusBadge.tsx` is treated as the canonical source (it's the dedicated status component) -
 * these are its Tailwind green-500/yellow-500/red-500 hex equivalents.
 */
export const STATUS_COLORS = {
  compliant: '#22c55e', // Tailwind green-500 (matches StatusBadge's Compliant/Legal)
  warning: '#eab308', // Tailwind yellow-500 (matches StatusBadge's Warning)
  overloaded: '#ef4444', // Tailwind red-500 (matches StatusBadge's Overloaded)
} as const;
