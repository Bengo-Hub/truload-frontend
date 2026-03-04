/**
 * Login form component aligned to Figma design.
 * Handles 2FA: when backend returns requires2FA, shows TOTP/recovery code step.
 */

'use client';

import { TwoFactorCodeInput } from '@/components/auth/TwoFactorCodeInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { setLastLoginStation } from '@/lib/auth/lastLoginStation';
import { useAuthStore } from '@/stores/auth.store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/** Map API/status to user-friendly messages; avoid showing error codes. */
function toUserFriendlyMessage(status: number | undefined, rawMessage: string | undefined, error: unknown): string {
  if (status === 403) {
    if (rawMessage?.toLowerCase().includes('organisation')) return 'You are not assigned to this organisation.';
    if (rawMessage?.toLowerCase().includes('station')) return 'You can only sign in to your assigned station, or the station is invalid.';
    return rawMessage ?? 'You do not have permission to sign in here.';
  }
  if (status === 401) return rawMessage ?? 'Invalid email or password.';
  if (rawMessage && !/\b[A-Z0-9]{3,10}\b/.test(rawMessage)) return rawMessage;
  return rawMessage ?? (error instanceof Error ? error.message : 'Sign in failed. Please try again.');
}

/** Shared login form for platform and tenant. Tenant: pass orgSlug + optional stationCode (from pre-login station selection). */
interface LoginFormProps {
  /** 'platform' = no org/station in login; 'tenant' = send organizationCode and stationCode when provided */
  mode?: 'platform' | 'tenant';
  /** Organisation slug/code for tenant login and redirect (e.g. from /auth/login?org=kura or [orgSlug]/auth/login). */
  orgSlugOverride?: string;
  /** Station code from pre-login station selection (e.g. [orgSlug]/auth/login?station=HQ). */
  stationCode?: string;
  /** Primary brand colour for button and links (hex). */
  primaryColor?: string;
}

export function LoginForm({ mode = 'tenant', orgSlugOverride, stationCode, primaryColor = '#0a9f3d' }: LoginFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgFromRoute = useOrgSlug();
  const orgSlug = orgSlugOverride ?? orgFromRoute;
  const { login, isLoading } = useAuth();
  const pending2FA = useAuthStore((s) => s.pending2FA);
  const loginVerify2FA = useAuthStore((s) => s.loginVerify2FA);
  const clearPending2FA = useAuthStore((s) => s.clearPending2FA);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  const fromParam = searchParams?.get('from');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const options =
        mode === 'tenant' && orgSlug
          ? { organizationCode: orgSlug.toLowerCase(), stationCode: stationCode ?? undefined }
          : undefined;
      await login(data.email, data.password, options);
      if (useAuthStore.getState().pending2FA) {
        toast.info('Enter the code from your authenticator app');
        return;
      }
      toast.success('Login successful!');
      if (mode === 'tenant' && orgSlug && stationCode) {
        setLastLoginStation(orgSlug.toLowerCase(), stationCode);
      }
      const user = useAuthStore.getState().user;
      const slug = user?.organizationCode?.toLowerCase() || orgSlug;
      if (useAuthStore.getState().requires2FASetup) {
        toast.info('Your organization requires 2FA. Please set it up in your profile.');
        router.push(`/${slug}/profile`);
        return;
      }
      // Tenant login (e.g. /kura/auth/login): always go to tenant dashboard, including superusers
      if (mode === 'tenant' && orgSlug) {
        router.push(fromParam || `/${slug}/dashboard`);
        return;
      }
      // Platform login (/auth/login): superusers go to platform, tenant users to their org
      if (mode === 'platform') {
        if (user?.isSuperUser) {
          router.push('/platform');
          return;
        }
        if (user?.organizationCode) {
          router.push(`/${user.organizationCode.toLowerCase()}/auth`);
          return;
        }
        toast.error('You are not linked to any organisation. Please contact your administrator.');
        return;
      }
      router.push(fromParam || `/${slug}/dashboard`);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string; passwordExpired?: boolean; changePasswordToken?: string } } };
      if (err.response?.status === 401 && err.response?.data?.passwordExpired && err.response?.data?.changePasswordToken) {
        const token = encodeURIComponent(err.response.data.changePasswordToken);
        router.push(`/auth/change-expired-password?token=${token}`);
        toast.info('Your password has expired. Please set a new password.');
        return;
      }
      const rawMessage = (err.response?.data as { message?: string })?.message;
      const message = toUserFriendlyMessage(err.response?.status, rawMessage, error);
      toast.error(message);
    }
  };

  const on2FASubmit = async (code: string, useRecoveryCode: boolean) => {
    if (!pending2FA?.twoFactorToken) return;
    setIsVerifying2FA(true);
    try {
      await loginVerify2FA(pending2FA.twoFactorToken, code, useRecoveryCode);
      toast.success('Login successful!');
      if (mode === 'tenant' && orgSlug && stationCode) {
        setLastLoginStation(orgSlug.toLowerCase(), stationCode);
      }
      const user = useAuthStore.getState().user;
      const slug = user?.organizationCode?.toLowerCase() || orgSlug;
      if (mode === 'tenant' && orgSlug) {
        router.push(fromParam || `/${slug}/dashboard`);
        return;
      }
      if (mode === 'platform') {
        if (user?.isSuperUser) {
          router.push('/platform');
          return;
        }
        if (user?.organizationCode) {
          router.push(`/${user.organizationCode.toLowerCase()}/auth`);
          return;
        }
        toast.error('You are not linked to any organisation. Please contact your administrator.');
        return;
      }
      router.push(fromParam || `/${slug}/dashboard`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid code');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  if (pending2FA) {
    return (
      <Card className="w-full border-none shadow-none">
        <CardContent className="px-0 pt-2">
          <TwoFactorCodeInput
            onSubmit={on2FASubmit}
            loading={isVerifying2FA}
            onBack={() => clearPending2FA()}
            title="Two-factor authentication"
            description="Enter the 6-digit code from your authenticator app to complete sign in."
            submitLabel="Verify and sign in"
            showRecoveryCodeToggle={true}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-none shadow-none">
      <CardContent className="px-0 pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-800">
              Email Address
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="text"
                placeholder="Enter your email address"
                {...register('email')}
                disabled={isLoading}
                suppressHydrationWarning
                className={`h-11 rounded-md border ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : 'border-[#e5e8ec] focus-visible:ring-[#0a9f3d]'} bg-[#f2f3f5] pl-10 text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-0`}
              />
            </div>
            {errors.email && (
              <p className="flex items-center gap-1 text-sm text-red-500">
                <span className="text-xs">⚠</span>
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-800">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                {...register('password')}
                disabled={isLoading}
                suppressHydrationWarning
                className={`h-11 rounded-md border ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : 'border-[#e5e8ec] focus-visible:ring-[#0a9f3d]'} bg-[#f2f3f5] pl-10 pr-10 text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-0`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                tabIndex={-1}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="flex items-center gap-1 text-sm text-red-500">
                <span className="text-xs">⚠</span>
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <a
              href="/auth/forgot-password"
              className="text-sm font-medium hover:opacity-90 hover:underline"
              style={{ color: primaryColor }}
            >
              Forgot Password?
            </a>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-md text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
            disabled={isLoading}
            suppressHydrationWarning
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="relative flex items-center gap-4 py-2">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">OR CONTINUE WITH</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              disabled
            >
              <GoogleIcon className="mr-2 h-5 w-5" />
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              disabled
            >
              <MicrosoftIcon className="mr-2 h-5 w-5" />
              Microsoft
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
