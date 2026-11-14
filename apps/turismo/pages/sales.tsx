'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AnfitriaoRoleGuard from '../components/AnfitriaoRoleGuard';
import { RsvCrmShell } from '../components/lintel/rsv-crm-shell';
import { useCrmLocale } from '../components/lintel/crm-locale-provider';

function SalesPageHead() {
  const { copy } = useCrmLocale();
  return (
    <Head>
      <title>{copy.nav.sales} | {copy.brand}</title>
      <meta name="description" content="Portfólio de imóveis para venda e inteligência de mercado Lintel RSV360" />
    </Head>
  );
}

/** Rota Sales — alinhada ao padrão Lintel de Locações e Overview (Overview › Vendas). */
export default function SalesPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    void router.replace({ pathname: '/overview', query: { tab: 'sales' } });
  }, [router, router.isReady]);

  return (
    <AnfitriaoRoleGuard>
      <RsvCrmShell>
        <SalesPageHead />
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-gray-500">
          Carregando portfólio de vendas…
        </div>
      </RsvCrmShell>
    </AnfitriaoRoleGuard>
  );
} 