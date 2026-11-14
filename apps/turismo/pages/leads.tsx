'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Search,
  Flame,
  Phone,
  Mail,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import AnfitriaoRoleGuard from '../components/AnfitriaoRoleGuard';
import { RsvCrmShell } from '../components/lintel/rsv-crm-shell';
import { CrmBrandMark } from '../components/lintel/crm-brand-mark';
import { LintelHeaderActions } from '../components/lintel/lintel-header-actions';
import { LintelPrimaryActions } from '../components/lintel/lintel-primary-actions';
import { LintelShellNav } from '../components/lintel/lintel-shell-nav';
import { useCrmLocale } from '../components/lintel/crm-locale-provider';
import { maskEmail, maskPhone } from '@/lib/pii-mask';
import { fetchLeads, LeadPageCard } from '@/lib/overview-leads';

export interface LeadItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  score: number;
  intent: 'buy' | 'rent' | 'sell';
  budget: string;
  source: string;
  time: string;
  status: 'new' | 'contacted' | 'qualified';
  fitFactors: {
    budgetFit: number;
    timeline: number;
    financing: number;
  };
  notes?: string;
}

export const SAMPLE_LEADS: LeadItem[] = [
  {
    id: 'l1',
    name: 'James Thornwood',
    email: 'j.thornwood@apexholdings.co.uk',
    phone: '+44 7700 900123',
    score: 94,
    intent: 'buy',
    budget: '$1.4M – $1.8M',
    source: 'Luxury Portfolio Web',
    time: '12m ago',
    status: 'new',
    fitFactors: { budgetFit: 96, timeline: 92, financing: 100 },
    notes: 'Interesse prioritário em penthouses e flats com vista direta para a marina.',
  },
  {
    id: 'l2',
    name: 'Sophia Chen',
    email: 'sophia@chen-architects.com',
    phone: '+44 7700 900891',
    score: 86,
    intent: 'buy',
    budget: '$950k – $1.2M',
    source: 'Website Valuation',
    time: '1h ago',
    status: 'new',
    fitFactors: { budgetFit: 90, timeline: 80, financing: 95 },
    notes: 'Buscando imóveis com projeto arquitetônico moderno e sustentável.',
  },
  {
    id: 'l3',
    name: 'Rafael Albuquerque',
    email: 'rafael.albuquerque@gestao.com.br',
    phone: '+55 11 98765-4321',
    score: 96,
    intent: 'buy',
    budget: 'R$ 2.8M – R$ 3.5M',
    source: 'Indicação VIP',
    time: '15m ago',
    status: 'new',
    fitFactors: { budgetFit: 98, timeline: 95, financing: 100 },
    notes: 'Diretor de Family Office em busca de ativos premium para renda imediata.',
  },
  {
    id: 'l4',
    name: 'David Miller',
    email: 'david.miller@gmail.com',
    phone: '+44 7700 900331',
    score: 72,
    intent: 'rent',
    budget: '$3,500/mo',
    source: 'Rightmove',
    time: '3h ago',
    status: 'contacted',
    fitFactors: { budgetFit: 78, timeline: 75, financing: 70 },
    notes: 'Contrato corporativo para relocação de 2 anos.',
  },
  {
    id: 'l5',
    name: 'Camila Mendonça',
    email: 'camila.mendonca@adv.br',
    phone: '+55 48 99123-8877',
    score: 91,
    intent: 'rent',
    budget: 'R$ 9.000/mês',
    source: 'Portal RSV360',
    time: '2h ago',
    status: 'new',
    fitFactors: { budgetFit: 94, timeline: 90, financing: 100 },
    notes: 'Locação anual em Jurerê ou Beira-Mar com fiador aprovado.',
  },
  {
    id: 'l6',
    name: 'Eduardo Fontes',
    email: 'eduardo.fontes@investholding.com',
    phone: '+55 21 98877-6655',
    score: 84,
    intent: 'sell',
    budget: 'R$ 4.500.000',
    source: 'Avaliação Online',
    time: '4h ago',
    status: 'new',
    fitFactors: { budgetFit: 88, timeline: 82, financing: 85 },
    notes: 'Proprietário de cobertura duplex no Leblon interessado em exclusividade.',
  },
  {
    id: 'l7',
    name: 'Rachel Green',
    email: 'r.green@fashionpulse.co.uk',
    phone: '+44 7700 900442',
    score: 58,
    intent: 'rent',
    budget: '$2,200/mo',
    source: 'Instagram Ad',
    time: '1d ago',
    status: 'contacted',
    fitFactors: { budgetFit: 60, timeline: 55, financing: 60 },
    notes: 'Procura studios mobiliados em áreas centrais.',
  },
  {
    id: 'l8',
    name: 'Marina Silveira',
    email: 'marina.silveira@techgroup.io',
    phone: '+55 54 99655-4433',
    score: 65,
    intent: 'rent',
    budget: 'R$ 4.200/mês',
    source: 'Google Ads',
    time: '5h ago',
    status: 'contacted',
    fitFactors: { budgetFit: 70, timeline: 62, financing: 68 },
    notes: 'Temporada de inverno em Gramado com opção de renovação anual.',
  },
];

function LeadsPageContent() {
  const { copy } = useCrmLocale();
  const [selectedId, setSelectedId] = useState<string>('l1');
  const [filter, setFilter] = useState<'all' | 'hot' | 'new'>('all');
  const [search, setSearch] = useState('');
  const [convertedNotice, setConvertedNotice] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadPageCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchLeads({
      sampleDeals: SAMPLE_LEADS.map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        score: l.score,
        intent: l.intent,
        budget: l.budget,
        source: l.source,
        time: l.time,
        status: l.status,
        fitFactors: l.fitFactors,
        notes: l.notes,
      })),
    }).then((loaded) => {
      if (!cancelled) setLeads(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filter === 'hot' && lead.score < 80) return false;
      if (filter === 'new' && lead.status !== 'new') return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.source.toLowerCase().includes(q) ||
        lead.intent.toLowerCase().includes(q)
      );
    });
  }, [filter, search]);

  const selectedLead = useMemo(() => {
    return (
      leads.find((l) => l.id === selectedId) ||
      filteredLeads[0] ||
      leads[0]
    );
  }, [selectedId, filteredLeads]);

  const handleConvertDeal = () => {
    setConvertedNotice(
      `Lead "${selectedLead.name}" convertido com sucesso para a esteira ativa de Deals!`
    );
    setTimeout(() => {
      setConvertedNotice(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 dark:bg-[#0f1116] dark:text-slate-100">
      {/* GLOBAL LINTEL CRM HEADER */}
      <header className="border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#121722]/80 sm:px-6 sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CrmBrandMark />
          <LintelShellNav />
          <LintelHeaderActions />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#121722] dark:text-[#eef1f6]">
              {copy.nav.leads}
            </h1>
            <p className="text-sm font-medium text-[#5f6878] dark:text-[#a0a8b6] mt-0.5">
              <strong>{leads.length} novas oportunidades</strong> recebidas hoje · AI Qualification Engine ativo
            </p>
          </div>
          <LintelPrimaryActions variant="listings" />
        </div>

        {convertedNotice && (
          <div className="rounded-2xl bg-[#138a6315] border border-[#138a6340] px-4 py-3 text-xs font-bold text-[#138a63] flex items-center gap-2 animate-fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>{convertedNotice}</span>
          </div>
        )}

        {/* MASTER-DETAIL GRID (12 Cols: 7 cols List, 5 cols Detail) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEADS LIST COLUMN (7 COLS) */}
          <div className="lg:col-span-7 space-y-3">
            {/* SEARCH & FILTERS */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8a92a1] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar lead por nome, e-mail ou origem..."
                  className="w-full h-10 pl-10 pr-4 rounded-full bg-white/70 dark:bg-white/10 border border-[#12172216] dark:border-white/10 text-xs font-medium text-[#121722] dark:text-white placeholder-[#8a92a1] focus:outline-none focus:border-[#2f5bea] focus:ring-1 focus:ring-[#2f5bea] transition-all"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilter('all')}
                  className={`h-10 px-4 rounded-full text-xs font-bold transition-all ${
                    filter === 'all'
                      ? 'bg-[#121722] text-white dark:bg-white dark:text-[#121722] shadow-sm'
                      : 'bg-white/70 dark:bg-white/10 border border-[#12172216] dark:border-white/10 text-[#5f6878] dark:text-[#a0a8b6] hover:bg-white dark:hover:bg-white/20'
                  }`}
                >
                  Todos ({SAMPLE_LEADS.length})
                </button>
                <button
                  onClick={() => setFilter('hot')}
                  className={`h-10 px-3.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                    filter === 'hot'
                      ? 'bg-[#ff8a3d] text-white shadow-sm'
                      : 'bg-white/70 dark:bg-white/10 border border-[#12172216] dark:border-white/10 text-[#ff8a3d] hover:bg-white dark:hover:bg-white/20'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" /> Quentes
                </button>
              </div>
            </div>

            {/* LEADS LIST */}
            <div className="space-y-2.5">
              {filteredLeads.map((lead) => {
                const isSelected = lead.id === selectedLead.id;
                const isHot = lead.score >= 80;
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedId(lead.id)}
                    className={`cursor-pointer rounded-[20px] p-3.5 transition-all flex items-center gap-3.5 ${
                      isSelected
                        ? 'bg-white dark:bg-[#1d222c] border-2 border-[#2f5bea] shadow-md ring-2 ring-[#2f5bea]/20'
                        : 'bg-white/60 dark:bg-white/5 border border-white/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    {/* SCORE CIRCLE BADGE */}
                    <div
                      className={`w-11 h-11 rounded-full flex flex-col items-center justify-center font-extrabold text-xs shrink-0 ${
                        isHot
                          ? 'bg-[#138a631f] text-[#138a63]'
                          : 'bg-[#ff8a3d29] text-[#b8530f] dark:text-[#ff8a3d]'
                      }`}
                    >
                      <span className="font-mono">{lead.score}</span>
                      <span className="text-[8px] font-bold tracking-tighter -mt-0.5">FIT</span>
                    </div>

                    {/* INFO */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#121722] dark:text-[#eef1f6] truncate">
                          {lead.name}
                        </h4>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                            lead.intent === 'buy'
                              ? 'bg-[#2f5bea1f] text-[#2f5bea]'
                              : lead.intent === 'rent'
                              ? 'bg-[#138a631f] text-[#138a63]'
                              : 'bg-[#ff8a3d29] text-[#b8530f] dark:text-[#ff8a3d]'
                          }`}
                        >
                          {lead.intent === 'buy'
                            ? 'COMPRA'
                            : lead.intent === 'rent'
                            ? 'ALUGUEL'
                            : 'VENDA'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5f6878] dark:text-[#a0a8b6] truncate mt-0.5">
                        <strong className="text-slate-800 dark:text-slate-200">{lead.budget}</strong> · {lead.source}
                      </p>
                    </div>

                    {/* TIMESTAMP */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold text-[#8a92a1] flex items-center gap-1">
                        <Clock className="w-3 h-3 inline" /> {lead.time}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredLeads.length === 0 && (
                <div className="rounded-[20px] bg-white/60 dark:bg-white/5 border border-white/80 dark:border-white/10 p-8 text-center text-xs text-slate-500">
                  Nenhum lead encontrado para esta busca ou filtro.
                </div>
              )}
            </div>
          </div>

          {/* DETAILS COLUMN (5 COLS DRAWER PANEL) */}
          <div className="lg:col-span-5 rounded-[24px] bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 p-5 shadow-[0_22px_44px_-30px_rgba(30,44,80,0.25)] space-y-4 sticky top-24">
            <div className="flex items-start justify-between pb-3 border-b border-[#12172212] dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#121722] dark:text-[#eef1f6]">
                    {selectedLead.name}
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#138a631f] text-[#138a63] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> VERIFICADO
                  </span>
                </div>
                <p className="text-xs text-[#5f6878] dark:text-[#a0a8b6] mt-0.5">
                  {maskEmail(selectedLead.email)}
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-[#138a63] font-mono">
                  {selectedLead.score}/100
                </div>
                <div className="text-[10px] font-bold text-[#5f6878] dark:text-[#a0a8b6] uppercase tracking-wider">
                  AI Fit Rating
                </div>
              </div>
            </div>

            {/* CONTACT QUICK ACTIONS */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="p-2.5 rounded-[14px] bg-white/80 dark:bg-white/10 border border-[#12172212] dark:border-white/10 flex items-center gap-2 text-xs font-semibold text-[#121722] dark:text-white hover:bg-white dark:hover:bg-white/20 transition-colors"
                title="Demo — telefone mascarado (LGPD)"
              >
                <Phone className="w-4 h-4 text-[#2f5bea]" /> {maskPhone(selectedLead.phone)}
              </button>
              <button
                type="button"
                className="p-2.5 rounded-[14px] bg-white/80 dark:bg-white/10 border border-[#12172212] dark:border-white/10 flex items-center gap-2 text-xs font-semibold text-[#121722] dark:text-white hover:bg-white dark:hover:bg-white/20 transition-colors"
                title="Demo — e-mail mascarado (LGPD)"
              >
                <Mail className="w-4 h-4 text-[#2f5bea]" /> Enviar e-mail
              </button>
            </div>

            {/* QUALIFICATION BREAKDOWN (FIT FACTORS) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#121722] dark:text-white uppercase tracking-wider">
                  Fit Factors (Análise de Aderência)
                </h4>
                <Sparkles className="w-3.5 h-3.5 text-[#2f5bea]" />
              </div>

              {[
                {
                  label: 'Aderência Financeira vs Portfólio',
                  percent: selectedLead.fitFactors.budgetFit,
                },
                {
                  label: 'Urgência / Imediação de Decisão',
                  percent: selectedLead.fitFactors.timeline,
                },
                {
                  label: 'Pré-Aprovação de Crédito / Liquidez',
                  percent: selectedLead.fitFactors.financing,
                },
              ].map((f, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium text-[#5f6878] dark:text-[#a0a8b6]">
                    <span>{f.label}</span>
                    <span className="font-bold text-[#121722] dark:text-white font-mono">
                      {f.percent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#1217220e] dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#138a63] rounded-full transition-all duration-500"
                      style={{ width: `${f.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* NOTES & SUMMARY */}
            {selectedLead.notes && (
              <div className="p-3 rounded-[14px] bg-[#1217220a] dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold block text-[10px] uppercase text-[#8a92a1] mb-1">
                  Observações do Motor de Inteligência:
                </span>
                {selectedLead.notes}
              </div>
            )}

            {/* CTA ACTION */}
            <div className="pt-2 border-t border-[#12172212] dark:border-white/10">
              <button
                onClick={handleConvertDeal}
                className="w-full h-11 rounded-full bg-[#2f5bea] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#254bc2] transition-colors shadow-sm"
              >
                <ArrowUpRight className="w-4 h-4" /> Converter em Negócio Ativo (Deal)
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LeadsPageMeta() {
  const { copy } = useCrmLocale();
  return (
    <Head>
      <title>{copy.nav.leads} | {copy.brand}</title>
      <meta
        name="description"
        content="Caixa de entrada inteligente e qualificação de leads RSV360°"
      />
    </Head>
  );
}

export default function LeadsPage() {
  return (
    <AnfitriaoRoleGuard>
      <RsvCrmShell>
        <LeadsPageMeta />
        <LeadsPageContent />
      </RsvCrmShell>
    </AnfitriaoRoleGuard>
  );
}
