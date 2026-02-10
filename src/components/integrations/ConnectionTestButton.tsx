'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, PlugZap, XCircle } from 'lucide-react';
import type { TestConnectivityResult } from '@/lib/api/integration';

type TestState = 'idle' | 'testing' | 'success' | 'failure';

interface ConnectionTestButtonProps {
  onTest: () => Promise<TestConnectivityResult>;
  disabled?: boolean;
  className?: string;
}

export function ConnectionTestButton({ onTest, disabled, className }: ConnectionTestButtonProps) {
  const [state, setState] = useState<TestState>('idle');
  const [result, setResult] = useState<TestConnectivityResult | null>(null);

  const handleTest = async () => {
    setState('testing');
    setResult(null);
    try {
      const res = await onTest();
      setResult(res);
      setState(res.success ? 'success' : 'failure');
    } catch {
      setResult({ success: false, provider: '', message: 'Connection test failed' });
      setState('failure');
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant={state === 'success' ? 'outline' : 'secondary'}
        size="sm"
        onClick={handleTest}
        disabled={disabled || state === 'testing'}
        className={`gap-1.5 transition-colors ${
          state === 'success'
            ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            : state === 'failure'
              ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
              : ''
        }`}
      >
        {state === 'testing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {state === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
        {state === 'failure' && <XCircle className="h-3.5 w-3.5" />}
        {state === 'idle' && <PlugZap className="h-3.5 w-3.5" />}
        {state === 'testing' ? 'Testing...' : state === 'success' ? 'Connected' : state === 'failure' ? 'Failed' : 'Test Connection'}
      </Button>

      {/* Result message */}
      {result && (
        <p
          className={`mt-2 text-xs ${
            result.success ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
