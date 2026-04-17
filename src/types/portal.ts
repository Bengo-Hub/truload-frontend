/**
 * Portal Types
 *
 * Type definitions for the Transporter Portal, matching backend DTOs.
 */

// ============================================================================
// Portal Registration & Auth
// ============================================================================

export interface PortalRegistrationRequest {
  transporterName: string;
  contactEmail: string;
  contactPhone: string;
  password: string;
  taxId?: string;
}

export interface PortalRegistrationResponse {
  id: string;
  transporterName: string;
  contactEmail: string;
  status: 'pending' | 'active' | 'suspended';
}

// ============================================================================
// Portal Weighing
// ============================================================================

export interface PortalWeighing {
  id: string;
  ticketNumber: string;
  weighedAt: string;
  vehicleRegNumber: string;
  organizationName: string;
  stationName: string;
  tareWeightKg: number;
  grossWeightKg: number;
  netWeightKg: number;
  cargoType?: string;
  cargoDescription?: string;
  consignmentNumber?: string;
  driverName?: string;
  status: 'first_weight' | 'completed' | 'voided';
  pdfAvailable: boolean;
}

export interface PortalWeighingDetail extends PortalWeighing {
  sourceLocation?: string;
  destinationLocation?: string;
  firstWeighAt?: string;
  secondWeighAt?: string;
  remarks?: string;
  vehicleType?: string;
  attachments?: { id: string; name: string; url: string }[];
}

export interface PortalWeighingListResponse {
  items: PortalWeighing[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface PortalWeighingFilters {
  pageNumber?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  vehicleRegNo?: string;
  organizationId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Portal Vehicle
// ============================================================================

export interface PortalVehicle {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  lastTareWeightKg?: number;
  lastTareDate?: string;
  tareExpiryDate?: string;
  tareExpired: boolean;
  totalTrips: number;
}

export interface PortalVehicleWeightTrend {
  date: string;
  netWeightKg: number;
  grossWeightKg: number;
  tareWeightKg: number;
  ticketNumber: string;
}

// ============================================================================
// Portal Driver
// ============================================================================

export interface PortalDriver {
  id: string;
  name: string;
  idNumber: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseValid: boolean;
  tripCount: number;
  avgPayloadKg: number;
}

export interface PortalDriverPerformance {
  driverId: string;
  name: string;
  totalTrips: number;
  totalNetWeightKg: number;
  avgTurnaroundMinutes: number;
  tripsPerDay: { date: string; count: number }[];
}

// ============================================================================
// Portal Consignment
// ============================================================================

export interface PortalConsignment {
  id: string;
  consignmentNumber: string;
  cargoType: string;
  originLocation: string;
  destinationLocation: string;
  expectedWeightKg?: number;
  actualWeightKg?: number;
  status: string;
  createdAt: string;
}

// ============================================================================
// Portal Subscription
// ============================================================================

export type SubscriptionTier = 'basic' | 'standard' | 'premium';

export interface PortalSubscription {
  id: string;
  planName: string;
  tier: SubscriptionTier;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  startDate: string;
  endDate?: string;
  features: string[];
  maxVehicles?: number;
  maxDrivers?: number;
  reportsAccess: string[];
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: string;
  features: string[];
  maxVehicles: number | 'Unlimited';
  maxDrivers: number | 'Unlimited';
  reportsAccess: string[];
}

// ============================================================================
// Portal Dashboard
// ============================================================================

export interface PortalDashboardStats {
  todayTrips: number;
  monthlyTonnage: number;
  pendingTickets: number;
  activeVehicles: number;
  activeDrivers: number;
}
