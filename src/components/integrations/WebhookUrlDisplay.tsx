'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Copy, Webhook } from 'lucide-react';

interface WebhookUrlDisplayProps {
  webhookUrl?: string;
  callbackUrl?: string;
  className?: string;
}

function CopyableUrl({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      const input = document.querySelector<HTMLInputElement>(`[data-url="${label}"]`);
      input?.select();
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={url}
          data-url={label}
          className="font-mono text-xs bg-gray-50 text-gray-600 h-9"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function WebhookUrlDisplay({ webhookUrl, callbackUrl, className }: WebhookUrlDisplayProps) {
  if (!webhookUrl && !callbackUrl) return null;

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <Webhook className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-gray-900">Webhook Configuration</h4>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Auto-generated from your app&apos;s base URL. Configure these in your payment provider&apos;s dashboard.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {webhookUrl && <CopyableUrl label="IPN Webhook URL" url={webhookUrl} />}
        {callbackUrl && <CopyableUrl label="Payment Callback URL" url={callbackUrl} />}
      </div>
    </div>
  );
}
