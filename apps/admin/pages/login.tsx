import { useEffect } from 'react';
import Head from 'next/head';

const SITE_PUBLICO_ADMIN_LOGIN =
  process.env.NEXT_PUBLIC_SITE_PUBLICO_URL?.replace(/\/$/, '') || 'http://localhost:3000';

/**
 * Aruanda C3 — Admin does not reimplement MFA.
 * Deep-link operators to site-publico `/admin/login`.
 */
export default function AdminLoginRedirectPage() {
  useEffect(() => {
    const target = `${SITE_PUBLICO_ADMIN_LOGIN}/admin/login`;
    window.location.replace(target);
  }, []);

  return (
    <>
      <Head>
        <title>Login | RSV360 Admin</title>
      </Head>
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6">
        <h1 className="text-xl font-bold text-slate-900">Login administrativo</h1>
        <p className="text-sm text-slate-600" role="status">
          Redirecionando para o login MFA do site público…
        </p>
        <a
          className="text-sm font-medium text-slate-900 underline"
          href={`${SITE_PUBLICO_ADMIN_LOGIN}/admin/login`}
        >
          Abrir {SITE_PUBLICO_ADMIN_LOGIN}/admin/login
        </a>
      </main>
    </>
  );
}
