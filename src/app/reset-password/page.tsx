'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPasswordWithToken } from '@/lib/api/setup';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import kuraWeighLogo from '@/../public/images/logos/kuraweigh-logo.png';
import bgImage from '@/../public/images/background-images/login-background-image.png';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one digit'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';
  const token = searchParams?.get('token') || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const isValidRequest = email && token;

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!isValidRequest) {
      toast.error('Invalid or expired reset link');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordWithToken(email, token, data.newPassword);
      setIsSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => router.push('/login'), 3000);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to reset password. The link may have expired.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left panel */}
      <div className="flex w-full flex-col justify-center px-6 py-10 lg:w-2/5 lg:px-12 lg:py-16">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <Image
              src={kuraWeighLogo}
              alt="KURAWeigh - Vehicle Weighing & Management System"
              width={360}
              height={120}
              priority
              className="h-auto w-full max-w-xs object-contain"
            />
          </div>

          {isSuccess ? (
            <Card className="w-full border-none shadow-none">
              <CardContent className="flex flex-col items-center px-0 pt-2 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-[#0a9f3d]" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-gray-900">Password Reset!</h2>
                <p className="mb-6 text-sm text-gray-600">
                  Your password has been reset successfully. Redirecting to sign in...
                </p>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="gap-2 border-[#0a9f3d] text-[#0a9f3d] hover:bg-[#0a9f3d]/5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go to Sign In
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : !isValidRequest ? (
            <Card className="w-full border-none shadow-none">
              <CardContent className="flex flex-col items-center px-0 pt-2 text-center">
                <h2 className="mb-2 text-xl font-semibold text-gray-900">Invalid Reset Link</h2>
                <p className="mb-6 text-sm text-gray-600">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
                <Link href="/forgot-password">
                  <Button className="gap-2 bg-[#0a9f3d] text-white hover:bg-[#088b35]">
                    Request New Link
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full border-none shadow-none">
              <CardContent className="px-0 pt-2">
                <div className="mb-6 text-center">
                  <h2 className="mb-1 text-xl font-semibold text-gray-900">Reset Your Password</h2>
                  <p className="text-sm text-gray-600">Enter your new password below.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-800">
                      New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        {...register('newPassword')}
                        disabled={isSubmitting}
                        className={`h-11 rounded-md border ${errors.newPassword ? 'border-red-500 focus-visible:ring-red-500' : 'border-[#e5e8ec] focus-visible:ring-[#0a9f3d]'} bg-[#f2f3f5] pl-10 pr-10 text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-0`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-sm text-red-500">{errors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-800">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        {...register('confirmPassword')}
                        disabled={isSubmitting}
                        className={`h-11 rounded-md border ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : 'border-[#e5e8ec] focus-visible:ring-[#0a9f3d]'} bg-[#f2f3f5] pl-10 pr-10 text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-0`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-md bg-[#0a9f3d] text-white transition-colors hover:bg-[#088b35]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Resetting...
                      </span>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#0a9f3d] hover:text-[#088b35] hover:underline"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="relative hidden lg:block lg:w-3/5">
        <Image
          src={bgImage}
          alt="Background"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
