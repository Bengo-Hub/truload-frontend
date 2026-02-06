"use client";

import {
    AxleConfiguration,
    captureWeights,
    CreateWeighingRequest,
    initiateReweigh as initiateReweighApi,
    UpdateWeighingRequest,
    WeighingResult,
    WeighingTransaction,
} from '@/lib/api/weighing';
import { QUERY_KEYS } from '@/lib/query/config';
import { ComplianceStatus } from '@/types/weighing';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    useAxleConfigurations,
    useCreateWeighingTransaction,
    useMyStation,
    useUpdateWeighingTransaction,
} from './queries';

// Storage key for persisting weighing session
const WEIGHING_SESSION_KEY = 'truload_weighing_session';

export interface CapturedAxle {
  axleNumber: number;
  weightKg: number;
  capturedAt: Date;
  axleConfigurationId?: string;
}

export interface WeighingSessionState {
  transactionId: string | null;
  ticketNumber: string | null;
  vehiclePlate: string;
  vehicleId: string | null;
  driverId: string | null;
  transporterId: string | null;
  axleConfigCode: string;
  capturedAxles: CapturedAxle[];
  weighingMode: 'mobile' | 'multideck';
  bound?: string;
  startedAt: Date;
  reweighCycleNo: number;
  originalWeighingId: string | null;
  isWeightConfirmed: boolean;
}

export interface UseWeighingOptions {
  weighingMode: 'mobile' | 'multideck';
  bound?: string;
  autoInitialize?: boolean;
}

export interface UseWeighingReturn {
  // Session state
  session: WeighingSessionState | null;
  transaction: WeighingTransaction | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;

  // Station & config data
  station: ReturnType<typeof useMyStation>['data'];
  axleConfigurations: AxleConfiguration[];

  // Captured weights
  capturedAxles: CapturedAxle[];
  currentAxle: number;
  totalAxles: number;
  allAxlesCaptured: boolean;

  // Compliance
  complianceResult: WeighingResult | null;
  overallStatus: ComplianceStatus;
  gvwMeasured: number;
  gvwPermissible: number;
  gvwOverload: number;

  // Reweigh & confirmation
  reweighCycleNo: number;
  isWeightConfirmed: boolean;

  // Actions
  initializeTransaction: (vehiclePlate: string, axleConfigCode?: string) => Promise<WeighingTransaction | null>;
  captureAxleWeight: (axleNumber: number, weightKg: number, axleConfigId?: string) => Promise<boolean>;
  submitWeights: () => Promise<WeighingResult | null>;
  confirmWeight: () => Promise<WeighingResult | null>;
  initiateReweigh: () => Promise<WeighingTransaction | null>;
  updateVehicleDetails: (details: Partial<UpdateWeighingRequest>) => Promise<boolean>;
  setVehiclePlate: (plate: string) => void;
  setAxleConfig: (configCode: string) => void;
  setCurrentAxle: (axle: number) => void;
  resetSession: () => void;
  restoreSession: () => boolean;
}

/**
 * useWeighing - Comprehensive hook for managing weighing workflow
 *
 * Provides:
 * - Transaction lifecycle management (create, update, submit)
 * - Weight capture with backend synchronization
 * - Compliance calculation
 * - Session persistence across page reloads
 * - Integration with TanStack Query for caching
 *
 * Usage:
 * ```tsx
 * const { initializeTransaction, captureAxleWeight, submitWeights } = useWeighing({
 *   weighingMode: 'mobile',
 *   bound: 'A',
 * });
 *
 * // Start a new weighing session
 * await initializeTransaction('KAA 123A', '6C');
 *
 * // Capture axle weights
 * await captureAxleWeight(1, 6800);
 * await captureAxleWeight(2, 8900);
 *
 * // Submit all weights
 * const result = await submitWeights();
 * ```
 */
export function useWeighing(options: UseWeighingOptions): UseWeighingReturn {
  const { weighingMode, bound, autoInitialize = false } = options;

  const queryClient = useQueryClient();

  // TanStack Query hooks
  const { data: station, isLoading: isLoadingStation } = useMyStation();
  const { data: axleConfigurations = [], isLoading: isLoadingConfigs } = useAxleConfigurations();
  const createTransactionMutation = useCreateWeighingTransaction();
  const updateTransactionMutation = useUpdateWeighingTransaction();

  // Local state
  const [session, setSession] = useState<WeighingSessionState | null>(null);
  const [transaction, setTransaction] = useState<WeighingTransaction | null>(null);
  const [complianceResult, setComplianceResult] = useState<WeighingResult | null>(null);
  const [currentAxle, setCurrentAxle] = useState(1);
  const [error, setError] = useState<Error | null>(null);

  // Derived state
  const isInitialized = session !== null && transaction !== null;
  const isLoading = isLoadingStation || isLoadingConfigs ||
    createTransactionMutation.isPending || updateTransactionMutation.isPending;

  // Get total axles from configuration
  const totalAxles = useMemo(() => {
    if (!session?.axleConfigCode) return 0;
    const config = axleConfigurations.find(c => c.axleCode === session.axleConfigCode);
    return config?.axleNumber || 0;
  }, [session?.axleConfigCode, axleConfigurations]);

  const capturedAxles = session?.capturedAxles || [];
  const allAxlesCaptured = capturedAxles.length >= totalAxles;

  // Calculate compliance from captured weights
  const { gvwMeasured, gvwPermissible, gvwOverload, overallStatus } = useMemo(() => {
    // Get permissible weight from configuration
    const config = session?.axleConfigCode
      ? axleConfigurations.find(c => c.axleCode === session.axleConfigCode)
      : null;
    const permissibleFromConfig = config?.gvwPermissibleKg || 0;

    if (!complianceResult) {
      const totalWeight = capturedAxles.reduce((sum, a) => sum + a.weightKg, 0);
      return {
        gvwMeasured: totalWeight,
        gvwPermissible: permissibleFromConfig,
        gvwOverload: permissibleFromConfig > 0 ? Math.max(0, totalWeight - permissibleFromConfig) : 0,
        overallStatus: 'PENDING' as ComplianceStatus,
      };
    }

    return {
      gvwMeasured: complianceResult.gvwMeasuredKg,
      gvwPermissible: complianceResult.gvwPermissibleKg,
      gvwOverload: complianceResult.gvwOverloadKg,
      overallStatus: complianceResult.overallStatus as ComplianceStatus,
    };
  }, [capturedAxles, complianceResult, session?.axleConfigCode, axleConfigurations]);

  // Persist session to localStorage
  const persistSession = useCallback((sessionState: WeighingSessionState | null) => {
    if (sessionState) {
      localStorage.setItem(WEIGHING_SESSION_KEY, JSON.stringify(sessionState));
    } else {
      localStorage.removeItem(WEIGHING_SESSION_KEY);
    }
  }, []);

  // Restore session from localStorage
  const restoreSession = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(WEIGHING_SESSION_KEY);
      if (stored) {
        const restored = JSON.parse(stored) as WeighingSessionState;
        // Validate session is recent (within 24 hours)
        const sessionAge = Date.now() - new Date(restored.startedAt).getTime();
        if (sessionAge < 24 * 60 * 60 * 1000) {
          setSession({
            ...restored,
            startedAt: new Date(restored.startedAt),
            capturedAxles: restored.capturedAxles.map(a => ({
              ...a,
              capturedAt: new Date(a.capturedAt),
            })),
            reweighCycleNo: restored.reweighCycleNo ?? 0,
            originalWeighingId: restored.originalWeighingId ?? null,
            isWeightConfirmed: restored.isWeightConfirmed ?? false,
          });
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to restore weighing session:', e);
    }
    return false;
  }, []);

  // Generate ticket number
  const generateTicketNumber = useCallback((): string => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const prefix = weighingMode === 'mobile' ? 'MOB' : 'MUL';
    return `${prefix}${dateStr}${random}`;
  }, [weighingMode]);

  // Initialize a new weighing transaction
  // Sends a single POST request with vehicleRegNo - backend handles vehicle lookup/creation
  const initializeTransaction = useCallback(async (
    vehiclePlate: string,
    axleConfigCode: string = '6C'
  ): Promise<WeighingTransaction | null> => {
    if (!station?.id) {
      setError(new Error('No station assigned. Cannot initialize transaction.'));
      return null;
    }

    try {
      setError(null);

      const normalizedPlate = vehiclePlate.toUpperCase().trim();
      const ticketNumber = generateTicketNumber();

      // Single request - backend handles vehicle lookup/creation
      const request: CreateWeighingRequest = {
        ticketNumber,
        stationId: station.id,
        vehicleRegNo: normalizedPlate,
        weighingType: weighingMode,
        bound: bound,
      };

      const newTransaction = await createTransactionMutation.mutateAsync(request);

      const newSession: WeighingSessionState = {
        transactionId: newTransaction.id,
        ticketNumber: newTransaction.ticketNumber || ticketNumber,
        vehiclePlate: normalizedPlate,
        vehicleId: newTransaction.vehicleId || null,
        driverId: null,
        transporterId: null,
        axleConfigCode,
        capturedAxles: [],
        weighingMode,
        bound,
        startedAt: new Date(),
        reweighCycleNo: newTransaction.reweighCycleNo ?? 0,
        originalWeighingId: newTransaction.originalWeighingId ?? null,
        isWeightConfirmed: false,
      };

      setSession(newSession);
      setTransaction(newTransaction);
      setCurrentAxle(1);
      persistSession(newSession);

      return newTransaction;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to create transaction');
      setError(error);
      console.error('Failed to initialize transaction:', e);
      return null;
    }
  }, [station, weighingMode, bound, createTransactionMutation, generateTicketNumber, persistSession]);

  // Capture a single axle weight
  const captureAxleWeight = useCallback(async (
    axleNumber: number,
    weightKg: number,
    axleConfigId?: string
  ): Promise<boolean> => {
    if (!session) {
      setError(new Error('No active session. Initialize transaction first.'));
      return false;
    }

    // Check if axle already captured
    if (session.capturedAxles.some(a => a.axleNumber === axleNumber)) {
      console.warn(`Axle ${axleNumber} already captured`);
      return false;
    }

    const newCapture: CapturedAxle = {
      axleNumber,
      weightKg,
      capturedAt: new Date(),
      axleConfigurationId: axleConfigId,
    };

    const updatedAxles = [...session.capturedAxles, newCapture].sort(
      (a, b) => a.axleNumber - b.axleNumber
    );

    const updatedSession = {
      ...session,
      capturedAxles: updatedAxles,
    };

    setSession(updatedSession);
    persistSession(updatedSession);

    // Auto-advance to next axle
    if (axleNumber < totalAxles) {
      setCurrentAxle(axleNumber + 1);
    }

    return true;
  }, [session, totalAxles, persistSession]);

  // Submit all captured weights to backend
  const submitWeights = useCallback(async (): Promise<WeighingResult | null> => {
    if (!session?.transactionId || capturedAxles.length === 0) {
      setError(new Error('No weights to submit'));
      return null;
    }

    try {
      setError(null);

      const result = await captureWeights(session.transactionId, {
        axles: capturedAxles.map(a => ({
          axleNumber: a.axleNumber,
          measuredWeightKg: a.weightKg,
          axleConfigurationId: a.axleConfigurationId,
        })),
      });

      setComplianceResult(result);

      // Invalidate transaction queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEIGHING_TRANSACTIONS });

      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to submit weights');
      setError(error);
      console.error('Failed to submit weights:', e);
      return null;
    }
  }, [session, capturedAxles, queryClient]);

  // Update vehicle/driver/transporter details
  const updateVehicleDetails = useCallback(async (
    details: Partial<UpdateWeighingRequest>
  ): Promise<boolean> => {
    if (!session?.transactionId) {
      setError(new Error('No active transaction'));
      return false;
    }

    try {
      setError(null);

      await updateTransactionMutation.mutateAsync({
        id: session.transactionId,
        payload: details,
      });

      // Update local session state with any provided details
      setSession(prev => prev ? {
        ...prev,
        driverId: details.driverId ?? prev.driverId,
        transporterId: details.transporterId ?? prev.transporterId,
      } : null);

      return true;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to update transaction');
      setError(error);
      console.error('Failed to update vehicle details:', e);
      return false;
    }
  }, [session, updateTransactionMutation]);

  // Confirm weight: submit weights to backend and mark as confirmed
  const confirmWeight = useCallback(async (): Promise<WeighingResult | null> => {
    const result = await submitWeights();
    if (result) {
      setSession(prev => {
        if (!prev) return null;
        const updated = { ...prev, isWeightConfirmed: true };
        persistSession(updated);
        return updated;
      });
    }
    return result;
  }, [submitWeights, persistSession]);

  // Initiate a reweigh for the current transaction
  const initiateReweighTransaction = useCallback(async (): Promise<WeighingTransaction | null> => {
    if (!session?.transactionId) {
      setError(new Error('No active transaction to reweigh'));
      return null;
    }

    const reweighCycle = session.reweighCycleNo ?? 0;
    if (reweighCycle >= 8) {
      setError(new Error('Maximum reweigh limit (8) reached'));
      return null;
    }

    try {
      setError(null);
      const ticketNumber = generateTicketNumber();

      const newTransaction = await initiateReweighApi({
        originalWeighingId: session.transactionId,
        reweighTicketNumber: ticketNumber,
      });

      // Create a new session for the reweigh, keeping vehicle details
      const reweighSession: WeighingSessionState = {
        transactionId: newTransaction.id,
        ticketNumber: newTransaction.ticketNumber || ticketNumber,
        vehiclePlate: session.vehiclePlate,
        vehicleId: session.vehicleId,
        driverId: session.driverId,
        transporterId: session.transporterId,
        axleConfigCode: session.axleConfigCode,
        capturedAxles: [],
        weighingMode: session.weighingMode,
        bound: session.bound,
        startedAt: new Date(),
        reweighCycleNo: newTransaction.reweighCycleNo ?? reweighCycle + 1,
        originalWeighingId: newTransaction.originalWeighingId ?? session.transactionId,
        isWeightConfirmed: false,
      };

      setSession(reweighSession);
      setTransaction(newTransaction);
      setComplianceResult(null);
      setCurrentAxle(1);
      persistSession(reweighSession);

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEIGHING_TRANSACTIONS });

      return newTransaction;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to initiate reweigh');
      setError(error);
      console.error('Failed to initiate reweigh:', e);
      return null;
    }
  }, [session, generateTicketNumber, persistSession, queryClient]);

  // Set vehicle plate (before transaction initialization)
  const setVehiclePlate = useCallback((plate: string) => {
    setSession(prev => prev ? { ...prev, vehiclePlate: plate } : null);
  }, []);

  // Set axle configuration
  const setAxleConfig = useCallback((configCode: string) => {
    setSession(prev => {
      if (!prev) return null;
      const updated = { ...prev, axleConfigCode: configCode, capturedAxles: [] };
      persistSession(updated);
      return updated;
    });
    setCurrentAxle(1);
  }, [persistSession]);

  // Reset the session
  const resetSession = useCallback(() => {
    setSession(null);
    setTransaction(null);
    setComplianceResult(null);
    setCurrentAxle(1);
    setError(null);
    persistSession(null);
  }, [persistSession]);

  // Auto-restore session on mount
  useEffect(() => {
    if (autoInitialize && !session) {
      restoreSession();
    }
  }, [autoInitialize, session, restoreSession]);

  return {
    // Session state
    session,
    transaction,
    isInitialized,
    isLoading,
    error,

    // Station & config data
    station,
    axleConfigurations,

    // Captured weights
    capturedAxles,
    currentAxle,
    totalAxles,
    allAxlesCaptured,

    // Compliance
    complianceResult,
    overallStatus,
    gvwMeasured,
    gvwPermissible,
    gvwOverload,

    // Reweigh & confirmation
    reweighCycleNo: session?.reweighCycleNo ?? 0,
    isWeightConfirmed: session?.isWeightConfirmed ?? false,

    // Actions
    initializeTransaction,
    captureAxleWeight,
    submitWeights,
    confirmWeight,
    initiateReweigh: initiateReweighTransaction,
    updateVehicleDetails,
    setVehiclePlate,
    setAxleConfig,
    setCurrentAxle,
    resetSession,
    restoreSession,
  };
}

export default useWeighing;
