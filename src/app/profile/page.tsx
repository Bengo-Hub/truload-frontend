/**
 * Profile page aligned with Figma modal content.
 */

'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  use2FAStatus,
  useDisable2FA,
  useEnable2FA,
  useGenerate2FASetup,
} from '@/hooks/queries/useTwoFactorQueries';
import { useUser } from '@/hooks/useAuth';
import { changePassword } from '@/lib/auth/api';
import { AlertTriangle, Building, Calendar, CheckCircle2, KeyRound, Loader2, Mail, Phone, Shield, ShieldCheck, Smartphone, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword, confirmNewPassword);
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your password to keep your account secure</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TwoFactorCard() {
  const { data: status, isLoading: statusLoading } = use2FAStatus();
  const generateSetup = useGenerate2FASetup();
  const enable2FA = useEnable2FA();
  const disable2FA = useDisable2FA();

  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'disable'>('idle');
  const [verificationCode, setVerificationCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const isEnabled = status?.isEnabled ?? false;

  const handleStartSetup = async () => {
    try {
      await generateSetup.mutateAsync();
      setStep('setup');
    } catch {
      toast.error('Failed to generate 2FA setup');
    }
  };

  const handleEnable = async () => {
    try {
      const result = await enable2FA.mutateAsync({ verificationCode });
      if (result.recoveryCodes?.length) {
        setRecoveryCodes(result.recoveryCodes);
      }
      setVerificationCode('');
      setStep('idle');
      toast.success('Two-factor authentication enabled');
    } catch {
      toast.error('Invalid verification code');
    }
  };

  const handleDisable = async () => {
    try {
      await disable2FA.mutateAsync({ password: disablePassword });
      setDisablePassword('');
      setStep('idle');
      setRecoveryCodes([]);
      toast.success('Two-factor authentication disabled');
    } catch {
      toast.error('Failed to disable 2FA. Check your password.');
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading 2FA status...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security using an authenticator app
            </CardDescription>
          </div>
          <Badge variant={isEnabled ? 'default' : 'secondary'} className={isEnabled ? 'bg-green-100 text-green-700' : ''}>
            {isEnabled ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Enabled</>
            ) : (
              <><AlertTriangle className="h-3 w-3 mr-1" /> Disabled</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recovery codes display */}
        {recoveryCodes.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Save your recovery codes
            </p>
            <p className="text-xs text-amber-700">
              Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
            </p>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {recoveryCodes.map((code) => (
                <code key={code} className="text-xs bg-white px-2 py-1 rounded border font-mono">
                  {code}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Idle state */}
        {step === 'idle' && !isEnabled && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-sm text-muted-foreground">
                Protect your account by requiring a verification code from your authenticator app in addition to your password.
              </p>
            </div>
            <Button
              onClick={handleStartSetup}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={generateSetup.isPending}
            >
              {generateSetup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <ShieldCheck className="h-4 w-4 mr-2" />
              Enable 2FA
            </Button>
          </div>
        )}

        {step === 'idle' && isEnabled && (
          <div className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Your account is protected with two-factor authentication.
              </p>
              {status?.recoveryCodesRemaining !== undefined && (
                <p className="text-xs text-green-600 mt-1">
                  Recovery codes remaining: {status.recoveryCodesRemaining}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setStep('disable')}
            >
              Disable 2FA
            </Button>
          </div>
        )}

        {/* Setup step: show QR code */}
        {step === 'setup' && generateSetup.data && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
              <p className="text-sm font-medium">
                1. Scan this QR code with your authenticator app
              </p>
              {generateSetup.data.qrCodeDataUrl ? (
                <div className="flex justify-center">
                  <img
                    src={generateSetup.data.qrCodeDataUrl}
                    alt="2FA QR Code"
                    className="w-48 h-48 rounded-lg border"
                  />
                </div>
              ) : null}
              {generateSetup.data.sharedKey && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Or enter this key manually:
                  </p>
                  <code className="text-xs bg-white px-2 py-1 rounded border font-mono select-all">
                    {generateSetup.data.sharedKey}
                  </code>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                2. Enter the 6-digit code from your app
              </p>
              <div className="flex gap-2 max-w-xs">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-lg tracking-widest font-mono"
                />
                <Button
                  onClick={handleEnable}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={verificationCode.length !== 6 || enable2FA.isPending}
                >
                  {enable2FA.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep('idle')}>
              Cancel
            </Button>
          </div>
        )}

        {/* Disable step: require password */}
        {step === 'disable' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                Disabling 2FA will make your account less secure. Enter your password to confirm.
              </p>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="disablePassword">Password</Label>
              <Input
                id="disablePassword"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={!disablePassword || disable2FA.isPending}
              >
                {disable2FA.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Disable 2FA
              </Button>
              <Button variant="ghost" onClick={() => { setStep('idle'); setDisablePassword(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);

  const fullName = user?.fullName || '';
  const [firstName, lastName] = fullName.split(' ').length > 1
    ? [fullName.split(' ')[0], fullName.split(' ').slice(1).join(' ')]
    : [fullName, ''];

  return (
    <ProtectedRoute>
      <AppShell title="My Account" subtitle="Manage your profile and account settings">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-1/2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 pt-4">
            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>{fullName}{user?.roles?.[0] ? ` - ${user.roles[0]}` : ''}</CardDescription>
                </div>
                <Avatar className="h-16 w-16 bg-emerald-600 text-white">
                  <User className="h-8 w-8" />
                </Avatar>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue={firstName} disabled={!isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue={lastName} disabled={!isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        defaultValue={user?.email || ''}
                        disabled={!isEditing}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input id="phone" defaultValue={user?.phoneNumber || ''} disabled={!isEditing} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input id="role" defaultValue={user?.roles?.[0] || '—'} disabled className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input id="organization" defaultValue={user?.organizationId || '—'} disabled className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="station">Station</Label>
                    <Input id="station" defaultValue={user?.stationId || '—'} disabled={!isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateJoined">Date Joined</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input id="dateJoined" defaultValue={user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-GB') : '—'} disabled className="pl-9" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  {isEditing ? (
                    <>
                      <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setIsEditing(false)}>
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 pt-4">
            <ChangePasswordCard />
            <TwoFactorCard />
          </TabsContent>
        </Tabs>
      </AppShell>
    </ProtectedRoute>
  );
}
