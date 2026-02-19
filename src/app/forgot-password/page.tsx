'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendPasswordResetEmail } from '@/lib/api/setup';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import kuraWeighLogo from '@/../public/images/logos/kuraweigh-logo.png';
import bgImage from '@/../public/images/background-images/login-background-image.png';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(data.email);
      setIsSubmitted(true);
    } catch {
      // Always show success message to prevent email enumeration
      setIsSubmitted(true);
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

          {isSubmitted ? (
            <Card className="w-full border-none shadow-none">
              <CardContent className="flex flex-col items-center px-0 pt-2 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-[#0a9f3d]" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-gray-900">Check Your Email</h2>
                <p className="mb-6 text-sm text-gray-600">
                  If an account exists with that email address, we&apos;ve sent password reset
                  instructions. Please check your inbox and spam folder.
                </p>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="gap-2 border-[#0a9f3d] text-[#0a9f3d] hover:bg-[#0a9f3d]/5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full border-none shadow-none">
              <CardContent className="px-0 pt-2">
                <div className="mb-6 text-center">
                  <h2 className="mb-1 text-xl font-semibold text-gray-900">Forgot Password?</h2>
                  <p className="text-sm text-gray-600">
                    Enter your email address and we&apos;ll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-800">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        {...register('email')}
                        disabled={isSubmitting}
                        className={`h-11 rounded-md border ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : 'border-[#e5e8ec] focus-visible:ring-[#0a9f3d]'} bg-[#f2f3f5] pl-10 text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-0`}
                      />
                    </div>
                    {errors.email && (
                      <p className="flex items-center gap-1 text-sm text-red-500">
                        <span className="text-xs">!</span>
                        {errors.email.message}
                      </p>
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
                        Sending...
                      </span>
                    ) : (
                      'Send Reset Link'
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
