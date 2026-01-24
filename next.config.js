/** @type {import('next').NextConfig} */
// PWA disabled - removed withPWA wrapper to prevent ServiceWorker registration errors
// To re-enable PWA later, uncomment and configure:
// const withPWA = require('next-pwa')({ dest: 'public', register: true, skipWaiting: true });

const nextConfig = {
  reactStrictMode: true,

  // Disable standalone output for Windows development (causes symlink issues)
  output: 'standalone',
  
  // Fix workspace root detection for monorepo
  outputFileTracingRoot: require('path').join(__dirname),
  
  // PWA configuration
  experimental: {
    forceSwcTransforms: true,
  },

  // Environment variables validation
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.truload.example.com',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

