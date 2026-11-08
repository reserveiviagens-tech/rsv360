import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        {/* Meta tags básicas */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="author" content="Douglas P. Figueiredo" />
        <meta name="copyright" content="© 2024-2026 Reservei Viagens LTDA" />
        
        {/* Preconnect para melhor performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://analytics.tiktok.com" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        {/* Legacy Docker bundles that still target :3002 */}
        <script src="/rsv360-same-origin-api.js" defer={false} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 
