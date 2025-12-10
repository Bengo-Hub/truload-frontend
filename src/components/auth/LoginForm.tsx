/**
 * Login form component aligned to Figma design.
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.7-4.1 2.7-6.9 0-.6-.1-1.3-.2-1.9H12Z" />
    <path fill="#34A853" d="M6.5 14.2l-.8.6-2.5 1.9c1.6 3.1 4.9 5.3 8.8 5.3 2.7 0 5-.9 6.7-2.5l-3.1-2.4c-.8.5-1.8.9-3.6.9-3.1 0-5.8-2.1-6.7-5Z" />
    <path fill="#4A90E2" d="M3.2 7.3C2.5 8.7 2.1 10.3 2.1 12s.4 3.3 1.1 4.7c0 .1 3.4-2.6 3.4-2.6-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9Z" />
    <path fill="#FBBC05" d="M12 4.8c1.9 0 3.2.8 4 1.5l3-2.9C17 1.9 14.7 1 12 1 8.1 1 4.7 3.2 3.1 6.4l3.4 2.6C7.3 6.9 9.9 4.8 12 4.8Z" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#F25022" d="M2 2h9.5v9.5H2Z" />
    <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5Z" />
    <path fill="#00A4EF" d="M2 12.5h9.5V22H2Z" />
    <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5Z" />
  </svg>
);


const loginSchema = z.object({
  email: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  tenantSlug: z.string().optional().default('kura'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = searchParams?.get('from') || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      tenantSlug: 'kura',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password, data.tenantSlug);
      toast.success('Login successful!');
      router.push(redirectTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

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

          <input type="hidden" {...register('tenantSlug')} />

          <Button
            type="submit"
            className="h-11 w-full rounded-md bg-[#0a9f3d] text-white transition-colors hover:bg-[#088b35]"
            disabled={isLoading}
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

          <div className="relative py-2 text-center text-xs uppercase text-gray-500">
            <span className="relative bg-white px-3">Or continue with</span>
            <span className="absolute inset-x-0 top-1/2 -z-10 h-px bg-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-center gap-2 rounded-md border border-[#e5e8ec] text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <GoogleIcon />
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-center gap-2 rounded-md border border-[#e5e8ec] text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <MicrosoftIcon />
              Microsoft
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
