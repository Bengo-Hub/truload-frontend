'use client';

/**
 * Offline PIN enrollment (profile → Security). Lets a signed-in user set a PIN that encrypts
 * their session at rest so they can unlock TruLoad offline. Set/replace requires an online
 * session (the current tokens are what get encrypted). Opt-in; nothing happens until used.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, ShieldOff, KeyRound } from 'lucide-react';
import {
  enrollOfflinePin,
  disableOfflinePin,
  isOfflinePinEnabled,
} from '@/lib/auth/offlinePinSession';

export function OfflinePinSettings() {
  const [enabled, setEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => setEnabled(isOfflinePinEnabled()), []);

  const reset = () => { setPin(''); setConfirm(''); };

  const onSet = async () => {
    setMsg(null);
    if (pin !== confirm) { setMsg({ kind: 'err', text: 'PINs do not match.' }); return; }
    setBusy(true);
    try {
      await enrollOfflinePin(pin);
      setEnabled(true);
      reset();
      setMsg({ kind: 'ok', text: 'Offline PIN set. You can unlock TruLoad offline with it.' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Could not set PIN.' });
    } finally {
      setBusy(false);
    }
  };

  const onDisable = () => {
    disableOfflinePin();
    setEnabled(false);
    reset();
    setMsg({ kind: 'ok', text: 'Offline PIN removed.' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" /> Offline PIN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Set a 4–8 digit PIN to unlock TruLoad when there is no connection. Your session is
          encrypted on this device with the PIN — it is never sent to the server and only unlocks
          offline work; you still sign in normally online.
        </p>

        {enabled ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <span className="flex items-center gap-2 text-sm text-emerald-800">
              <ShieldCheck className="h-4 w-4" /> Offline PIN is enabled on this device.
            </span>
            <Button variant="outline" size="sm" onClick={onDisable}>
              <ShieldOff className="mr-1 h-4 w-4" /> Remove
            </Button>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder={enabled ? 'New PIN' : 'PIN (4–8 digits)'}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          />
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Confirm PIN"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
          />
        </div>

        {msg && (
          <p className={`text-sm ${msg.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
            {msg.text}
          </p>
        )}

        <Button onClick={onSet} disabled={busy || pin.length < 4 || confirm.length < 4}>
          {busy ? 'Saving…' : enabled ? 'Replace PIN' : 'Set offline PIN'}
        </Button>
      </CardContent>
    </Card>
  );
}
