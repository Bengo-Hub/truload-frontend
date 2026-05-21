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

export interface PortalFeatureAccess {
  multiSiteAccess: boolean;
  dataExport: boolean;
  driverReports: boolean;
  vehicleTrends: boolean;
  apiAccess: boolean;
  analytics: boolean;
  consignmentTracking: boolean;
}

/** Matches the backend PortalSubscriptionDto exactly. */
export interface PortalSubscription {
  status: string;
  planName: string | null;
  /** Resolved tier derived from plan name: basic | standard | premium */
  tier: SubscriptionTier;
  /** How many months back the transporter can view weighings. */
  historyMonths: number;
  /** Max active vehicles; -1 = unlimited */
  maxVehicles: number;
  /** Max active drivers; -1 = unlimited */
  maxDrivers: number;
  expiresAt?: string | null;
  features: PortalFeatureAccess;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: string;
  features: string[];
  maxVehicles: number | 'Unlimited';
  maxDrivers: number | 'Unlimited';
}

// ============================================================================
// Portal Team Management
// ============================================================================

export interface PortalTeamMember {
  userId: string;
  userEmail: string;
  userName: string;
  role: 'admin' | 'manager' | 'viewer';
  joinedAt: string;
  isOwner: boolean;
}

export interface InviteTeamMemberRequest {
  email: string;
  role: 'manager' | 'viewer';
}

export interface AcceptPortalInviteRequest {
  token: string;
  userName: string;
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
