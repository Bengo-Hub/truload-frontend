import { WebSocket, WebSocketServer, type RawData } from 'ws';

/**
 * Minimal stand-in for TruConnect, the local scale-bridge middleware that
 * `useMiddleware` (src/hooks/useMiddleware.ts) expects to find at `ws://localhost:3030`.
 *
 * Why this exists: the Commercial Weighing capture UI (CommercialFirstWeightStep /
 * CommercialSecondWeightStep) disables its "capture" buttons whenever the live weight
 * reading is <= 0 or the middleware isn't connected — by design, an operator can only
 * capture a weight that's actually on the scale. useMiddleware's own header comment is
 * explicit that there is no backend WebSocket relay for weight data ("TruConnect
 * middleware always runs locally... The backend API does not relay WebSocket weight
 * data"), so against the live site with no physical scale attached, `liveWeightKg` would
 * stay 0 forever and the real capture buttons could never be exercised.
 *
 * This fakes just enough of TruConnect's wire protocol (see useMiddleware.ts's
 * `handleMessage`) for the live browser under test to connect to `ws://localhost:3030`
 * exactly as it would to a real local scale bridge, and to report a weight this test
 * controls. `ws://localhost` is a "potentially trustworthy" origin per the mixed-content
 * spec, so an https page (the live truload.codevertexafrica.com site) is allowed to open
 * this plain-ws connection — the same exception the real production architecture relies on
 * for operators running TruConnect on their own kiosk machine.
 */
export interface MockScaleServer {
  /** Push a new weight reading (kg) to every connected client immediately. */
  setWeight(kg: number): void;
  /** Stop the interval broadcast and close the server + all sockets. */
  close(): Promise<void>;
}

function weightFrame(weightKg: number) {
  return JSON.stringify({
    event: 'weight',
    data: {
      mode: 'mobile',
      weight: weightKg,
      currentWeight: weightKg,
      gvw: weightKg,
      stable: true,
      connection: { connected: true, protocol: 'mock-truconnect' },
      simulation: true,
    },
    timestamp: new Date().toISOString(),
  });
}

export function startMockScaleServer(port = 3030): MockScaleServer {
  const wss = new WebSocketServer({ port });
  let currentWeightKg = 0;
  const clients = new Set<WebSocket>();

  const broadcast = () => {
    const frame = weightFrame(currentWeightKg);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) client.send(frame);
    }
  };

  wss.on('connection', (socket: WebSocket) => {
    clients.add(socket);
    socket.on('message', (raw: RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.event === 'register') {
          socket.send(JSON.stringify({ event: 'register-ack', data: { success: true } }));
        }
      } catch {
        // Ignore anything we don't recognize (plate/enter/move/etc. acks aren't needed for
        // the buttons under test to light up).
      }
    });
    socket.on('close', () => clients.delete(socket));
    // Send an immediate reading so the UI doesn't have to wait for the next interval tick.
    socket.send(weightFrame(currentWeightKg));
  });

  const intervalId = setInterval(broadcast, 250);

  return {
    setWeight(kg: number) {
      currentWeightKg = kg;
      broadcast();
    },
    async close() {
      clearInterval(intervalId);
      for (const client of clients) client.terminate();
      await new Promise<void>((resolve, reject) => {
        wss.close((err?: Error) => (err ? reject(err) : resolve()));
      });
    },
  };
}
