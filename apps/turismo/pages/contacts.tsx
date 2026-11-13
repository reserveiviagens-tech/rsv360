'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOverviewCarteiraVinculos } from '@/hooks/useAnfitriao';
import {
  carteiraToOverviewContacts,
  overviewContactToPageCard,
} from '@/lib/overview-contacts';
import Head from 'next/head';
import {
  Search,
  Phone,
  Mail,
  MessageSquare,
  Star,
  UserPlus,
  SlidersHorizontal,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import AnfitriaoRoleGuard from '../components/AnfitriaoRoleGuard';
import { RsvCrmShell } from '../components/lintel/rsv-crm-shell';
import { CrmBrandMark } from '../components/lintel/crm-brand-mark';
import { LintelHeaderActions } from '../components/lintel/lintel-header-actions';
import { LintelPrimaryActions } from '../components/lintel/lintel-primary-actions';
import { LintelShellNav } from '../components/lintel/lintel-shell-nav';
import { useCrmLocale } from '../components/lintel/crm-locale-provider';
import { maskEmail, maskPhone } from '@/lib/pii-mask';

export interface Contact {
  id: string;
  name: string;
  role: 'buyer' | 'seller' | 'tenant' | 'landlord' | 'investor';
  email: string;
  phone: string;
  budgetOrUnits: string;
  areas: string[];
  starred: boolean;
  avatarInitials?: string;
}

/** Demo fallback só quando carteira vazia e sem API (dev visual). */
export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'Marcus Vance',
    role: 'buyer',
    email: 'marcus@vancecapital.co.uk',
    phone: '+44 7911 123456',
    budgetOrUnits: '$1.4M – $1.8M',
    areas: ['Canary Wharf', 'Islington'],
    starred: true,
    avatarInitials: 'MV',
  },
  {
    id: 'c2',
    name: 'Elena Rostova',
    role: 'landlord',
    email: 'e.rostova@premier.com',
    phone: '+44 7911 654321',
    budgetOrUnits: '4 Unidades Gerenciadas',
    areas: ['Mayfair', 'Belgravia'],
    starred: true,
    avatarInitials: 'ER',
  },
  {
    id: 'c3',
    name: 'Sir Arthur Sterling',
    role: 'investor',
    email: 'arthur@sterlingholdings.com',
    phone: '+44 7911 789123',
    budgetOrUnits: '$5M+ Fundo Liquidez',
    areas: ['Kensington', 'Chelsea'],
    starred: false,
    avatarInitials: 'AS',
  },
  {
    id: 'c4',
    name: 'Victoria Beck',
    role: 'seller',
    email: 'v.beck@londonproperties.org',
    phone: '+44 7911 321987',
    budgetOrUnits: 'Em Avaliação Exclusiva',
    areas: ['Notting Hill'],
    starred: false,
    avatarInitials: 'VB',
  },
  {
    id: 'c5',
    name: 'Dr. Leonardo Guimarães',
    role: 'landlord',
    email: 'leonardo@clinicaguimaraes.med.br',
    phone: '+55 48 98844-1122',
    budgetOrUnits: '2 Penthouses Jurerê',
    areas: ['Florianópolis - SC'],
    starred: true,
    avatarInitials: 'LG',
  },
  {
    id: 'c6',
    name: 'Juliana e Roberto Prado',
    role: 'tenant',
    email: 'juliana.prado@advocacia.com.br',
    phone: '+55 54 99122-3344',
    budgetOrUnits: 'R$ 4.800/mês Contrato Ativo',
    areas: ['Gramado - RS'],
    starred: false,
    avatarInitials: 'JP',
  },
  {
    id: 'c7',
    name: 'Beatriz Vasconcellos',
    role: 'buyer',
    email: 'beatriz.v@luxuryliving.com.br',
    phone: '+55 21 99888-7766',
    budgetOrUnits: 'R$ 8M – R$ 12M Vista Mar',
    areas: ['Leblon', 'Ipanema'],
    starred: true,
    avatarInitials: 'BV',
  },
  {
    id: 'c8',
    name: 'Eduardo Fontes',
    role: 'seller',
    email: 'eduardo.fontes@investholding.com',
    phone: '+55 21 98877-6655',
    budgetOrUnits: 'R$ 4.5M Cobertura Duplex',
    areas: ['Rio de Janeiro - RJ'],
    starred: false,
    avatarInitials: 'EF',
  },
];

function ContactsPageContent() {
  const { copy } = useCrmLocale();
  const { user } = useAuth();
  const role = String(user?.role ?? '');
  const { data: carteiraData, isLoading, isError } = useOverviewCarteiraVinculos();
  const [localContacts, setLocalContacts] = useState<Contact[]>([]);

  const apiContacts = useMemo(() => {
    const items = carteiraData?.data?.items ?? [];
    if (items.length === 0) return [];
    return carteiraToOverviewContacts(items, role).map((row) =>
      overviewContactToPageCard(row) as Contact,
    );
  }, [carteiraData, role]);

  const useDemoFallback = !isLoading && !isError && apiContacts.length === 0;

  const [starOverrides, setStarOverrides] = useState<Record<string, boolean>>({});

  const contacts = useMemo(() => {
    const base =
      apiContacts.length > 0 ? apiContacts : useDemoFallback ? INITIAL_CONTACTS : [];
    return [...localContacts, ...base].map((c) => ({
      ...c,
      starred: starOverrides[c.id] ?? c.starred,
    }));
  }, [apiContacts, localContacts, useDemoFallback, starOverrides]);

  const [filter, setFilter] = useState<'all' | 'buyer' | 'seller' | 'tenant' | 'landlord' | 'investor'>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRole, setNewContactRole] = useState<'buyer' | 'seller' | 'tenant' | 'landlord' | 'investor'>('buyer');

  const toggleStarred = (id: string) => {
    const current = contacts.find((c) => c.id === id)?.starred ?? false;
    setStarOverrides((prev) => ({ ...prev, [id]: !current }));
  };

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (filter !== 'all' && c.role !== filter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.areas.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [contacts, filter, search]);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;
    const initials = newContactName
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    const created: Contact = {
      id: `c_${Date.now()}`,
      name: newContactName.trim(),
      email: newContactEmail.trim() || 'contato@rsv360.com.br',
      phone: '+55 (11) 99999-0000',
      role: newContactRole,
      budgetOrUnits: 'Novo relacionamento VIP',
      areas: ['São Paulo - SP'],
      starred: false,
      avatarInitials: initials,
    };
    setLocalContacts((prev) => [created, ...prev]);
    setNewContactName('');
    setNewContactEmail('');
    setModalOpen(false);
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
              {copy.nav.contacts}
            </h1>
            <p className="text-sm font-medium text-[#5f6878] dark:text-[#a0a8b6] mt-0.5">
              {isLoading ? (
                'Carregando carteira…'
              ) : isError ? (
                'Não foi possível carregar a carteira.'
              ) : (
                <>
                  <strong>{contacts.length} relacionamentos</strong>
                  {apiContacts.length > 0 ? ' (carteira API)' : useDemoFallback ? ' (demo)' : ''} · Diretório VIP
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="h-10 px-5 rounded-full bg-[#121722] dark:bg-white text-white dark:text-[#121722] font-bold text-xs flex items-center gap-2 hover:opacity-90 shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" /> Adicionar Contato
            </button>
            <LintelPrimaryActions variant="listings" />
          </div>
        </div>

        {/* SEARCH AND FILTERS TOOLBAR */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#8a92a1] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone, email ou região..."
              className="w-full h-10 pl-10 pr-4 rounded-full bg-white/70 dark:bg-white/10 border border-[#12172216] dark:border-white/10 text-xs font-medium text-[#121722] dark:text-white placeholder-[#8a92a1] focus:outline-none focus:border-[#2f5bea] focus:ring-1 focus:ring-[#2f5bea] transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'buyer', 'seller', 'tenant', 'landlord', 'investor'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setFilter(role)}
                className={`h-8 px-3.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                  filter === role
                    ? 'bg-[#121722] text-white dark:bg-white dark:text-[#121722] shadow-sm'
                    : 'bg-white/70 dark:bg-white/10 border border-[#12172216] dark:border-white/10 text-[#5f6878] dark:text-[#a0a8b6] hover:bg-white dark:hover:bg-white/20'
                }`}
              >
                {role === 'all'
                  ? 'Todos'
                  : role === 'buyer'
                  ? 'Comprador'
                  : role === 'seller'
                  ? 'Vendedor'
                  : role === 'tenant'
                  ? 'Inquilino'
                  : role === 'landlord'
                  ? 'Proprietário'
                  : 'Investidor'}
              </button>
            ))}
          </div>
        </div>

        {/* CONTACTS CARD GRID (Lintel repeat(auto-fill, minmax(240px, 1fr))) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((contact) => (
            <div
              key={contact.id}
              className="rounded-[24px] bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/80 dark:border-white/10 p-4 shadow-[0_22px_44px_-30px_rgba(30,44,80,0.25)] space-y-3 hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                {/* CARD TOP */}
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-full bg-[#121722] dark:bg-white text-white dark:text-[#121722] font-black text-sm flex items-center justify-center shadow-xs">
                    {contact.avatarInitials ||
                      contact.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                  </div>
                  <button
                    onClick={() => toggleStarred(contact.id)}
                    aria-label="Favoritar contato"
                    className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                      contact.starred
                        ? 'text-[#ff8a3d]'
                        : 'text-[#8a92a1] hover:text-[#121722] dark:hover:text-white'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${contact.starred ? 'fill-current' : ''}`}
                    />
                  </button>
                </div>

                {/* NAME & ROLE */}
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-[#121722] dark:text-[#eef1f6] truncate">
                    {contact.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        contact.role === 'buyer'
                          ? 'bg-[#2f5bea1f] text-[#2f5bea]'
                          : contact.role === 'seller'
                          ? 'bg-[#ff8a3d29] text-[#b8530f] dark:text-[#ff8a3d]'
                          : contact.role === 'tenant'
                          ? 'bg-[#138a631f] text-[#138a63]'
                          : 'bg-[#1217220e] dark:bg-white/10 text-[#121722] dark:text-white'
                      }`}
                    >
                      {contact.role}
                    </span>
                    <span className="text-[11px] text-[#5f6878] dark:text-[#a0a8b6] truncate">
                      {contact.areas.join(', ')}
                    </span>
                  </div>
                </div>

                {/* FACTS BOX */}
                <div className="p-2.5 rounded-[14px] bg-[#1217220a] dark:bg-white/5 space-y-1 text-xs mt-3">
                  <div className="text-[10px] font-bold text-[#8a92a1] uppercase tracking-wider">
                    Critério / Ativos
                  </div>
                  <div className="font-bold text-[#121722] dark:text-white truncate">
                    {contact.budgetOrUnits}
                  </div>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-[#12172212] dark:border-white/10">
                <button
                  type="button"
                  className="flex-1 h-8 rounded-full bg-white dark:bg-white/10 border border-[#12172216] dark:border-white/10 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#121722] dark:text-white hover:bg-[#121722] hover:text-white dark:hover:bg-white dark:hover:text-[#121722] transition-colors"
                  title={`Demo — ${maskPhone(contact.phone)}`}
                >
                  <Phone className="w-3.5 h-3.5" /> Ligar
                </button>
                <button
                  type="button"
                  className="flex-1 h-8 rounded-full bg-white dark:bg-white/10 border border-[#12172216] dark:border-white/10 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#121722] dark:text-white hover:bg-[#121722] hover:text-white dark:hover:bg-white dark:hover:text-[#121722] transition-colors"
                  title={`Demo — ${maskEmail(contact.email)}`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL ADICIONAR CONTATO */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-xl dark:bg-[#121722] border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Cadastrar Novo Contato VIP
              </h3>
              <form onSubmit={handleAddContact} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Ex: Roberto Drummond"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="Ex: roberto@invest.com"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Papel (Role)
                  </label>
                  <select
                    value={newContactRole}
                    onChange={(e) => setNewContactRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="buyer">Comprador (Buyer)</option>
                    <option value="seller">Vendedor (Seller)</option>
                    <option value="landlord">Proprietário (Landlord)</option>
                    <option value="tenant">Inquilino (Tenant)</option>
                    <option value="investor">Investidor (Investor)</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[#2f5bea] text-white text-xs font-bold hover:bg-[#254bc2]"
                  >
                    Salvar Contato
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ContactsPageMeta() {
  const { copy } = useCrmLocale();
  return (
    <Head>
      <title>{copy.nav.contacts} | {copy.brand}</title>
      <meta name="description" content="Diretório VIP de contatos RSV 360" />
    </Head>
  );
}

export default function ContactsPage() {
  return (
    <AnfitriaoRoleGuard>
      <RsvCrmShell>
        <ContactsPageMeta />
        <ContactsPageContent />
      </RsvCrmShell>
    </AnfitriaoRoleGuard>
  );
}
