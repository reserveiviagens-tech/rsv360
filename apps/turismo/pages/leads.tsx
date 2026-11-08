'use client';

import Head from 'next/head';
import Link from 'next/link';

export type LeadScoreTier = 'frio' | 'aquecendo' | 'quente' | 'qualificado';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  budget: string;
  propertyType: string;
  city: string;
  source: 'website' | 'portal' | 'instagram' | 'walkin' | 'referral';
  score: number;
  tier: LeadScoreTier;
  lastContact: string;
  favorites: boolean;
  assets: number;
}

/** Página de entrada Leads — inbox completo vive na aba Leads do overview. */
export default function LeadsPage() {
  return (
    <>
      <Head>
        <title>Leads | RSV360</title>
      </Head>
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-black text-[#121722]">Leads</h1>
        <p className="text-sm text-slate-600">
          Caixa de leads e scoring estão na aba <strong>Leads</strong> do painel executivo.
        </p>
        <Link
          href="/overview"
          className="rounded-full bg-[#121722] px-5 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          Ir para Overview
        </Link>
      </div>
    </>
  );
}
