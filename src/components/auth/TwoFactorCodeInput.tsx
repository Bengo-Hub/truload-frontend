'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const twoFactorCodeSchema = z.object({
  code: z.string().min(6, 'Enter the 6-digit code from your authenticator app'),
});

type TwoFactorCodeFormData = z.infer<typeof twoFactorCodeSchema>;

export interface TwoFactorCodeInputProps {
  /** Called with the code and whether user chose recovery code. */
  onSubmit: (code: string, useRecoveryCode: boolean) => void | Promise<void>;
  /** Disable input and button. */
  loading?: boolean;
  /** Optional back button callback (e.g. return to login form). */
  onBack?: () => void;
  /** Title above the input. */
  title?: string;
  /** Short description. */
  description?: string;
  /** Submit button label. */
  submitLabel?: string;
  /** Show "Use recovery code instead" toggle. Use true for login 2FA step, false for profile enable step. */
  showRecoveryCodeToggle?: boolean;
  /** Placeholder for the code input. */
  placeholder?: string;
  /** Input max length (6 for TOTP, 12 for recovery). Controlled by showRecoveryCodeToggle when not provided. */
  maxLength?: number;
  /** Additional class for the wrapper. */
  className?: string;
}

/**
 * Reusable 2FA code input for login verification and profile enable flow.
 * Use on public routes (login 2FA step) and in user profile (enable 2FA verify step).
 */
export function TwoFactorCodeInput({
  onSubmit,
  loading = false,
  onBack,
  title = 'Two-factor authentication',
  description = 'Enter the 6-digit code from your authenticator app to complete sign in.',
  submitLabel = 'Verify and sign in',
  showRecoveryCodeToggle = true,
  placeholder = '000000',
  maxLength,
  className = '',
}: TwoFactorCodeInputProps) {
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const form = useForm<TwoFactorCodeFormData>({
    resolver: zodResolver(twoFactorCodeSchema),
    defaultValues: { code: '' },
  });

  const effectivePlaceholder = useRecoveryCode ? 'Recovery code' : placeholder;
  const effectiveMaxLength = maxLength ?? (useRecoveryCode ? 12 : 6);

  const handleSubmit = form.handleSubmit(async (data) => {
    const code = data.code.replace(/\s/g, '').replace(/-/g, '');
    await onSubmit(code, useRecoveryCode);
    form.reset();
  });

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 text-[#0a9f3d]">
        <ShieldCheck className="h-5 w-5" />
        <span className="font-medium">{title}</span>
      </div>
      {description && <p className="text-sm text-gray-600">{description}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="2fa-code">Verification code</Label>
          <Input
            id="2fa-code"
            type="text"
            inputMode="numeric"
            placeholder={effectivePlaceholder}
            maxLength={effectiveMaxLength}
            {...form.register('code')}
            disabled={loading}
            className="h-11 font-mono text-lg tracking-widest"
          />
          {form.formState.errors.code && (
            <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>
          )}
        </div>
        {showRecoveryCodeToggle && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[#0a9f3d]"
            onClick={() => setUseRecoveryCode((v) => !v)}
          >
            {useRecoveryCode ? 'Use authenticator app' : 'Use recovery code instead'}
          </Button>
        )}
        <div className="flex gap-2">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={loading}
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1 bg-[#0a9f3d] hover:bg-[#088b35]"
            disabled={loading}
          >
            {loading ? 'Verifying...' : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
