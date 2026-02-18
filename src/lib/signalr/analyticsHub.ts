import * as signalR from '@microsoft/signalr';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
// Strip /api/v1 suffix to get the base server URL for SignalR
const SERVER_BASE = API_BASE.replace(/\/api\/v1\/?$/, '');

let connection: signalR.HubConnection | null = null;

type ConnectionStateListener = (state: 'connected' | 'reconnecting' | 'disconnected') => void;
const stateListeners = new Set<ConnectionStateListener>();

/**
 * Register a listener for connection state changes (connected, reconnecting, disconnected).
 * Returns an unsubscribe function.
 */
export function onConnectionStateChange(listener: ConnectionStateListener): () => void {
  stateListeners.add(listener);
  return () => { stateListeners.delete(listener); };
}

function notifyState(state: 'connected' | 'reconnecting' | 'disconnected') {
  stateListeners.forEach((fn) => {
    try { fn(state); } catch { /* listener error */ }
  });
}

/**
 * Get or create the SignalR connection to the analytics hub.
 * Uses JWT access token from localStorage for authentication.
 */
export function getAnalyticsConnection(): signalR.HubConnection {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${SERVER_BASE}/hubs/analytics`, {
      accessTokenFactory: () => {
        const token = localStorage.getItem('accessToken') || '';
        return token;
      },
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  // Propagate lifecycle events to listeners
  connection.onreconnecting(() => notifyState('reconnecting'));
  connection.onreconnected(() => notifyState('connected'));
  connection.onclose(() => notifyState('disconnected'));

  return connection;
}

/**
 * Start the SignalR connection if not already started.
 * Returns the connection ID once connected.
 */
export async function startAnalyticsConnection(): Promise<string> {
  const conn = getAnalyticsConnection();

  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start();
  }

  if (!conn.connectionId) {
    throw new Error('SignalR connected but no connectionId available');
  }

  notifyState('connected');
  return conn.connectionId;
}

/**
 * Stop the SignalR connection and clean up.
 */
export async function stopAnalyticsConnection(): Promise<void> {
  if (connection) {
    try {
      await connection.stop();
    } catch {
      // Connection may already be stopped
    }
    connection = null;
  }
}
