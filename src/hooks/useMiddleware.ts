"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useMiddleware - Hybrid Connection Hook for TruConnect Middleware
 *
 * Implements a smart connection strategy that works in all scenarios:
 * - Development: Local WebSocket (TruConnect) as PRIMARY, no backend fallback
 * - Online (Production): Backend WebSocket relay → Local WebSocket fallback
 * - Offline (PWA): Direct localhost WebSocket → API polling fallback
 *
 * Connection Priority Chain (Production):
 * 1. Backend WebSocket (wss://backend/ws/weights) - when online & configured
 * 2. Local WebSocket (ws://localhost:3030) - offline or backend unavailable
 * 3. Local API Polling (http://localhost:3031/weights) - WebSocket unavailable
 *
 * Connection Priority Chain (Development):
 * 1. Local WebSocket (ws://localhost:3030) - TruConnect middleware
 * 2. Local API Polling (http://localhost:3031/weights) - WebSocket unavailable
 *
 * Key Insight: When PWA is installed and running offline, the browser runs
 * locally on the user's machine, so it CAN connect to localhost even without internet!
 */

// Types

/**
 * Individual scale status (for mobile mode - PAW/Haenni wheel pads)
 */
export interface ScaleStatusInfo {
  connected: boolean;
  weight: number;
  battery?: number;
  temperature?: number;
  signalStrength?: number;
}

export interface WeightData {
  mode: 'mobile' | 'multideck';
  // Multideck fields (flat format for backward compatibility)
  deck1?: number;
  deck2?: number;
  deck3?: number;
  deck4?: number;
  // Multideck fields (array format - matches API structure)
  decks?: Array<{ index: number; weight: number; stable: boolean }>;
  gvw: number;
  // Mobile fields
  weight?: number;
  currentWeight?: number;  // Alias for weight (API compatibility)
  axleNumber?: number;
  axleWeights?: number[];
  runningTotal?: number;
  runningGvw?: number;  // Alias for runningTotal (API compatibility)
  /**
   * Individual scale weights for mobile mode (PAW/Haenni)
   *
   * PAW scales return combined weight (scaleA + scaleB), so middleware derives:
   *   scaleA = total / 2, scaleB = total - scaleA
   *
   * Haenni may return separate weights directly.
   *
   * For scale test: always use scaleA + scaleB to verify calibration.
   * For axle capture: use weight (combined total) as the axle weight.
   */
  scaleA?: number;
  scaleB?: number;
  scaleWeightMode?: 'combined' | 'separate'; // 'combined' (PAW) or 'separate' (Haenni)
  /**
   * Full scale status including connection state (for scale test and diagnostics)
   * Both scales are connected for PAW/simulation (they report combined weight split in half)
   */
  scaleAStatus?: ScaleStatusInfo;
  scaleBStatus?: ScaleStatusInfo;
  // Session state (for mobile mode)
  session?: {
    currentAxle: number;
    totalAxles: number;
    axles: Array<{ axleNumber: number; weight: number }>;
    gvw: number;
  };
  // Common fields
  stable: boolean;
  unit?: string;
  simulation?: boolean;
  source?: string;
  vehicleOnDeck?: boolean;
  // Connection info (matches API structure)
  connection?: {
    source?: string;
    protocol?: string;
    type?: string;
    connected?: boolean;
    outputMode?: string;
    device?: {
      make?: string;
      model?: string;
      capacity?: string;
    };
  };
  // Scale/Indicator info
  scaleInfo?: {
    battery?: number;
    temperature?: number;
    signalStrength?: number;
    make?: string;
    model?: string;
  };
  indicatorInfo?: {
    make?: string;
    model?: string;
    signalStrength?: number;
  };
}

export interface ScaleInfo {
  status: 'connected' | 'disconnected' | 'error' | 'unstable';
  weight: number;
  temp?: number;
  battery?: number;
}

export interface ScaleStatus {
  mode: 'mobile' | 'multideck';
  connected: boolean;
  simulation: boolean;
  protocol: string;
  port?: string;
  scaleA?: ScaleInfo;
  scaleB?: ScaleInfo;
}

export type ConnectionMode = 'backend_ws' | 'local_ws' | 'local_api' | 'disconnected';

export interface MiddlewareState {
  connected: boolean;
  registered: boolean;
  weights: WeightData | null;
  scaleStatus: ScaleStatus | null;
  simulation: boolean;
  error: string | null;
  clientId: number | null;
  // New fields for hybrid connection
  connectionMode: ConnectionMode;
  isOnline: boolean;
  isLocalFallback: boolean;
}

export interface UseMiddlewareOptions {
  stationCode: string;
  bound?: 'A' | 'B';
  mode?: 'mobile' | 'multideck';
  autoConnect?: boolean;
  // Client identification (for handshake/connection pool display)
  clientName?: string;        // Friendly name e.g. "TruLoad Frontend", "Nairobi Unit 01"
  clientType?: 'truload-frontend' | 'truload-backend' | 'mobile-app' | 'api-client' | string;
  // Connection URLs
  backendWsUrl?: string;      // Cloud backend WebSocket (wss://...)
  localWsUrl?: string;        // Local TruConnect WebSocket
  localApiUrl?: string;       // Local TruConnect API (polling)
  // Behavior
  preferBackend?: boolean;    // Try backend first when online (default: true)
  enablePollingFallback?: boolean; // Fall back to API polling (default: true)
  pollingInterval?: number;   // API polling interval in ms (default: 500)
  reconnectInterval?: number;
  // Callbacks
  onWeightUpdate?: (weight: WeightData) => void;
  onScaleStatusChange?: (status: ScaleStatus) => void;
  onConnectionModeChange?: (mode: ConnectionMode, url: string) => void;
  onError?: (error: string) => void;
}

export interface PlateData {
  plateNumber: string;
  vehicleType?: string;
  anprImagePath?: string;
  overviewImagePath?: string;
  confidence?: number;
}

export interface VehicleCompleteData {
  totalAxles: number;
  axleWeights: number[];
  gvw: number;
  axleConfigurationCode?: string;
  vehicleId?: string;
  driverId?: string;
  transporterId?: string;
}

export interface UseMiddlewareReturn extends MiddlewareState {
  connect: () => void;
  disconnect: () => void;
  sendPlate: (plateNumber: string, data?: Partial<PlateData>) => void;
  captureAxle: (axleNumber: number, weight: number, axleConfigurationId?: string) => void;
  completeVehicle: (data: VehicleCompleteData) => void;
  queryWeight: (type?: 'current' | 'next-axle') => void;
  resetSession: () => void;
  switchBound: (bound: 'A' | 'B') => void;
  requestStatus: () => void;
  // New methods for hybrid connection
  forceLocalConnection: () => void;
  forceBackendConnection: () => void;
}

// Default URLs
const DEFAULT_LOCAL_WS_URL = 'ws://localhost:3030';
const DEFAULT_LOCAL_API_URL = 'http://localhost:3031/api/v1/weights';
const DEFAULT_RECONNECT_INTERVAL = 5000;
const DEFAULT_POLLING_INTERVAL = 500;

// Check if we're in development mode
const isDevelopment = () => {
  if (typeof window !== 'undefined') {
    return process.env.NODE_ENV === 'development' ||
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  }
  return process.env.NODE_ENV === 'development';
};

// Get backend WS URL from environment
const getBackendWsUrl = () => {
  // In development, don't use backend WebSocket - TruConnect is the primary
  if (isDevelopment()) {
    return null;
  }
  
  if (typeof window !== 'undefined') {
    // Check for environment variable
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
    if (envUrl) return envUrl;

    // Derive from API URL if available
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      const url = new URL(apiUrl);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${url.host}/ws/weights`;
    }
  }
  return null;
};

export function useMiddleware(options: UseMiddlewareOptions): UseMiddlewareReturn {
  const {
    stationCode,
    bound = 'A',
    mode = 'mobile',
    autoConnect = true,
    clientName = 'TruLoad Frontend',
    clientType = 'truload-frontend',
    backendWsUrl = getBackendWsUrl(),
    localWsUrl = DEFAULT_LOCAL_WS_URL,
    localApiUrl = DEFAULT_LOCAL_API_URL,
    preferBackend = true,
    enablePollingFallback = true,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    onWeightUpdate,
    onScaleStatusChange,
    onConnectionModeChange,
    onError,
  } = options;

  const [state, setState] = useState<MiddlewareState>({
    connected: false,
    registered: false,
    weights: null,
    scaleStatus: null,
    simulation: false,
    error: null,
    clientId: null,
    connectionMode: 'disconnected',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isLocalFallback: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const pollingTimer = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnect = useRef(true);
  const currentUrlRef = useRef<string>('');
  const connectionAttemptsRef = useRef<number>(0);
  const forceLocalRef = useRef<boolean>(false);

  // Track last registered values to avoid duplicate registrations
  const lastRegisteredRef = useRef<{
    stationCode: string;
    bound: string;
    mode: string;
  } | null>(null);

  // Refs to break circular dependencies
  const connectRef = useRef<() => void>(null!);
  const connectToLocalRef = useRef<() => void>(null!);
  const scheduleReconnectRef = useRef<() => void>(null!);

  // Network state detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setState(s => ({ ...s, isOnline: true }));
      // When coming back online, try to reconnect (potentially to backend)
      if (!state.connected && !forceLocalRef.current) {
        connectionAttemptsRef.current = 0;
        connectRef.current?.();
      }
    };

    const handleOffline = () => {
      setState(s => ({ ...s, isOnline: false }));
      // When going offline, switch to local if not already
      if (state.connectionMode === 'backend_ws') {
        console.log('[useMiddleware] Network offline, switching to local connection');
        connectToLocalRef.current?.();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.connected, state.connectionMode]);

  // Send message helper
  const sendMessage = useCallback((event: string, data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }));
      return true;
    }
    console.warn('[useMiddleware] WebSocket not connected, cannot send:', event);
    return false;
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: { event: string; data: unknown; timestamp: string }) => {
    switch (message.event) {
      case 'connected':
        setState(s => ({
          ...s,
          clientId: (message.data as { clientId: number }).clientId,
        }));
        break;

      case 'register-ack':
        const registerData = message.data as { success: boolean };
        setState(s => ({ ...s, registered: registerData.success }));
        break;

      case 'weights':
      case 'weight':
        const weightData = message.data as WeightData;

        // Extract scale status from enhanced weight events (if available)
        if (weightData.connection || weightData.scaleInfo || weightData.indicatorInfo || 
            weightData.scaleAStatus || weightData.scaleBStatus) {
          const scaleStatus: ScaleStatus = {
            mode: weightData.mode,
            connected: weightData.connection?.connected ?? true,
            simulation: weightData.simulation || false,
            protocol: weightData.connection?.protocol || '',
          };

          // Add scale info for mobile mode
          // Now using enhanced scaleAStatus/scaleBStatus from middleware
          if (weightData.mode === 'mobile') {
            const currentWeight = weightData.weight || weightData.currentWeight || 0;
            
            // Scale A status
            if (weightData.scaleAStatus) {
              scaleStatus.scaleA = {
                status: weightData.scaleAStatus.connected ? 'connected' : 'disconnected',
                weight: weightData.scaleAStatus.weight ?? (weightData.scaleA || currentWeight / 2),
                battery: weightData.scaleAStatus.battery ?? weightData.scaleInfo?.battery,
                temp: weightData.scaleAStatus.temperature ?? weightData.scaleInfo?.temperature,
              };
            } else if (weightData.scaleInfo) {
              // Legacy fallback
              scaleStatus.scaleA = {
                status: weightData.connection?.connected ? 'connected' : 'disconnected',
                weight: weightData.scaleA || currentWeight / 2,
                battery: weightData.scaleInfo.battery,
                temp: weightData.scaleInfo.temperature,
              };
            }

            // Scale B status
            if (weightData.scaleBStatus) {
              scaleStatus.scaleB = {
                status: weightData.scaleBStatus.connected ? 'connected' : 'disconnected',
                weight: weightData.scaleBStatus.weight ?? (weightData.scaleB || currentWeight / 2),
                battery: weightData.scaleBStatus.battery ?? weightData.scaleInfo?.battery,
                temp: weightData.scaleBStatus.temperature ?? weightData.scaleInfo?.temperature,
              };
            } else if (weightData.scaleInfo) {
              // Legacy fallback - derive scale B from combined weight
              scaleStatus.scaleB = {
                status: weightData.connection?.connected ? 'connected' : 'disconnected',
                weight: weightData.scaleB || (currentWeight - (weightData.scaleA || currentWeight / 2)),
                battery: weightData.scaleInfo.battery,
                temp: weightData.scaleInfo.temperature,
              };
            }
          }

          setState(s => ({
            ...s,
            weights: weightData,
            scaleStatus,
            simulation: weightData.simulation || false,
          }));
          onScaleStatusChange?.(scaleStatus);
        } else {
          setState(s => ({
            ...s,
            weights: weightData,
            simulation: weightData.simulation || false,
          }));
        }

        onWeightUpdate?.(weightData);
        break;

      case 'scale-status':
        const statusData = message.data as ScaleStatus;
        setState(s => ({
          ...s,
          scaleStatus: statusData,
          simulation: statusData.simulation || false,
        }));
        onScaleStatusChange?.(statusData);
        break;

      case 'plate-ack':
      case 'axle-captured-ack':
      case 'vehicle-complete-ack':
        // Handle acknowledgements - could emit events here
        break;

      case 'session-reset-ack':
        setState(s => ({ ...s, weights: null }));
        break;

      case 'error':
        const errorData = message.data as { message: string; code?: string };
        setState(s => ({ ...s, error: errorData.message }));
        onError?.(errorData.message);
        break;
    }
  }, [onWeightUpdate, onScaleStatusChange, onError]);

  // Handle API polling response (supports new API format with mode-specific data)
  const handlePollingResponse = useCallback((response: unknown) => {
    // Handle new API format: { success, mode, data, connection, timestamp }
    const apiResponse = response as {
      success?: boolean;
      mode?: 'mobile' | 'multideck';
      data?: unknown;
      connection?: {
        source?: string;
        protocol?: string;
        type?: string;
        connected?: boolean;
        outputMode?: string;
      };
      timestamp?: string;
    };

    // Extract weight data from API response
    let weightData: WeightData;

    if (apiResponse.success && apiResponse.data) {
      const { data, mode: apiMode, connection } = apiResponse;

      if (apiMode === 'mobile') {
        // Mobile mode response
        const mobileData = data as {
          currentWeight: number;
          runningGvw: number;  // Real-time total (captured + current on scale)
          stable: boolean;
          session: { currentAxle: number; totalAxles: number; axles: { axleNumber: number; weight: number }[]; gvw: number };
          scaleInfo?: { battery: number; temperature: number; signalStrength: number };
        };

        // runningGvw = captured axles + current weight on scale
        const runningGvw = mobileData.runningGvw ?? (mobileData.session?.gvw || 0) + mobileData.currentWeight;

        weightData = {
          mode: 'mobile',
          weight: mobileData.currentWeight,
          deck1: mobileData.currentWeight,
          gvw: runningGvw,  // Use running GVW for real-time display
          stable: mobileData.stable,
          axleNumber: mobileData.session?.currentAxle || 0,
          axleWeights: mobileData.session?.axles?.map(a => a.weight) || [],
          runningTotal: runningGvw,  // Real-time total
          source: connection?.source,
        };

        // Update scale status with connection and scale info
        if (mobileData.scaleInfo || connection) {
          const scaleStatus: ScaleStatus = {
            mode: 'mobile',
            connected: connection?.connected || false,
            simulation: false,
            protocol: connection?.protocol || '',
            scaleA: {
              status: connection?.connected ? 'connected' : 'disconnected',
              weight: mobileData.currentWeight,
              battery: mobileData.scaleInfo?.battery,
              temp: mobileData.scaleInfo?.temperature,
            },
          };
          setState(s => ({ ...s, scaleStatus }));
          onScaleStatusChange?.(scaleStatus);
        }
      } else {
        // Multideck mode response
        const multideckData = data as {
          decks: { index: number; weight: number; stable: boolean }[];
          gvw: number;
          vehicleOnDeck: boolean;
        };

        weightData = {
          mode: 'multideck',
          deck1: multideckData.decks?.[0]?.weight || 0,
          deck2: multideckData.decks?.[1]?.weight || 0,
          deck3: multideckData.decks?.[2]?.weight || 0,
          deck4: multideckData.decks?.[3]?.weight || 0,
          gvw: multideckData.gvw,
          stable: multideckData.decks?.every(d => d.stable) || false,
          source: connection?.source,
        };

        // Update scale status for multideck
        if (connection) {
          const scaleStatus: ScaleStatus = {
            mode: 'multideck',
            connected: connection?.connected || false,
            simulation: false,
            protocol: connection?.protocol || '',
          };
          setState(s => ({ ...s, scaleStatus }));
          onScaleStatusChange?.(scaleStatus);
        }
      }
    } else {
      // Legacy format - direct WeightData
      weightData = response as WeightData;
    }

    setState(s => ({
      ...s,
      weights: weightData,
      simulation: weightData.simulation || false,
    }));
    onWeightUpdate?.(weightData);
  }, [onWeightUpdate, onScaleStatusChange]);

  // Connect to a specific WebSocket URL
  const connectWebSocket = useCallback((url: string, connectionMode: ConnectionMode): Promise<boolean> => {
    return new Promise((resolve) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && currentUrlRef.current === url) {
        resolve(true);
        return;
      }

      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      let resolved = false;
      const safeResolve = (value: boolean) => {
        if (!resolved) {
          resolved = true;
          resolve(value);
        }
      };

      try {
        console.log(`[useMiddleware] Connecting to ${connectionMode}: ${url}`);
        const ws = new WebSocket(url);
        
        // Use a shorter timeout for initial connection attempt (2 seconds)
        // This gives WebSocket priority but doesn't block fallback too long
        const timeoutId = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            console.log(`[useMiddleware] WebSocket connection timeout for ${url}`);
            ws.close();
            safeResolve(false);
          }
        }, 2000); // 2 second timeout for faster fallback while still giving WS priority

        ws.onopen = () => {
          clearTimeout(timeoutId);
          currentUrlRef.current = url;
          connectionAttemptsRef.current = 0;

          // IMPORTANT: If we were polling, stop it now - WebSocket takes over
          if (pollingTimer.current) {
            console.log('[useMiddleware] WebSocket connected, stopping API polling');
            clearInterval(pollingTimer.current);
            pollingTimer.current = null;
          }

          setState(s => ({
            ...s,
            connected: true,
            connectionMode,
            isLocalFallback: connectionMode === 'local_ws' || connectionMode === 'local_api',
            error: null,
          }));

          onConnectionModeChange?.(connectionMode, url);

          // Auto-register with client identification
          ws.send(JSON.stringify({
            event: 'register',
            data: { stationCode, bound, mode, clientName, clientType },
          }));

          // Track what we registered with to avoid duplicate registrations
          lastRegisteredRef.current = { stationCode, bound, mode };

          safeResolve(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleMessage(message);
          } catch (e) {
            console.error('[useMiddleware] Failed to parse message:', e);
          }
        };

        ws.onclose = () => {
          clearTimeout(timeoutId);
          if (currentUrlRef.current === url) {
            setState(s => ({
              ...s,
              connected: false,
              registered: false,
              connectionMode: 'disconnected',
            }));

            if (shouldReconnect.current) {
              scheduleReconnectRef.current();
            }
          }
          safeResolve(false);
        };

        ws.onerror = (error) => {
          // Don't resolve on error alone - wait for onclose or timeout
          // onerror is always followed by onclose, so we let onclose handle resolution
          console.log(`[useMiddleware] WebSocket error for ${url}:`, error);
          // Note: We do NOT call safeResolve here - onclose will be called after onerror
        };

        wsRef.current = ws;
      } catch (e) {
        console.error('[useMiddleware] WebSocket creation error:', e);
        safeResolve(false);
      }
    });
  }, [stationCode, bound, mode, clientName, clientType, handleMessage, onConnectionModeChange]);

  // Check if an API endpoint is reachable (with timeout)
  const isApiEndpointReachable = useCallback(async (url: string, timeout = 3000): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  }, []);

  // Start API polling
  const startPolling = useCallback(() => {
    if (pollingTimer.current) return;

    console.log(`[useMiddleware] Starting API polling: ${localApiUrl}`);

    const poll = async () => {
      try {
        const response = await fetch(localApiUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          handlePollingResponse(data);

          if (!state.connected) {
            setState(s => ({
              ...s,
              connected: true,
              connectionMode: 'local_api',
              isLocalFallback: true,
              error: null,
            }));
            onConnectionModeChange?.('local_api', localApiUrl);
          }
        }
      } catch {
        // Polling failed, will retry
        if (state.connectionMode === 'local_api') {
          setState(s => ({ ...s, connected: false, connectionMode: 'disconnected' }));
        }
      }
    };

    // Initial poll
    poll();

    // Schedule recurring polls
    pollingTimer.current = setInterval(poll, pollingInterval);
    
    // Background WebSocket retry: periodically try to upgrade from polling to WebSocket
    // This runs every 10 seconds while polling is active
    const wsRetryInterval = setInterval(async () => {
      if (pollingTimer.current && !wsRef.current) {
        console.log('[useMiddleware] Background retry: attempting WebSocket upgrade from polling...');
        // Try WebSocket silently - if it connects, it will stop polling automatically
        const ws = new WebSocket(localWsUrl);
        
        const retryTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
          }
        }, 2000);
        
        ws.onopen = () => {
          clearTimeout(retryTimeout);
          console.log('[useMiddleware] Background WebSocket connected! Upgrading from polling...');
          // Stop polling
          if (pollingTimer.current) {
            clearInterval(pollingTimer.current);
            pollingTimer.current = null;
          }
          clearInterval(wsRetryInterval);
          
          // Set up this WebSocket as primary
          currentUrlRef.current = localWsUrl;
          wsRef.current = ws;
          connectionAttemptsRef.current = 0;
          
          setState(s => ({
            ...s,
            connected: true,
            connectionMode: 'local_ws',
            isLocalFallback: true,
            error: null,
          }));
          
          onConnectionModeChange?.('local_ws', localWsUrl);
          
          // Register
          ws.send(JSON.stringify({
            event: 'register',
            data: { stationCode, bound, mode, clientName, clientType },
          }));
          lastRegisteredRef.current = { stationCode, bound, mode };
          
          // Set up message handler
          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              handleMessage(message);
            } catch (e) {
              console.error('[useMiddleware] Failed to parse message:', e);
            }
          };
          
          ws.onclose = () => {
            if (currentUrlRef.current === localWsUrl) {
              setState(s => ({
                ...s,
                connected: false,
                registered: false,
                connectionMode: 'disconnected',
              }));
              if (shouldReconnect.current) {
                scheduleReconnectRef.current();
              }
            }
          };
        };
        
        ws.onerror = () => {
          clearTimeout(retryTimeout);
          // Silent failure - we're still polling
        };
        
        ws.onclose = () => {
          clearTimeout(retryTimeout);
          // Silent failure - we're still polling
        };
      } else if (!pollingTimer.current) {
        // Polling stopped (maybe WS connected), clear this interval
        clearInterval(wsRetryInterval);
      }
    }, 10000); // Try every 10 seconds
    
    // Store the retry interval reference for cleanup
    // We'll clear it when stopPolling is called
    (pollingTimer.current as NodeJS.Timeout & { wsRetry?: NodeJS.Timeout }).wsRetry = wsRetryInterval;
  }, [localApiUrl, localWsUrl, pollingInterval, handlePollingResponse, handleMessage, state.connected, state.connectionMode, stationCode, bound, mode, clientName, clientType, onConnectionModeChange]);

  // Stop API polling
  const stopPolling = useCallback(() => {
    if (pollingTimer.current) {
      // Also clear the background WebSocket retry interval
      const timer = pollingTimer.current as NodeJS.Timeout & { wsRetry?: NodeJS.Timeout };
      if (timer.wsRetry) {
        clearInterval(timer.wsRetry);
      }
      clearInterval(pollingTimer.current);
      pollingTimer.current = null;
    }
  }, []);

  // Connect to local middleware (WebSocket or API) with smart fallback
  // Only switches to API polling if the endpoint is actually reachable
  const connectToLocal = useCallback(async (): Promise<boolean> => {
    // Try local WebSocket first
    console.log('[useMiddleware] Trying local WebSocket...');
    const wsConnected = await connectWebSocket(localWsUrl, 'local_ws');

    if (wsConnected) {
      return true;
    }

    // If WebSocket failed, check if API polling is enabled and endpoint is reachable
    if (enablePollingFallback) {
      console.log('[useMiddleware] Local WebSocket failed, checking if API is reachable...');
      const apiReachable = await isApiEndpointReachable(localApiUrl);

      if (apiReachable) {
        console.log('[useMiddleware] API endpoint is reachable, starting polling');
        startPolling();
        return true;
      } else {
        console.log('[useMiddleware] API endpoint is NOT reachable, staying disconnected');
        // Don't switch to polling if API isn't reachable
        // The connection will stay in its current state and retry later
        setState(s => ({
          ...s,
          error: 'Local middleware not available (WebSocket and API both unreachable)',
        }));
        return false;
      }
    }

    return false;
  }, [localWsUrl, localApiUrl, enablePollingFallback, connectWebSocket, startPolling, isApiEndpointReachable]);

  // Main connect function with smart priority chain
  // Only switches connections if the new endpoint is actually reachable
  const connect = useCallback(async () => {
    // Don't try to connect if already connected via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Don't interrupt working polling connection unless forced
    const currentlyPolling = pollingTimer.current !== null && state.connected;

    shouldReconnect.current = true;

    // If forced to local OR in development mode, skip backend
    if (forceLocalRef.current || isDevelopment()) {
      if (isDevelopment() && !forceLocalRef.current) {
        console.log('[useMiddleware] Development mode detected, using local WebSocket as primary');
      }
      stopPolling();
      const localSuccess = await connectToLocal();
      if (!localSuccess && currentlyPolling) {
        // Local failed, but we had working polling - restore it
        console.log('[useMiddleware] Local connection failed, but polling was working - restoring polling');
        startPolling();
      }
      return;
    }

    // Try backend WebSocket first if online and configured (production only)
    if (state.isOnline && backendWsUrl && preferBackend) {
      console.log('[useMiddleware] Trying backend WebSocket...');
      const backendConnected = await connectWebSocket(backendWsUrl, 'backend_ws');

      if (backendConnected) {
        stopPolling(); // Stop polling since we have a working WebSocket
        return; // Successfully connected to backend
      }

      console.log('[useMiddleware] Backend unavailable, falling back to local');
    }

    // Try local connection (WebSocket first, then API if reachable)
    // Only stop polling if we successfully connect to something new
    const localSuccess = await connectToLocal();

    if (!localSuccess) {
      // All connection attempts failed
      if (currentlyPolling) {
        // We had working polling connection - keep it going
        console.log('[useMiddleware] All new connections failed, keeping current polling connection');
        // Don't stop polling - it was already working
      } else {
        // Nothing was working, schedule retry
        console.log('[useMiddleware] All connections failed, scheduling retry');
        scheduleReconnectRef.current?.();
      }
    }
  }, [state.isOnline, state.connected, backendWsUrl, preferBackend, connectWebSocket, connectToLocal, stopPolling, startPolling]);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return;

    connectionAttemptsRef.current++;
    const delay = Math.min(
      reconnectInterval * Math.pow(1.5, connectionAttemptsRef.current - 1),
      30000 // Max 30 seconds
    );

    console.log(`[useMiddleware] Scheduling reconnect in ${delay}ms (attempt ${connectionAttemptsRef.current})`);

    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      if (shouldReconnect.current) {
        connectRef.current();
      }
    }, delay);
  }, [reconnectInterval]);

  // Assign refs for circular dependency breaking
  connectRef.current = connect;
  connectToLocalRef.current = connectToLocal;
  scheduleReconnectRef.current = scheduleReconnect;

  // Disconnect
  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    stopPolling();

    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    currentUrlRef.current = '';

    setState(s => ({
      ...s,
      connected: false,
      registered: false,
      connectionMode: 'disconnected',
    }));
  }, [stopPolling]);

  // Force local connection (skip backend)
  const forceLocalConnection = useCallback(() => {
    forceLocalRef.current = true;
    disconnect();
    setTimeout(() => connectToLocal(), 100);
  }, [disconnect, connectToLocal]);

  // Force backend connection (when available)
  const forceBackendConnection = useCallback(() => {
    forceLocalRef.current = false;
    disconnect();
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  // Actions
  const sendPlate = useCallback((plateNumber: string, data?: Partial<PlateData>) => {
    sendMessage('plate', { plateNumber, ...data });
  }, [sendMessage]);

  const captureAxle = useCallback((axleNumber: number, weight: number, axleConfigurationId?: string) => {
    sendMessage('axle-captured', { axleNumber, weight, axleConfigurationId });
  }, [sendMessage]);

  const completeVehicle = useCallback((data: VehicleCompleteData) => {
    sendMessage('vehicle-complete', { ...data });
  }, [sendMessage]);

  const queryWeight = useCallback((type: 'current' | 'next-axle' = 'current') => {
    sendMessage('query-weight', { type });
  }, [sendMessage]);

  const resetSession = useCallback(() => {
    sendMessage('reset-session', {});
  }, [sendMessage]);

  const switchBound = useCallback((newBound: 'A' | 'B') => {
    sendMessage('bound-switch', { bound: newBound });
  }, [sendMessage]);

  const requestStatus = useCallback(() => {
    sendMessage('status-request', {});
  }, [sendMessage]);

  // Auto-connect on mount
  // Store disconnect in ref for cleanup
  const disconnectRef = useRef(disconnect);
  disconnectRef.current = disconnect;

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connectRef.current();
    }

    return () => {
      disconnectRef.current();
    };
  }, [autoConnect]); // Only run on mount/unmount

  // Re-register only when key options actually change (not on every render)
  // This prevents duplicate registrations while still updating when bound changes
  useEffect(() => {
    if (!state.connected || state.connectionMode === 'local_api') {
      return;
    }

    const lastReg = lastRegisteredRef.current;

    // Only re-register if stationCode, bound, or mode actually changed
    // Skip if this is the same as what we registered with on connect
    if (lastReg &&
        lastReg.stationCode === stationCode &&
        lastReg.bound === bound &&
        lastReg.mode === mode) {
      return; // No change, skip re-registration
    }

    // Values changed - send updated registration
    console.log(`[useMiddleware] Re-registering with updated values: ${stationCode}, bound=${bound}, mode=${mode}`);
    sendMessage('register', { stationCode, bound, mode, clientName, clientType });
    lastRegisteredRef.current = { stationCode, bound, mode };
  }, [stationCode, bound, mode, clientName, clientType, state.connected, state.connectionMode, sendMessage]);

  return {
    ...state,
    connect,
    disconnect,
    sendPlate,
    captureAxle,
    completeVehicle,
    queryWeight,
    resetSession,
    switchBound,
    requestStatus,
    forceLocalConnection,
    forceBackendConnection,
  };
}

export default useMiddleware;
