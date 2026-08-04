import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,

  // Internal packages ship TypeScript source rather than a build artifact, so
  // there is no compile step to keep in sync and no stale dist to debug.
  transpilePackages: [
    '@atlas/ui',
    '@atlas/core',
    '@atlas/db',
    '@atlas/types',
    '@atlas/logger',
    '@atlas/env',
  ],

  // Produces a self-contained server bundle for the runtime image; see
  // infrastructure/docker/web.Dockerfile.
  output: 'standalone',

  experimental: {
    // Server Actions accept requests only from these origins. Without it a
    // page on another host could invoke an action against a user's session.
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // HSTS is set here rather than at the proxy so the guarantee travels
          // with the application if the proxy is ever replaced.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]);
  },
};

export default config;
