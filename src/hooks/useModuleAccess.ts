/**
 * Centralized module access hook.
 * Single source of truth for tenant type and module-based authorization.
 *
 * Commercial weighing tenants get a restricted module set:
 *   dashboard, weighing, reporting, users, setup_weighing_metadata, setup_settings
 *
 * Enforcement tenants get all modules.
 * Platform owners (superusers) bypass module restrictions.
 *
 * Usage:
 *   const { isCommercial, isEnforcement, hasModule } = useModuleAccess();
 *   if (hasModule('cases')) { ... }
 */

import { useAuthStore } from '@/stores/auth.store';
import { useSearchParams } from 'next/navigation';

export function useModuleAccess() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();

  const tenantType = user?.tenantType ?? 'AxleLoadEnforcement';
  // Allow ?commercial=true query param override for testing/demo purposes
  const isCommercial =
    tenantType === 'CommercialWeighing' ||
    user?.isCommercialTenant === true ||
    searchParams.get('commercial') === 'true';
  const isEnforcement = !isCommercial;
  const isSuperUser = user?.isSuperUser === true;
  const enabledModules = user?.enabledModules ?? [];
  const hasModuleFilter = enabledModules.length > 0;

  /**
   * Check if a module is enabled for the current tenant.
   * Superusers always have access. If no module list is set, all modules are enabled.
   */
  function hasModule(moduleKey: string): boolean {
    if (isSuperUser) return true;
    if (!hasModuleFilter) return true;
    return enabledModules.includes(moduleKey);
  }

  return {
    // Core flags
    isCommercial,
    isEnforcement,
    isSuperUser,
    tenantType,
    enabledModules,

    // Module check function
    hasModule,

    // Convenience flags for common checks
    showCases: isEnforcement && hasModule('cases'),
    showCaseManagement: isEnforcement && hasModule('case_management'),
    showProsecution: isEnforcement && hasModule('prosecution'),
    showSpecialReleases: isEnforcement && hasModule('special_releases'),
    showYard: isEnforcement, // yard is part of weighing for enforcement
    showTags: isEnforcement, // tags are enforcement-only
    showShifts: hasModule('shifts'),
    showTechnical: hasModule('technical'),
    showFinancialInvoices: hasModule('financial_invoices'),
    showFinancialReceipts: hasModule('financial_receipts'),
    showFinancial: hasModule('financial_invoices') || hasModule('financial_receipts'),
    // Axle configs used by both enforcement and commercial for vehicle classification
    showSetupAxle: hasModule('setup_axle'),
    showSetupActs: isEnforcement && hasModule('setup_acts'),
    showSetupSystemConfig: hasModule('setup_system_config'),
    // Commercial-specific modules
    showTareRegister: isCommercial && hasModule('tare_register'),
    showToleranceSettings: isCommercial && hasModule('setup_tolerance'),
    showCommercialReports: isCommercial && hasModule('reporting'),
  };
}
