/** @type {import('next').NextConfig} */
const { getNextSecurityHeaders } = require('../../packages/shared/security-headers.cjs');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: true },
  experimental: {
    externalDir: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'reserveiviagens.com.br', pathname: '/**' },
      { protocol: 'https', hostname: 'www.reserveiviagens.com.br', pathname: '/**' },
      { protocol: 'https', hostname: 'via.placeholder.com', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: getNextSecurityHeaders(),
      },
    ];
  },
  /** Dev/local: same-origin /api/v1 → backend (:3002). Complements pages/api/v1/[...path].ts when Turbopack não registra o catch-all. */
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    const backend = (process.env.BACKEND_URL || process.env.INTERNAL_API_URL || 'http://localhost:3002').replace(
      /\/$/,
      '',
    );
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backend}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);

