'use client';

/**
 * Public reset-password page. Token and email from query; user enters new password.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildPasswordSchema } from '@/lib/auth/passwordPolicyValidation';
import { resetPasswordWithToken } from '@/lib/api/setup';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') ?? '';
  const token = searchParams?.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const schema = buildPasswordSchema(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) {
      toast.error('Invalid or expired reset link. Request a new one from the forgot password page.');
      return;
    }
    const parsed = schema.safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Password does not meet policy.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithToken(email, token, password, confirm);
      setSuccess(true);
      toast.success('Password reset successfully. You can now sign in.');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to reset password. The link may have expired.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50/30 px-4">
        <Card className="w-full max-w-md border-gray-200/80 bg-white/95 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-gray-600">
              Invalid or missing reset link. Please use the link from your email or{' '}
              <Link href="/auth/forgot-password" className="font-medium text-emerald-600 hover:underline">
                request a new one
              </Link>
              .
            </p>
            <Button asChild className="mt-4 w-full">
              <Link href="/auth/login">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50/30 px-4">
        <Card className="w-full max-w-md border-gray-200/80 bg-white/95 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-gray-600">Your password has been reset. You can now sign in.</p>
            <Button asChild className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 to-emerald-50/30">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center">
            <Link href="/auth/login" className="mb-4">
              <Image src="/images/logos/kuraweigh-logo.png" alt="TruLoad" width={180} height={48} className="h-12 w-auto" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Set new password</h1>
          </div>
          <Card className="border-gray-200/80 bg-white/95 shadow-sm">
            <CardHeader className="pb-2" />
            <CardContent className="pt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                  {loading ? 'Resetting…' : 'Reset password'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <p className="text-center">
            <Link href="/auth/login" className="text-sm font-medium text-emerald-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
