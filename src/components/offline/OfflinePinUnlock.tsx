'use client';

/**
 * Offline PIN unlock screen. Shown on the login page when the device is offline and an offline
 * PIN is enrolled (so the officer isn't stranded at a login form that needs the network).
 * A correct PIN decrypts the cached session and rehydrates auth for offline work; the server
 * re-verifies on reconnect. After OFFLINE_PIN_MAX_ATTEMPTS the cached session is wiped.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WifiOff, KeyRound } from 'lucide-react';
import {
  unlockOfflineSession,
  getOfflinePinUserLabel,
} from '@/lib/auth/offlinePinSession';

export function OfflinePinUnlock({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = getOfflinePinUserLabel();

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await unlockOfflineSession(pin);
      if (res.ok) {
        onUnlocked();
        return;
      }
      if (res.reason === 'wrong') {
        setError(`Incorrect PIN. ${res.attemptsRemaining} attempt(s) left.`);
      } else if (res.reason === 'locked') {
        setError('Too many attempts — offline access is locked. Sign in online to restore it.');
      } else {
        setError('No offline PIN is set on this device.');
      }
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Unlock offline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
            <WifiOff className="h-4 w-4 shrink-0" />
            You&apos;re offline. Enter your PIN to keep working{label ? ` as ${label}` : ''}.
          </div>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            onKeyDown={(e) => { if (e.key === 'Enter' && pin.length >= 4) submit(); }}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" onClick={submit} disabled={busy || pin.length < 4}>
            {busy ? 'Unlocking…' : 'Unlock'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
