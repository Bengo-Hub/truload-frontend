/**
 * Weighing Utility Functions
 *
 * Shared utilities for compliance calculation, status determination, and formatting.
 * Based on Kenya Traffic Act Cap 403 and EAC Act 2016 requirements.
 */

import { AxleGroupResult, ComplianceStatus, ScaleStatus } from '@/types/weighing';

// ============================================================================
// Status Color Utilities
// ============================================================================

/**
 * Get CSS classes for compliance status badge/indicator
 */
export function getStatusColor(status: ComplianceStatus): string {
  switch (status) {
    case 'LEGAL':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'WARNING':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'OVERLOAD':
      return 'text-red-600 bg-red-50 border-red-200';
  }
}

/**
 * Get CSS classes for compliance badge (solid background)
 */
export function getStatusBadgeColor(status: ComplianceStatus): string {
  switch (status) {
    case 'LEGAL':
      return 'bg-green-500 hover:bg-green-500 text-white';
    case 'WARNING':
      return 'bg-yellow-500 hover:bg-yellow-500 text-white';
    case 'OVERLOAD':
      return 'bg-red-500 hover:bg-red-500 text-white';
  }
}

/**
 * Get scale status indicator color
 */
export function getScaleStatusColor(status: ScaleStatus): string {
  switch (status) {
    case 'connected':
      return 'text-green-500';
    case 'disconnected':
      return 'text-red-500';
    case 'unstable':
      return 'text-yellow-500';
    case 'error':
      return 'text-red-600';
    case 'calibrating':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
}

// ============================================================================
// Compliance Calculation Utilities
// ============================================================================

/**
 * Calculate overall compliance status from group results and GVW
 */
export function calculateOverallStatus(
  groupResults: AxleGroupResult[],
  gvwOverloadKg: number
): ComplianceStatus {
  const hasOverload = groupResults.some((g) => g.status === 'OVERLOAD') || gvwOverloadKg > 0;
  const hasWarning = groupResults.some((g) => g.status === 'WARNING');

  if (hasOverload) return 'OVERLOAD';
  if (hasWarning) return 'WARNING';
  return 'LEGAL';
}

/**
 * Calculate GVW from axle group results
 */
export function calculateGVW(groupResults: AxleGroupResult[]): number {
  return groupResults.reduce((sum, g) => sum + g.measuredKg, 0);
}

/**
 * Calculate Pavement Damage Factor using Fourth Power Law
 * PDF = (Actual/Permissible)^4
 */
export function calculatePDF(measuredKg: number, permissibleKg: number): number {
  if (permissibleKg <= 0) return 0;
  const ratio = measuredKg / permissibleKg;
  return Math.pow(ratio, 4);
}

/**
 * Calculate tolerance based on axle count (Kenya Traffic Act Cap 403)
 * - Single axle: 5% tolerance
 * - Grouped axles (Tandem, Tridem): 0% tolerance
 * - GVW: 0% tolerance
 */
export function calculateTolerance(permissibleKg: number, axleCount: number): number {
  if (axleCount === 1) {
    return Math.floor(permissibleKg * 0.05); // 5% for single axles
  }
  return 0; // 0% for grouped axles
}

/**
 * Determine if overload qualifies for auto special release (≤200kg)
 */
export function isWithinOperationalTolerance(overloadKg: number, operationalToleranceKg: number = 200): boolean {
  return overloadKg > 0 && overloadKg <= operationalToleranceKg;
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format weight in kg with thousands separator
 */
export function formatWeight(weightKg: number): string {
  return weightKg.toLocaleString();
}

/**
 * Format weight with sign for overload display
 */
export function formatOverload(overloadKg: number): string {
  if (overloadKg <= 0) return '-';
  return `+${overloadKg.toLocaleString()}`;
}

/**
 * Format currency (USD)
 */
export function formatFeeUsd(feeUsd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(feeUsd);
}

/**
 * Format PDF value to 2 decimal places
 */
export function formatPDF(pdf: number): string {
  return pdf.toFixed(2);
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: ComplianceStatus, isPending: boolean = false): string {
  if (isPending) return 'PENDING';
  return status;
}

/**
 * Get decision status message
 */
export function getDecisionMessage(status: ComplianceStatus): string {
  switch (status) {
    case 'LEGAL':
      return 'LEGAL - COMPLIANT';
    case 'WARNING':
      return 'WARNING - WITHIN TOLERANCE';
    case 'OVERLOAD':
      return 'PROHIBITED - OVERLOADED';
  }
}

/**
 * Get axle type display label
 */
export function getAxleTypeLabel(axleType: string): string {
  const labels: Record<string, string> = {
    Steering: 'Steering',
    SingleDrive: 'Single Drive',
    Tandem: 'Tandem (2)',
    Tridem: 'Tridem (3)',
    Quad: 'Quad (4)',
    Tag: 'Tag',
    Unknown: 'Unknown',
  };
  return labels[axleType] || axleType;
}

// ============================================================================
// Weighing Step Utilities
// ============================================================================

export const WEIGHING_STEPS = [
  { id: 'capture' as const, title: 'Capture', description: 'Scale test, images & plate entry' },
  { id: 'vehicle' as const, title: 'Vehicle', description: 'Details, weights & compliance' },
  { id: 'decision' as const, title: 'Decision', description: 'Take action' },
];

/**
 * Get step index from step id
 */
export function getStepIndex(stepId: string): number {
  return WEIGHING_STEPS.findIndex((s) => s.id === stepId);
}

/**
 * Check if step is complete based on current step
 */
export function isStepComplete(stepId: string, currentStepId: string): boolean {
  const stepIndex = getStepIndex(stepId);
  const currentIndex = getStepIndex(currentStepId);
  return stepIndex < currentIndex;
}
