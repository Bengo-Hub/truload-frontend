/**
 * Login page aligned to Figma KURAWeigh design.
 * Split layout with left form panel and right background image.
 */

import { LoginForm } from '@/components/auth/LoginForm';
import Image from 'next/image';
import { Suspense } from 'react';

import bgImage from '@/../public/images/background-images/login-background-image.png';
import kuraLogo from '@/../public/images/logos/kura-logo.png';
import kuraWeighLogo from '@/../public/images/logos/kuraweigh-logo.png';

export default function LoginPage() {
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

          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="h-6" />
        </div>
      </div>

      {/* Right panel */}
      <div className="relative hidden lg:block lg:w-3/5">
        <Image
          src={bgImage}
          alt="Login background"
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 0"
          className="object-cover"
        />
        <div className="absolute bottom-6 right-6 rounded-2xl bg-white/80 p-3 shadow-md">
          <Image
            src={kuraLogo}
            alt="KURA - Kenya Urban Roads Authority"
            width={120}
            height={80}
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}
