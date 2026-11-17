'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  ChevronRight,
  ExternalLink,
  FileText,
  Heart,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { useLintelCreateOptional } from '../lintel/lintel-create-provider';
import { useCrmLiveChatOptional } from '../lintel/crm-live-chat-provider';
import { LINTEL_RENTALS_TW, LINTEL_THEME_TOKENS } from '../lintel/lintel-theme';
import { lintelBtnGhost, lintelBtnPrimary, lintelIconBtn } from '../lintel/overview-primitives';
import type { RentalPortfolioItem } from './rentals-data';
import { isRentalFavorite, setRentalFavorite } from './rental-favorites';
import { toast } from 'react-hot-toast';
import { downloadRentalContractPreview, requestRentalSign } from '../../src/lib/rental-contract-api';

export interface RentalPropertyDetailModalProps {
  item: RentalPortfolioItem;
  onClose: () => void;
}

const STATUS_CONFIG: Record<
  RentalPortfolioItem['listingStatus'],
  { labelKey: 'statusLeased' | 'statusApplication' | 'statusForRent'; dot: string; bg: string; text: string }
> = {
  leased: {
    labelKey: 'statusLeased',
    dot: LINTEL_RENTALS_TW.statusLeased,
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  application: {
    labelKey: 'statusApplication',
    dot: LINTEL_RENTALS_TW.statusApplication,
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
  },
  for_rent: {
    labelKey: 'statusForRent',
    dot: LINTEL_RENTALS_TW.statusForRent,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
  },
};

export function RentalPropertyDetailModal({ item, onClose }: RentalPropertyDetailModalProps) {
  const { copy } = useCrmLocale();
  const r = copy.rentals;
  const lintelCreate = useLintelCreateOptional();
  const liveChat = useCrmLiveChatOptional();

  const [fav, setFav] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'leases' | 'documents'>('overview');

  useEffect(() => {
    setFav(isRentalFavorite(item.id));
  }, [item.id]);

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleFav = () => {
    const next = !fav;
    setFav(next);
    setRentalFavorite(item.id, next);
  };

  const handleCopyLink = useCallback(async () => {
    try {
      const url = `${window.location.origin}/overview?tab=rentals&rental=${item.id}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // fallback
    }
  }, [item.id]);

  const statusCfg = STATUS_CONFIG[item.listingStatus] || STATUS_CONFIG.for_rent;
  const statusLabel = r[statusCfg.labelKey];

  const occupancy = item.units > 0 ? Math.round((item.occupied / item.units) * 100) : 0;
  const vacant = item.vacantUnits ?? Math.max(0, item.units - item.occupied);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rental-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#121722]">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
              {statusLabel}
            </span>
            <span className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
              Ref: <span className="font-mono uppercase">{item.id}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copiar link do dossiê"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  <span>Compartilhar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={toggleFav}
              className={`h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center transition-colors dark:border-gray-700 ${
                fav ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              aria-label="Favoritar"
            >
              <Heart className={`h-4 w-4 ${fav ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Hero Section: Photo + Main Summary */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="relative h-56 overflow-hidden rounded-2xl md:col-span-5 md:h-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.photo}
                alt={item.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold backdrop-blur-xs">
                  {item.type}
                </span>
                <p className="mt-1 text-xs opacity-90">{item.area}</p>
              </div>
            </div>

            <div className="flex flex-col justify-between md:col-span-7">
              <div>
                <h2 id="rental-detail-title" className="text-2xl font-black text-gray-900 dark:text-white">
                  {item.name}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {item.address} · {item.area}
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-gray-200/90 bg-gray-50 px-2.5 py-0.5 text-[10px] font-bold text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* KPI Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Aluguel Médio</span>
                  <p className="mt-0.5 text-base font-black text-gray-900 dark:text-white">{item.rent}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Rent Roll Estimado</span>
                  <p className="mt-0.5 text-base font-black text-gray-900 dark:text-white">{item.roll}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Ocupação</span>
                  <p className="mt-0.5 text-base font-black text-emerald-600 dark:text-emerald-400">{occupancy}%</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Unidades Livres</span>
                  <p className="mt-0.5 text-base font-black text-orange-600 dark:text-orange-400">{vacant}</p>
                </div>
              </div>

              {/* Gestor responsável */}
              {item.agentAvatarUrl && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-800/20">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.agentAvatarUrl}
                      alt="Gestor"
                      className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Nora Whitfield</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Gestora de Locações · Portfolio Lead</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      liveChat?.sharePropertyCard(
                        {
                          id: item.id,
                          name: item.name,
                          subtitle: `${item.type} · ${item.area} · ${item.rent}`,
                          thumb: item.photo,
                          kind: 'rental',
                          extraPhotos: 4,
                        },
                        { targetChat: 'nora' },
                      );
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-orange-500" />
                    Chat Direto
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Subtabs de Navegação */}
          <div className="mt-6 border-b border-gray-200 dark:border-gray-800">
            <nav className="flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`border-b-2 pb-2 text-xs font-bold transition-colors ${
                  activeTab === 'overview'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Visão Geral da Unidade
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('leases')}
                className={`border-b-2 pb-2 text-xs font-bold transition-colors ${
                  activeTab === 'leases'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Contratos & Vencimentos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={`border-b-2 pb-2 text-xs font-bold transition-colors ${
                  activeTab === 'documents'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Documentos & Vistorias
              </button>
            </nav>
          </div>

          {/* Subtab Contents */}
          <div className="mt-4">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Perfil Operacional</h4>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2 dark:text-gray-300">
                    <div>
                      <span className="font-semibold text-gray-500">Total de Unidades:</span> {item.units}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Unidades Ocupadas:</span> {item.occupied}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Candidaturas em Análise:</span> {item.applications ?? 0}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Dias até Próx. Término:</span>{' '}
                      {item.nextLeaseEndDays != null ? `${item.nextLeaseEndDays} dias` : '—'}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Ações Recomendadas</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        lintelCreate?.openCreate('viewing', {
                          prefill: {
                            rentalProperty: { id: item.id, name: item.name, address: item.address, area: item.area },
                          },
                        });
                        onClose();
                      }}
                      className={`${lintelBtnPrimary} text-xs`}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Agendar Vistoria
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        lintelCreate?.openCreate('lead', {
                          prefill: {
                            rentalProperty: { id: item.id, name: item.name, address: item.address, area: item.area },
                          },
                        });
                        onClose();
                      }}
                      className={`${lintelBtnGhost} text-xs text-gray-800 dark:text-white`}
                    >
                      <User className="h-3.5 w-3.5" />
                      Registrar Candidatura
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leases' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Contrato Padrão 12 Meses</p>
                      <p className="text-[10px] text-gray-500">Vigência 2026/2027 · Garantia caução</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Ativo
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${lintelBtnPrimary} text-xs`}
                    onClick={async () => {
                      try {
                        const blob = await downloadRentalContractPreview({
                          unitId: item.id,
                          unitName: item.name,
                          address: item.address,
                          tenantName: 'Locatário RSV360',
                          monthlyRent: item.rentAmount,
                          termMonths: 12,
                          startDate: new Date().toISOString().slice(0, 10),
                        });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank', 'noopener,noreferrer');
                        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
                        toast.success('Minuta PDF gerada');
                      } catch {
                        toast.error('Não foi possível gerar a minuta do contrato');
                      }
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Gerar minuta PDF
                  </button>
                  <button
                    type="button"
                    className={`${lintelBtnGhost} text-xs`}
                    onClick={async () => {
                      try {
                        const sign = await requestRentalSign({
                          unitId: item.id,
                          signerEmail: 'locatario@exemplo.com',
                          signerName: 'Locatário candidato',
                        });
                        toast.success(
                          `Assinatura solicitada (${sign.requestId.slice(0, 12)}…) — válida até ${new Date(sign.expiresAt).toLocaleString('pt-BR')}`,
                        );
                      } catch {
                        toast.error('Falha ao solicitar assinatura eletrônica');
                      }
                    }}
                  >
                    Solicitar assinatura eletrônica
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-2">
                {['Laudo_de_Vistoria_Entrada.pdf', 'Matricula_Imobiliaria_Atualizada.pdf', 'Regimento_Interno_Condominio.pdf'].map((doc) => (
                  <div
                    key={doc}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:bg-gray-800/70"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{doc}</span>
                    </div>
                    <span className="text-[10px] font-bold text-orange-600 hover:underline dark:text-orange-400 cursor-pointer">
                      Visualizar
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3 dark:border-gray-800 dark:bg-gray-800/20">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            RSV360 Lintel Portfolio Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
