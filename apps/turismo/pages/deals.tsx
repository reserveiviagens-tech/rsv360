'use client';

import Head from 'next/head';
import Link from 'next/link';
import AnfitriaoRoleGuard from '../components/AnfitriaoRoleGuard';
import { DealsCrmModule } from '../components/deals/deals-crm-module';
import { RsvCrmShell } from '../components/lintel/rsv-crm-shell';
import { LintelHeaderActions } from '../components/lintel/lintel-header-actions';
import { LintelShellNav } from '../components/lintel/lintel-shell-nav';
import { CrmBrandMark } from '../components/lintel/crm-brand-mark';
import { useCrmLocale } from '../components/lintel/crm-locale-provider';

function DealsPageHead() {
  const { copy } = useCrmLocale();
  return (
    <Head>
      <title>
        {copy.nav.deals} | {copy.brand}
      </title>
      <meta name="description" content={copy.deals.metaDescription} />
    </Head>
  );
}

function DealsPageContent() {
  const { copy } = useCrmLocale();
  const d = copy.deals;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1116]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#121722]/80 sm:px-6">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CrmBrandMark />
          <LintelShellNav />
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/anfitriao/admin/carteira-corretor"
              className="hidden text-xs font-medium text-slate-500 underline underline-offset-2 transition hover:text-slate-700 sm:inline dark:hover:text-slate-300"
            >
              {d.fullPortfolio}
            </Link>
            <LintelHeaderActions />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6">
        <DealsCrmModule isActive bootOnActivate={false} />
      </main>
    </div>
  );
}

export default function DealsPage() {
  return (
    <AnfitriaoRoleGuard>
      <RsvCrmShell>
        <DealsPageHead />
        <DealsPageContent />
      </RsvCrmShell>
    </AnfitriaoRoleGuard>
  );
}
