'use client';

/**
 * Public forgot-password page. Submits email to request password reset link.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendPasswordResetEmail } from '@/lib/api/setup';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(email.trim());
      setSubmitted(true);
      toast.success('If an account exists, you will receive a password reset link.');
    } catch {
      toast.success('If an account exists, you will receive a password reset link.');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 to-emerald-50/30">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center">
            <Link href="/auth/login" className="mb-4">
              <Image
                src="/images/logos/kuraweigh-logo.png"
                alt="TruLoad"
                width={180}
                height={48}
                className="h-12 w-auto"
              />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Forgot password</h1>
            <p className="mt-1 text-center text-sm text-gray-600">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <Card className="border-gray-200/80 bg-white/95 shadow-sm">
            <CardHeader className="pb-2" />
            <CardContent className="pt-0">
              {submitted ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Check your email for a link to reset your password. If you don&apos;t see it, check your spam folder.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/auth/login">Back to sign in</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                    {loading ? 'Sending…' : 'Send reset link'}
                  </Button>
                </form>
              )}
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
