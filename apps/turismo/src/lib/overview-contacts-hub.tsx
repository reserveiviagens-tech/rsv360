'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Mail, Phone } from 'lucide-react';
import { buildOverviewHubPath } from './overview-hub-links';
import { indexLeadsByName, resolvePipelineForContact } from './crm-contact-pipeline';
import { leadsApi } from './leads-api';
import type { LeadApiRow } from './overview-leads';
import type { OverviewContactRow } from './overview-contacts';

export type ContactKindFilter = 'all' | 'buyer' | 'seller' | 'tenant' | 'landlord';

type ContactWithPipeline = OverviewContactRow & {
  leadId?: string;
  dealId?: string;
};

function useCrmLeadsForPipeline(): LeadApiRow[] {
  const [leads, setLeads] = useState<LeadApiRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void leadsApi
      .list()
      .then((items) => {
        if (!cancelled) setLeads(items);
      })
      .catch(() => {
        if (!cancelled) setLeads([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return leads;
}

export type OverviewContactsHubPanelProps = {
  contacts: OverviewContactRow[];
  loading: boolean;
  search: string;
  kindFilter: ContactKindFilter;
  fromCarteiraApi: boolean;
  onOpenProfile?: (contact: OverviewContactRow) => void;
  onCallContact?: (contact: OverviewContactRow) => void;
};

export function OverviewContactsHubPanel({
  contacts,
  loading,
  search,
  kindFilter,
  fromCarteiraApi,
  onOpenProfile,
  onCallContact,
}: OverviewContactsHubPanelProps) {
  const router = useRouter();
  const crmLeads = useCrmLeadsForPipeline();
  const highlightedId =
    typeof router.query.contact === 'string' ? router.query.contact.trim() : '';

  const withPipeline: ContactWithPipeline[] = useMemo(() => {
    const byName = indexLeadsByName(crmLeads);
    return contacts.map((c) => {
      const link = resolvePipelineForContact(c.name, byName);
      return { ...c, leadId: link.leadId, dealId: link.dealId };
    });
  }, [contacts, crmLeads]);

  const filtered = useMemo(() => {
    return withPipeline.filter((c) => {
      if (kindFilter !== 'all' && c.kind !== kindFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [withPipeline, kindFilter, search]);

  if (loading) {
    return (
      <p className="text-sm text-gray-500 col-span-full py-8 text-center lintel-shimmer" role="status">
        Carregando carteira…
      </p>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="col-span-full text-center text-sm text-gray-500 py-10">
        {fromCarteiraApi
          ? 'Nenhum vínculo na carteira. Staff pode atribuir em /anfitriao/admin/carteira-corretor.'
          : 'Nenhum contato encontrado para os filtros atuais.'}
      </p>
    );
  }

  return (
    <>
      {fromCarteiraApi && (
        <p className="col-span-full text-[10px] font-bold uppercase tracking-wider text-[#138a63]">
          Carteira · pipeline CRM
        </p>
      )}
      {filtered.map((c) => (
        <div
          key={c.id}
          className={`rounded-[22px] bg-white/70 dark:bg-[#171b23]/80 border backdrop-blur-md p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
            highlightedId === c.id
              ? 'border-[#2f5bea] ring-2 ring-[#2f5bea]/30'
              : 'border-white/80 dark:border-white/10'
          }`}
        >
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2f5bea] to-[#7192ff] text-white flex items-center justify-center font-black text-sm shadow-sm">
                  {c.name
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{c.name}</h4>
                  <span className="text-[11px] text-gray-400">
                    {c.city} · {c.agent}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full capitalize ${
                  c.kind === 'buyer'
                    ? 'bg-[#2f5bea]/15 text-[#2f5bea]'
                    : c.kind === 'seller' || c.kind === 'landlord'
                      ? 'bg-[#ff8a3d]/15 text-[#ff8a3d]'
                      : 'bg-[#138a63]/15 text-[#138a63]'
                }`}
              >
                {c.kind}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 text-xs text-gray-600 dark:text-gray-300 py-2 border-y border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                <span className="truncate">{c.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                <span>{c.phone}</span>
              </div>
            </div>

            <div className="mt-3">
              <span className="text-[10px] text-gray-400 block font-bold uppercase">Orçamento / Pretensão</span>
              <b className="text-xs font-bold text-gray-900 dark:text-white">{c.budget}</b>
            </div>

            {(c.leadId || c.dealId) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {c.leadId && (
                  <Link
                    href={buildOverviewHubPath({ tab: 'leads', lead: c.leadId })}
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#2f5bea1f] text-[#2f5bea] hover:opacity-90"
                  >
                    Ver lead
                  </Link>
                )}
                {c.dealId && (
                  <Link
                    href={buildOverviewHubPath({ tab: 'deals', deal: c.dealId })}
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#138a631f] text-[#138a63] hover:opacity-90"
                  >
                    Ver deal
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
            <span className="text-gray-400 text-[10px]">Último contato: {c.lastContact}</span>
            <div className="flex items-center gap-1.5">
              {onCallContact && (
                <button
                  type="button"
                  onClick={() => onCallContact(c)}
                  title="Ligar (demo)"
                  className="p-1.5 rounded-full hover:bg-[#138a63]/15 text-[#138a63] dark:text-[#2feaa8] transition-all hover:scale-110"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              )}
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={() => onOpenProfile(c)}
                  className="px-3 py-1 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] font-black text-xs hover:scale-105 transition-all shadow-xs"
                >
                  Profile
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}