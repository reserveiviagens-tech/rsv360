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
};

module.exports = withBundleAnalyzer(nextConfig);

