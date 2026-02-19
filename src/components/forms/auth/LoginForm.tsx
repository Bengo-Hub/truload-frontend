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

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
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

          <div className="flex items-center justify-end">
            <a
              href="/forgot-password"
              className="text-sm font-medium text-[#0a9f3d] hover:text-[#088b35] hover:underline"
            >
              Forgot Password?
            </a>
          </div>

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
        </form>
      </CardContent>
    </Card>
  );
}
