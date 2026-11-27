/** @type {import('next').NextConfig} */
const path = require('path');
const { getNextSecurityHeaders } = require('../../packages/shared/security-headers.cjs');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@rsv360/shared', '@rsv360/ui'],
  serverExternalPackages: ['pg', 'ioredis', 'sharp', 'nodemailer'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'reserveiviagens.com.br',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...getNextSecurityHeaders(),
          {
            key: 'Permissions-Policy',
            value: 'unload=*, geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },
  // Proxy /uploads to backend at Next server runtime (INTERNAL_API_URL).
  // Browser uses relative /uploads/... — avoids NEXT_PUBLIC build-time coupling.
  async redirects() {
    return [
      {
        source: '/cotacao/wizard',
        destination: '/cotacao',
        permanent: true,
      },
      {
        source: '/cotacao/wizard/:path*',
        destination: '/cotacao',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const backend =
      process.env.INTERNAL_API_URL ||
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3002';
    return [
      {
        source: '/uploads/:path*',
        destination: `${backend.replace(/\/$/, '')}/uploads/:path*`,
      },
      {
        source: '/api/cotacao/taxa-hospede-publica',
        destination: `${backend.replace(/\/$/, '')}/api/v1/cotacao-publica/taxa-hospede-publica`,
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  webpack(config) {
    const patchCssLoader = (rules) => {
      if (!rules) return;
      for (const rule of rules) {
        if (rule.oneOf) patchCssLoader(rule.oneOf);
        const uses = rule.use
          ? Array.isArray(rule.use)
            ? rule.use
            : [rule.use]
          : [];
        for (const use of uses) {
          if (
            use &&
            typeof use === 'object' &&
            use.loader &&
            String(use.loader).includes('css-loader') &&
            use.options
          ) {
            use.options.url = false;
          }
        }
      }
    };
    patchCssLoader(config.module.rules);
    return config;
  },
};

module.exports = nextConfig;
