'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CalendarioDiaView } from './AnfitriaoMonthCalendar';
import { moneyBr, hostPayoutBreakdown, summarizeSelection } from './date-range-utils';
import type { ConjuntoRegrasView } from './ConjuntosRegrasPanel';

export type MultiNightPanel =
  | 'overview'
  | 'availability'
  | 'price'
  | 'custom'
  | 'base-price';

type Props = {
  dates: string[];
  dias: CalendarioDiaView[];
  panel: MultiNightPanel;
  onPanel: (p: MultiNightPanel) => void;
  isMaster: boolean;
  busy: boolean;
  precoSugerido: number;
  ganhoBuscasPct: number;
  formMin: string;
  formCancelCurta: string;
  formBase: string;
  onFormMin: (v: string) => void;
  onFormCancel: (v: string) => void;
  onFormBase: (v: string) => void;
  onClear: () => void;
  onSaveAvailability: (action: 'disponibilizar' | 'bloquear') => void;
  onSavePrices: (preco: number) => void;
  onSaveBasePrice: () => void;
  onSaveCustom: () => void;
  conjuntosRegras?: ConjuntoRegrasView[];
  smartPricingAtivo?: boolean;
  applyRange?: { de: string; ate: string } | null;
  onApplyConjunto?: (conjuntoId: string, de: string, ate: string) => void;
  onManageConjuntos?: () => void;
};

const CANCEL_OPTIONS = [
  { value: 'flexivel', label: 'Flexível' },
  { value: 'moderada', label: 'Moderada' },
  { value: 'limitada', label: 'Limitada' },
  { value: 'restrita', label: 'Restrita' },
];

export function MultiNightDrawer({
  dates,
  dias,
  panel,
  onPanel,
  isMaster,
  busy,
  precoSugerido,
  ganhoBuscasPct,
  formMin,
  formCancelCurta,
  formBase,
  onFormMin,
  onFormCancel,
  onFormBase,
  onClear,
  onSaveAvailability,
  onSavePrices,
  onSaveBasePrice,
  onSaveCustom,
  conjuntosRegras = [],
  smartPricingAtivo = false,
  applyRange = null,
  onApplyConjunto,
  onManageConjuntos,
}: Props) {
  const summary = useMemo(() => summarizeSelection(dates, dias), [dates, dias]);
  const [applyConjuntoId, setApplyConjuntoId] = useState('');
  const [availAction, setAvailAction] = useState<'disponibilizar' | 'bloquear' | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editingPrice, setEditingPrice] = useState(false);
  const [editingBase, setEditingBase] = useState(false);
  const [baseDraft, setBaseDraft] = useState(formBase);

  useEffect(() => {
    setBaseDraft(formBase);
  }, [formBase]);

  useEffect(() => {
    if (summary.precoMin != null) {
      setEditPrice(String(Math.round(summary.precoMin)));
    }
  }, [summary.precoMin, dates.join(',')]);

  const priceRangeLabel =
    summary.precoMin != null && summary.precoMax != null
      ? summary.precoMin === summary.precoMax
        ? moneyBr(summary.precoMin)
        : `${moneyBr(summary.precoMin)} — ${moneyBr(summary.precoMax)}`
      : '—';

  const baseRangeLabel =
    summary.baseMin != null && summary.baseMax != null
      ? summary.baseMin === summary.baseMax
        ? moneyBr(summary.baseMin)
        : `${moneyBr(summary.baseMin)} — ${moneyBr(summary.baseMax)}`
      : null;

  const showStrike =
    baseRangeLabel &&
    summary.baseMin != null &&
    summary.precoMin != null &&
    summary.baseMin > summary.precoMin + 0.009;

  const priceDirty =
    editingPrice &&
    editPrice.trim() !== '' &&
    Number(editPrice.replace(',', '.')) !== summary.precoMin;
  const baseDirty =
    String(baseDraft).replace(',', '.') !== String(formBase).replace(',', '.');

  const badge = (
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
        {summary.total} noite{summary.total === 1 ? '' : 's'}
      </span>
      <button
        type="button"
        aria-label="Limpar seleção"
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-500 hover:bg-slate-100"
        onClick={onClear}
      >
        ×
      </button>
    </div>
  );

  if (panel === 'availability') {
    return (
      <div className="space-y-3">
        {badge}
        <div className="rounded-3xl bg-slate-900 p-4 text-white">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden />
            <p className="text-lg font-semibold">Disponibilidade parcial</p>
          </div>
          <div className="space-y-2">
            {(
              [
                ['disponibilizar', 'Disponibilizar todas as noites'],
                ['bloquear', 'Bloquear todas as noites'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={!isMaster || busy}
                onClick={() => setAvailAction(value)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-medium ${
                  availAction === value
                    ? 'border-white bg-slate-800'
                    : 'border-slate-600 bg-transparent'
                }`}
              >
                {label}
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    availAction === value ? 'border-white bg-white' : 'border-slate-400'
                  }`}
                >
                  {availAction === value && (
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              className="text-sm font-medium text-white underline"
              onClick={() => onPanel('overview')}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!isMaster || busy || !availAction}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-40"
              onClick={() => availAction && onSaveAvailability(availAction)}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (panel === 'price') {
    return (
      <div className="space-y-3">
        <div className="mb-1 flex items-center justify-between gap-2 px-1">
          <p className="text-sm font-semibold text-slate-800">
            {summary.total} noite{summary.total === 1 ? '' : 's'}
          </p>
          <button
            type="button"
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-500"
            onClick={() => onPanel('overview')}
          >
            ×
          </button>
        </div>
        <div className="rounded-3xl bg-slate-900 p-5 text-white">
          <div className="flex items-center gap-2">
            {editingPrice ? (
              <input
                className="w-40 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-2xl font-bold text-white"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                autoFocus
              />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{priceRangeLabel.replace(/\s/g, ' ')}</p>
            )}
            {isMaster && (
              <button
                type="button"
                aria-label="Editar preço"
                className="text-white/80 hover:text-white"
                onClick={() => setEditingPrice((v) => !v)}
              >
                ✎
              </button>
            )}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              className="text-sm font-medium underline"
              onClick={() => {
                setEditingPrice(false);
                onPanel('overview');
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!isMaster || busy || !priceDirty}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-40"
              onClick={() => {
                const n = Number(String(editPrice).replace(',', '.'));
                if (!Number.isFinite(n)) return;
                onSavePrices(n);
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (panel === 'custom') {
    return (
      <div className="space-y-3">
        {badge}
        <div className="rounded-3xl bg-slate-900 p-4 text-white">
          <p className="mb-3 text-sm text-slate-300">Configurações personalizadas</p>
          <div className="space-y-2">
            <div className="rounded-2xl border border-slate-600 px-4 py-3">
              <label className="flex items-center justify-between gap-3 text-sm font-medium">
                Número mínimo de noites
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-right font-bold"
                  value={formMin}
                  disabled={!isMaster || busy}
                  onChange={(e) => onFormMin(e.target.value)}
                />
              </label>
            </div>
            <div className="rounded-2xl border border-slate-600 px-4 py-3">
              <label className="block text-sm font-medium">
                Política de cancelamento
                <select
                  className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm"
                  value={formCancelCurta}
                  disabled={!isMaster || busy}
                  onChange={(e) => onFormCancel(e.target.value)}
                >
                  {CANCEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <button
            type="button"
            disabled={!isMaster || busy}
            className="mt-5 w-full rounded-full bg-white py-3 text-sm font-semibold text-slate-900 disabled:opacity-40"
            onClick={onSaveCustom}
          >
            Concluído
          </button>
        </div>
      </div>
    );
  }

  if (panel === 'base-price') {
    const baseNum = Number(String(baseDraft).replace(',', '.'));
    const payout =
      Number.isFinite(baseNum) && baseNum > 0 ? hostPayoutBreakdown(baseNum) : null;
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200"
            onClick={() => onPanel('overview')}
          >
            ←
          </button>
          <h2 className="text-lg font-bold text-slate-900">Preço básico</h2>
          <span className="h-9 w-9" aria-hidden />
        </div>

        <div className="flex items-center gap-2">
          {editingBase ? (
            <input
              className="w-40 rounded-xl border px-3 py-2 text-3xl font-bold"
              value={baseDraft}
              onChange={(e) => {
                setBaseDraft(e.target.value);
                onFormBase(e.target.value);
              }}
              autoFocus
            />
          ) : (
            <p className="text-4xl font-bold text-slate-900">
              {moneyBr(Number.isFinite(baseNum) ? baseNum : null).replace(/\s/g, '')}
            </p>
          )}
          <button
            type="button"
            aria-label="Editar"
            className="text-slate-500"
            onClick={() => setEditingBase((v) => !v)}
          >
            ✎
          </button>
        </div>

        {payout && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 p-4 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Preço básico</span>
                <span className="font-medium">{moneyBr(baseNum)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-2">
                <span className="text-slate-600">Taxa de serviço do anfitrião</span>
                <span className="font-medium">-{moneyBr(payout.taxa)}</span>
              </div>
              <div className="mt-3 flex justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="font-semibold">Você recebe</span>
                <span className="font-bold">{moneyBr(payout.recebe)}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Preço para o hóspede</span>
                <span className="font-medium">{moneyBr(baseNum)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-slate-100 p-4">
          <p className="text-sm leading-relaxed text-slate-700">
            Adote nossa dica de preço para que seu anúncio apareça em até {ganhoBuscasPct}% mais
            buscas.
          </p>
          <button
            type="button"
            className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm"
            onClick={() => {
              onFormBase(String(precoSugerido));
              setBaseDraft(String(precoSugerido));
              setEditingBase(true);
            }}
          >
            Experimente com {moneyBr(precoSugerido).replace(/\s/g, '')}
          </button>
        </div>

        <button
          type="button"
          disabled={!isMaster || busy || !baseDirty}
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-40"
          onClick={onSaveBasePrice}
        >
          Salvar
        </button>
      </div>
    );
  }

  // overview
  return (
    <div className="space-y-3">
      {badge}

      <div className="rounded-3xl bg-slate-900 p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden />
              <p className="font-semibold">Disponibilidade parcial</p>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {summary.disponiveis} noite{summary.disponiveis === 1 ? '' : 's'} disponível
              {summary.disponiveis === 1 ? '' : 'is'}
            </p>
            <p className="text-sm text-slate-300">
              {summary.bloqueadas} noite{summary.bloqueadas === 1 ? '' : 's'} bloqueada
              {summary.bloqueadas === 1 ? '' : 's'}
            </p>
          </div>
          {isMaster && (
            <button
              type="button"
              className="rounded-full bg-slate-700 px-3 py-1.5 text-xs font-semibold"
              onClick={() => onPanel('availability')}
            >
              Editar
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-3xl bg-slate-900 p-4 text-left text-white"
        onClick={() => isMaster && onPanel('price')}
      >
        <p className="text-sm text-slate-300">Preço do anúncio</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">{priceRangeLabel}</p>
        {showStrike && baseRangeLabel && (
          <p className="mt-1 text-base text-slate-400 line-through">{baseRangeLabel}</p>
        )}
      </button>

      {isMaster && conjuntosRegras.length > 0 && applyRange && onApplyConjunto && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-900">Aplicar conjunto de regras</p>
          {smartPricingAtivo && (
            <p className="text-xs text-amber-800">
              Preço Inteligente ativo — apenas bloqueios de check-in serão aplicados.
            </p>
          )}
          <p className="text-xs text-slate-500">
            {applyRange.de} → {applyRange.ate}
          </p>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={applyConjuntoId}
            disabled={busy}
            onChange={(e) => setApplyConjuntoId(e.target.value)}
          >
            <option value="">Escolha um conjunto…</option>
            {conjuntosRegras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            disabled={busy || !applyConjuntoId}
            onClick={() => onApplyConjunto(applyConjuntoId, applyRange.de, applyRange.ate)}
          >
            Aplicar
          </button>
          {onManageConjuntos && (
            <button
              type="button"
              className="text-xs font-medium text-slate-600 underline"
              onClick={onManageConjuntos}
            >
              Gerenciar conjuntos
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left font-semibold text-slate-900"
        onClick={() => isMaster && onPanel('custom')}
      >
        Configurações personalizadas
        <span className="text-xl text-slate-400">+</span>
      </button>

      {isMaster && (
        <button
          type="button"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800"
          onClick={() => onPanel('base-price')}
        >
          Ajustar preço básico
        </button>
      )}
    </div>
  );
}
