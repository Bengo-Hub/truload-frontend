import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { PWARegister } from '@/components/PWARegister';
import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'TruLoad - Intelligent Weighing Solution',
  description: 'Cloud-hosted weighing and enforcement solution for road authorities',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TruLoad',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-maskable.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#5B1C4D',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#5B1C4D" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TruLoad" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon-maskable.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-maskable.svg" />
        <link rel="mask-icon" href="/icon-maskable.svg" color="#5B1C4D" />
      </head>
      <body className={`${inter.className} ${orbitron.variable}`}>
        <ErrorBoundary>
          <Providers>
            <OfflineIndicator />
            {children}
          </Providers>
          <PWARegister />
        </ErrorBoundary>
      </body>
    </html>
  );
}

