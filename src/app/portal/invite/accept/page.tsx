/**
 * Portal Invite Accept Page
 *
 * Public-facing page that reads `?token=` from the URL and allows
 * an authenticated user to accept a portal team invitation.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAcceptPortalInvite } from '@/hooks/queries/usePortalQueries';
import { useAuthStore } from '@/stores/auth.store';
import { CheckCircle2, LogIn, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AcceptPortalInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const { isAuthenticated, user } = useAuthStore();
  const acceptInvite = useAcceptPortalInvite();

  const [userName, setUserName] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill userName from auth store if available
  useEffect(() => {
    if (user?.fullName && !userName) {
      setUserName(user.fullName);
    }
  }, [user, userName]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setStatus('error');
      setErrorMessage('No invitation token found. Please check your invitation link.');
      return;
    }

    if (!userName.trim()) {
      toast.error('Please enter your name.');
      return;
    }

    try {
      await acceptInvite.mutateAsync({ token, userName: userName.trim() });
      setStatus('success');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to accept invitation. It may have expired or already been used.';
      setStatus('error');
      setErrorMessage(msg);
    }
  };

  if (!token) {
    return (
      <PageWrapper>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle>Invalid Invitation Link</CardTitle>
            <CardDescription>
              No invitation token was found in this link. Please check your invitation email and try
              again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild variant="outline" className="w-full">
              <Link href="/portal/dashboard">Go to Portal</Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  if (status === 'success') {
    return (
      <PageWrapper>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <CardTitle>Invitation Accepted!</CardTitle>
            <CardDescription>
              You now have access to the transporter portal. Click below to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href="/portal/dashboard">Go to Portal Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  if (status === 'error') {
    return (
      <PageWrapper>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle>Invitation Failed</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild variant="outline" className="w-full">
              <Link href="/portal/dashboard">Go to Portal</Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageWrapper>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <LogIn className="h-12 w-12 text-blue-500 mx-auto mb-2" />
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You need to be signed in to accept this portal invitation. If you don&apos;t have an
              account, please create one first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link
                href={`/auth/login?redirect=${encodeURIComponent(`/portal/invite/accept?token=${token}`)}`}
              >
                Sign In
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link
                href={`/auth/register?redirect=${encodeURIComponent(`/portal/invite/accept?token=${token}`)}`}
              >
                Create Account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Accept Portal Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a transporter portal team. Confirm your details below
            to accept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Your Name</Label>
              <Input
                id="user-name"
                type="text"
                placeholder="Your full name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                This is how you&apos;ll appear to other team members.
              </p>
            </div>

            <Button type="submit" disabled={acceptInvite.isPending} className="w-full">
              {acceptInvite.isPending ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <Image
          src="/truload-logo.svg"
          alt="TruLoad"
          width={160}
          height={48}
          className="h-12 w-auto object-contain mx-auto"
        />
      </div>
      {children}
    </div>
  );
}
