import Head from 'next/head';
import Link from 'next/link';

/**
 * Aruanda C2 — propostas comerciais are delivered via site-publico email links.
 * This guest route must not pretend to list live proposals.
 */
export default function MinhasPropostasGuestPage() {
  return (
    <>
      <Head>
        <title>Minhas Propostas | Guest Portal</title>
      </Head>
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-xl font-bold text-slate-900">Minhas propostas</h1>
        <p
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          Indisponível neste portal — propostas comerciais não são listadas aqui.
        </p>
        <p className="text-sm text-slate-600">
          Use o link enviado por e-mail (site público) ou fale com a recepção pelas{' '}
          <Link href="/messages" className="font-medium text-slate-900 underline">
            Mensagens
          </Link>
          .
        </p>
      </div>
    </>
  );
}
