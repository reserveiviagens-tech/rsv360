'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalendarioDiaView } from './AnfitriaoMonthCalendar';
import {
  hostPayoutBreakdown,
  isCustomObservacao,
  moneyBr,
  smartPriceSuggestions,
} from './date-range-utils';
import { PrecoInteligenteHelpModal } from './PrecoInteligenteHelpModal';

export type DrawerPanel =
  | 'menu'
  | 'precos'
  | 'taxas'
  | 'descontos'
  | 'disponibilidade'
  | 'disp-min-noites'
  | 'disp-max-noites'
  | 'disp-antecedencia'
  | 'disp-aviso-mesmo-dia'
  | 'disp-min-por-dia'
  | 'disp-preparacao'
  | 'disp-janela'
  | 'disp-checkin-dias'
  | 'disp-ical'
  | 'cancelamentos'
  | 'cancel-curta'
  | 'cancel-longa'
  | 'dia'
  | 'dia-obs'
  | 'preco-basico'
  | 'preco-inteligente';

export type PricingForm = {
  formBase: string;
  formWeekend: string;
  formMin: string;
  formMax: string;
  formAntecedencia: string;
  formCutoff: string;
  formSemanal: string;
  formMensal: string;
  formTaxaLimpeza: string;
  formTaxaPet: string;
  formTaxaExtra: string;
  formCancelCurta: string;
  formCancelLonga: string;
  formNaoReembolsavel: boolean;
  dayPrice: string;
  dayNote: string;
  formSmartAtivo: boolean;
  formSmartMin: string;
  formSmartMax: string;
  formUltimaHoraPct: string;
  formUltimaHoraDias: string;
  formAntecipadaPct: string;
  formAntecipadaDias: string;
  formNovoAnuncioPct: string;
  formNovoAnuncioLimite: string;
  formAvaliacaoPct: string;
  formAvaliacaoNota: string;
  formAvaliacaoReviews: string;
  formPreparacao: string;
  formPreparacaoHoras: string;
  formJanelaMeses: string;
  formCheckinDias: number[];
  formCheckoutDias: number[];
  formIcalToken: string;
  formIcalImportUrl: string;
  formIcalImportLastSyncAt: string;
  formIcalImportLastStatus: string;
  formIcalImportLastError: string;
  /** 0=Sun … 6=Sat — empty string means inherit global min */
  formMinPorCheckin: string[];
  formPermitirPedidosMesmoDia: boolean;
};

type Props = {
  panel: DrawerPanel;
  onPanel: (p: DrawerPanel) => void;
  isMaster: boolean;
  busy: boolean;
  teto: number;
  acomodacaoId?: number;
  selectedDate: string | null;
  selectedDia: CalendarioDiaView | null;
  form: PricingForm;
  onForm: (patch: Partial<PricingForm>) => void;
  /** Optional form override avoids stale React state when saving right after onForm. */
  onSaveDefaults: (override?: Partial<PricingForm>) => void;
  onSaveDay: () => void;
  onSaveDayNote: () => void;
  onToggleBlock: (bloquear: boolean) => void;
  onCloseDay: () => void;
  onEnsureIcalToken?: () => void;
  onRegenerateIcalToken?: () => void;
  onSaveIcalImportUrl?: () => void;
  onSyncIcalImport?: () => void;
  precoSugerido?: number;
  ganhoBuscasPct?: number;
};

const NOTE_MAX = 100;

const CANCEL_SHORT = [
  {
    value: 'flexivel',
    label: 'Flexível',
    bullets: [
      'Reembolso integral para cancelamentos feitos pelo menos 1 dia antes do check-in',
      'Reembolso parcial para cancelamentos feitos menos de 1 dia antes do check-in',
    ],
  },
  {
    value: 'moderada',
    label: 'Moderada',
    bullets: [
      'Reembolso integral para cancelamentos feitos pelo menos 5 dias antes do check-in',
      'Reembolso parcial para cancelamentos feitos 5 dias ou menos antes do check-in',
    ],
  },
  {
    value: 'limitada',
    label: 'Limitada',
    bullets: [
      'Reembolso integral para cancelamentos feitos pelo menos 14 dias antes do check-in',
      'Reembolso parcial para cancelamentos feitos entre 7 e 14 dias antes do check-in',
    ],
  },
  {
    value: 'restrita',
    label: 'Restrita',
    bullets: [
      'Reembolso integral para cancelamentos feitos pelo menos 30 dias antes do check-in',
      'Reembolso parcial para cancelamentos feitos entre 7 e 30 dias antes do check-in',
    ],
  },
] as const;

const CANCEL_LONG = [
  {
    value: 'restrita_longa',
    label: 'Restrita para estadias de longa duração',
    bullets: [
      'Reembolso integral até 30 dias antes do check-in',
      'Depois disso, os primeiros 30 dias da estadia não são reembolsáveis.',
    ],
  },
  {
    value: 'rigorosa_longa',
    label: 'Política Rigorosa para estadias de longa duração',
    bullets: [
      'Reembolso integral para cancelamentos feitos em até 48 horas após a confirmação da reserva e pelo menos 28 dias antes do check-in',
      'Depois disso, os primeiros 30 dias da estadia não são reembolsáveis.',
    ],
  },
] as const;

function cancelShortLabel(value: string): string {
  return CANCEL_SHORT.find((o) => o.value === value)?.label ?? value;
}

function cancelLongLabel(value: string): string {
  return CANCEL_LONG.find((o) => o.value === value)?.label ?? value;
}

const WEEKDAYS = [
  { d: 0, label: 'Dom', full: 'Domingos' },
  { d: 1, label: 'Seg', full: 'Segundas-feiras' },
  { d: 2, label: 'Ter', full: 'Terças-feiras' },
  { d: 3, label: 'Qua', full: 'Quartas-feiras' },
  { d: 4, label: 'Qui', full: 'Quintas-feiras' },
  { d: 5, label: 'Sex', full: 'Sextas-feiras' },
  { d: 6, label: 'Sáb', full: 'Sábados' },
];

function defaultMinPorCheckin(globalMin: string): string[] {
  const v = String(Math.max(1, Number(globalMin) || 1));
  return Array.from({ length: 7 }, () => v);
}

const ANTECEDENCIA_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Mesmo dia' },
  { value: 1, label: '1 dia' },
  { value: 2, label: '2 dias' },
  { value: 3, label: '3 dias' },
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
];

const CUTOFF_HOURS: string[] = Array.from({ length: 24 }, (_, h) =>
  `${String(h).padStart(2, '0')}:00`,
);

const PREP_NIGHT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Nenhum' },
  { value: 1, label: '1 noite antes e depois de cada reserva' },
  { value: 2, label: '2 noites antes e depois de cada reserva' },
];

const PREP_HOUR_OPTIONS = [2, 4, 6, 8, 12];

const JANELA_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 24, label: '24 meses' },
  { value: 12, label: '12 meses' },
  { value: 9, label: '9 meses' },
  { value: 6, label: '6 meses' },
  { value: 3, label: '3 meses' },
  { value: 0, label: 'Datas indisponíveis por padrão' },
];

const WEEKDAYS_RESTRICT = [
  { d: 0, label: 'Domingo' },
  { d: 1, label: 'Segunda-feira' },
  { d: 2, label: 'Terça-feira' },
  { d: 3, label: 'Quarta-feira' },
  { d: 4, label: 'Quinta-feira' },
  { d: 5, label: 'Sexta-feira' },
  { d: 6, label: 'Sábado' },
];

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function prepSummaryLabel(noites: string, horas: string): string {
  const n = Number(noites) || 0;
  const h = Number(horas) || 0;
  if (n >= 1) {
    return n === 1
      ? '1 noite antes e depois'
      : `${n} noites antes e depois`;
  }
  if (h >= 1) return `${h} hora${h === 1 ? '' : 's'}`;
  return 'Nenhum';
}

function janelaSummaryLabel(meses: string): string {
  const m = Number(meses);
  if (!Number.isFinite(m) || m <= 0) return 'Datas indisponíveis por padrão';
  return `${m} meses de antecedência`;
}

/** allowed empty = all days open; UI selects restricted days. */
function toggleRestrictedDay(allowed: number[], day: number): number[] {
  const current = allowed.length === 0 ? [...ALL_WEEKDAYS] : [...allowed];
  const isRestricted = !current.includes(day);
  let next: number[];
  if (isRestricted) {
    next = [...current, day].sort((a, b) => a - b);
  } else {
    next = current.filter((d) => d !== day);
  }
  if (next.length === 7) return [];
  if (next.length === 0) return current;
  return next;
}

function isDayRestricted(allowed: number[], day: number): boolean {
  if (allowed.length === 0) return false;
  return !allowed.includes(day);
}

function SaveButton({
  enabled,
  busy,
  onClick,
  label = 'Salvar',
}: {
  enabled: boolean;
  busy: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      disabled={!enabled || busy}
      onClick={onClick}
      className={`w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 ${
        enabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
      }`}
    >
      {label}
    </button>
  );
}

function SettingCard({
  title,
  subtitle,
  value,
  onClick,
  chevron,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  onClick?: () => void;
  chevron?: boolean;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{title}</p>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          {value != null && value !== '' && (
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          )}
        </div>
        {chevron && <span className="text-slate-400">›</span>}
      </div>
    </Comp>
  );
}

function PanelHeader({
  title,
  onBack,
  hint,
}: {
  title: string;
  onBack: () => void;
  hint?: string;
}) {
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
        aria-label="Voltar"
      >
        ←
      </button>
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

const HINT =
  'Estas configurações se aplicam a todas as noites, a menos que você as personalize por data.';

export function RateCalendarDrawer({
  panel,
  onPanel,
  isMaster,
  busy,
  teto,
  acomodacaoId,
  selectedDate,
  selectedDia,
  form,
  onForm,
  onSaveDefaults,
  onSaveDay,
  onSaveDayNote,
  onToggleBlock,
  onCloseDay,
  onEnsureIcalToken,
  onRegenerateIcalToken,
  onSaveIcalImportUrl,
  onSyncIcalImport,
  precoSugerido = 199,
  ganhoBuscasPct = 26,
}: Props) {
  const [smartHelpOpen, setSmartHelpOpen] = useState(false);
  const [baseBreakdownOpen, setBaseBreakdownOpen] = useState(true);
  const [editingBase, setEditingBase] = useState(false);
  const [copiedIcal, setCopiedIcal] = useState(false);

  const icalFeedUrl =
    form.formIcalToken && acomodacaoId
      ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/v1/acomodacoes/anfitriao/unidades/${acomodacaoId}/ical.ics?token=${form.formIcalToken}`
      : '';

  async function copyIcalUrl() {
    if (!icalFeedUrl || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(icalFeedUrl);
      setCopiedIcal(true);
      setTimeout(() => setCopiedIcal(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const baseNum = useMemo(() => {
    const n = Number(String(form.formBase).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [form.formBase]);

  const smartSuggestions = useMemo(() => smartPriceSuggestions(baseNum), [baseNum]);

  const dateLabel = (() => {
    if (!selectedDate) return '';
    try {
      const d = new Date(`${selectedDate}T12:00:00`);
      return format(d, "d 'de' MMM", { locale: ptBR }).replace('.', '');
    } catch {
      return selectedDate;
    }
  })();

  if ((panel === 'dia' || panel === 'dia-obs') && selectedDate) {
    const estado = selectedDia?.estado || 'livre';
    const disponivel = estado === 'livre';
    const efetivo = selectedDia?.precoEfetivo != null ? Number(selectedDia.precoEfetivo) : null;
    const base =
      selectedDia?.precoBase != null
        ? Number(selectedDia.precoBase)
        : baseNum;
    const showStrike =
      efetivo != null && base != null && Number.isFinite(base) && base > efetivo + 0.009;
    const customNote = isCustomObservacao(selectedDia?.observacao)
      ? selectedDia!.observacao!.trim()
      : '';
    const noteDraft = form.dayNote.slice(0, NOTE_MAX);
    const remaining = NOTE_MAX - noteDraft.length;

    if (panel === 'dia-obs') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold capitalize text-white">
              {dateLabel}
            </span>
            <button
              type="button"
              onClick={() => onPanel('dia')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xl text-white"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <div className="rounded-3xl bg-slate-900 p-4 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">Bloqueada por você</p>
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" aria-hidden />
            </div>
            <textarea
              className="mt-4 min-h-[88px] w-full resize-none rounded-xl border border-white/40 bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-white"
              maxLength={NOTE_MAX}
              value={noteDraft}
              disabled={!isMaster || busy}
              onChange={(e) => onForm({ dayNote: e.target.value.slice(0, NOTE_MAX) })}
              placeholder="Motivo do bloqueio (opcional)"
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-400">
              {remaining} caractere{remaining === 1 ? '' : 's'} disponível
              {remaining === 1 ? '' : 'is'}
            </p>
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                className="text-sm font-medium underline"
                onClick={() => onPanel('dia')}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!isMaster || busy}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-40"
                onClick={onSaveDayNote}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold capitalize text-white">
            {dateLabel}
          </span>
          <button
            type="button"
            onClick={onCloseDay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xl text-white"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="rounded-3xl bg-slate-900 p-4 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold">
                  {disponivel
                    ? 'Disponível'
                    : estado === 'reservado'
                      ? 'Reservado'
                      : 'Bloqueada por você'}
                </p>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    disponivel
                      ? 'bg-emerald-400'
                      : estado === 'reservado'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                  }`}
                  aria-hidden
                />
              </div>
              {estado === 'bloqueado' && isMaster && (
                <button
                  type="button"
                  className="mt-2 text-sm text-white underline underline-offset-2"
                  onClick={() => {
                    onForm({
                      dayNote: customNote,
                    });
                    onPanel('dia-obs');
                  }}
                >
                  {customNote ? 'Editar observação' : 'Adicionar observação'}
                </button>
              )}
              {estado === 'bloqueado' && customNote && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-300">{customNote}</p>
              )}
            </div>
            {isMaster && estado !== 'reservado' && (
              <div
                className="flex shrink-0 overflow-hidden rounded-full border border-slate-600 bg-slate-800 p-0.5"
                role="group"
                aria-label="Disponibilidade"
              >
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={!disponivel}
                  aria-label="Bloquear"
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    !disponivel ? 'bg-white text-slate-900' : 'text-slate-300'
                  }`}
                  onClick={() => {
                    if (disponivel) onToggleBlock(true);
                  }}
                >
                  ✕
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={disponivel}
                  aria-label="Disponibilizar"
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    disponivel ? 'bg-white text-slate-900' : 'text-slate-300'
                  }`}
                  onClick={() => {
                    if (!disponivel) onToggleBlock(false);
                  }}
                >
                  ✓
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900 p-4 text-white shadow-sm">
          <p className="text-sm text-slate-300">Preço do anúncio</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <p className="text-3xl font-bold tracking-tight">
              {efetivo != null ? moneyBr(efetivo) : '—'}
            </p>
            {showStrike && (
              <p className="text-lg text-slate-400 line-through">{moneyBr(base)}</p>
            )}
          </div>
        </div>

        {isMaster ? (
          <details className="group rounded-3xl bg-slate-900 text-white open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 font-semibold">
              Configurações personalizadas
              <span className="text-xl text-slate-400 group-open:hidden">+</span>
              <span className="hidden text-xl text-slate-400 group-open:inline">−</span>
            </summary>
            <div className="space-y-3 border-t border-slate-700 px-4 pb-4 pt-3">
              <label className="block text-sm text-slate-300">
                Preço do dia (R$) — vazio remove override
                <input
                  className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-white"
                  value={form.dayPrice}
                  disabled={busy}
                  onChange={(e) => onForm({ dayPrice: e.target.value })}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={onSaveDay}
                className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-50"
              >
                Salvar preço do dia
              </button>
            </div>
          </details>
        ) : (
          <p className="px-1 text-sm text-slate-500">Somente leitura neste perfil.</p>
        )}
      </div>
    );
  }

  if (panel === 'preco-basico') {
    const payout = baseNum != null ? hostPayoutBreakdown(baseNum) : null;
    return (
      <>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Voltar"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200"
              onClick={() => onPanel('precos')}
            >
              ←
            </button>
            <h2 className="text-lg font-bold text-slate-900">Preço básico</h2>
            <button
              type="button"
              aria-label="Ajuda"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm"
              onClick={() => setSmartHelpOpen(true)}
            >
              ?
            </button>
          </div>

          <div className="flex items-center gap-2">
            {editingBase ? (
              <input
                className="w-44 rounded-xl border px-3 py-2 text-3xl font-bold"
                value={form.formBase}
                disabled={!isMaster || busy}
                onChange={(e) => onForm({ formBase: e.target.value })}
                autoFocus
              />
            ) : (
              <p className="text-4xl font-bold text-slate-900">
                {moneyBr(baseNum).replace(/\s/g, '')}
              </p>
            )}
            {isMaster && (
              <button
                type="button"
                aria-label="Editar preço"
                className="text-slate-500"
                onClick={() => setEditingBase((v) => !v)}
              >
                ✎
              </button>
            )}
          </div>

          {payout && (
            <>
              {baseBreakdownOpen ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-600">Preço básico</span>
                      <span className="font-medium">{moneyBr(baseNum)}</span>
                    </div>
                    <div className="mt-2 flex justify-between gap-2">
                      <span className="text-slate-600">Taxa de serviço do anfitrião</span>
                      <span className="font-medium">-{moneyBr(payout.taxa)}</span>
                    </div>
                    <div className="mt-3 flex justify-between gap-2 border-t border-slate-100 pt-3">
                      <span className="font-semibold text-slate-900">Você recebe</span>
                      <span className="font-bold text-slate-900">{moneyBr(payout.recebe)}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-600">Preço para o hóspede</span>
                      <span className="font-medium">{moneyBr(baseNum)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mx-auto flex items-center gap-1 text-sm text-slate-600"
                    onClick={() => setBaseBreakdownOpen(false)}
                  >
                    Mostrar menos <span aria-hidden>⌃</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-sm text-slate-600 underline"
                  onClick={() => setBaseBreakdownOpen(true)}
                >
                  Você recebe {moneyBr(payout.recebe)} · Mostrar mais
                </button>
              )}
            </>
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
                onForm({ formBase: String(precoSugerido) });
                setEditingBase(true);
              }}
            >
              Experimente com {moneyBr(precoSugerido).replace(/\s/g, '')}
            </button>
          </div>

          <SettingCard
            title="Preço Inteligente"
            subtitle={
              form.formSmartAtivo
                ? `Ativo · ${moneyBr(Number(form.formSmartMin) || null)} – ${moneyBr(Number(form.formSmartMax) || null)}`
                : 'Ajuste automático por demanda'
            }
            chevron
            onClick={() => onPanel('preco-inteligente')}
          />

          {isMaster && (
            <button
              type="button"
              disabled={busy}
              onClick={onSaveDefaults}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Salvar
            </button>
          )}
        </div>
        <PrecoInteligenteHelpModal open={smartHelpOpen} onClose={() => setSmartHelpOpen(false)} />
      </>
    );
  }

  if (panel === 'preco-inteligente') {
    const smartMinNum = Number(String(form.formSmartMin).replace(',', '.'));
    const smartMaxNum = Number(String(form.formSmartMax).replace(',', '.'));
    const smartRangeOk =
      Number.isFinite(smartMinNum) &&
      smartMinNum > 0 &&
      Number.isFinite(smartMaxNum) &&
      smartMaxNum >= smartMinNum;
    const canSaveSmart =
      isMaster && !busy && (!form.formSmartAtivo || smartRangeOk);

    return (
      <>
        <div className="space-y-4">
          <button
            type="button"
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200"
            onClick={() => onPanel('precos')}
          >
            ←
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Preço Inteligente</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              O Preço Inteligente define seu preço automaticamente conforme a demanda. Você define a
              faixa de preço e pode alterar o valor quando quiser.{' '}
              <button
                type="button"
                className="font-medium text-slate-900 underline"
                onClick={() => setSmartHelpOpen(true)}
              >
                Saiba mais
              </button>
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <p className="font-semibold text-slate-900">Ativar Preço Inteligente</p>
              <p className="mt-1 text-sm text-slate-500">Ajustes automáticos dentro da faixa</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.formSmartAtivo}
              disabled={!isMaster || busy}
              onClick={() => onForm({ formSmartAtivo: !form.formSmartAtivo })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                form.formSmartAtivo ? 'bg-slate-900' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  form.formSmartAtivo ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <label className="text-sm font-medium text-slate-800">
                  Preço mínimo por noite*
                </label>
                <button
                  type="button"
                  className="text-sm text-slate-700 underline"
                  disabled={!isMaster || busy}
                  onClick={() => {
                    onForm({
                      formSmartMin: String(smartSuggestions.min),
                      formSmartAtivo: true,
                    });
                  }}
                >
                  Testar com {moneyBr(smartSuggestions.min).replace(/\s/g, '')}
                </button>
              </div>
              <input
                className="mt-2 w-full border-0 bg-transparent text-3xl font-bold text-slate-400 outline-none placeholder:text-slate-300 focus:text-slate-900"
                placeholder="R$0"
                value={form.formSmartMin}
                disabled={!isMaster || busy || !form.formSmartAtivo}
                onChange={(e) => onForm({ formSmartMin: e.target.value })}
              />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <label className="text-sm font-medium text-slate-800">
                  Preço máximo por noite
                </label>
                <button
                  type="button"
                  className="text-sm text-slate-700 underline"
                  disabled={!isMaster || busy}
                  onClick={() => {
                    onForm({
                      formSmartMax: String(smartSuggestions.max),
                      formSmartAtivo: true,
                    });
                  }}
                >
                  Testar com {moneyBr(smartSuggestions.max).replace(/\s/g, '')}
                </button>
              </div>
              <input
                className="mt-2 w-full border-0 bg-transparent text-3xl font-bold text-slate-400 outline-none placeholder:text-slate-300 focus:text-slate-900"
                placeholder="R$0"
                value={form.formSmartMax}
                disabled={!isMaster || busy || !form.formSmartAtivo}
                onChange={(e) => onForm({ formSmartMax: e.target.value })}
              />
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            *O preço que o hóspede vê pode ser menor do que o preço mínimo por noite que você definiu
            se tiver descontos ou promoções.
          </p>

          <button
            type="button"
            disabled={!canSaveSmart}
            onClick={onSaveDefaults}
            className={`w-full rounded-xl py-3 text-sm font-semibold ${
              canSaveSmart
                ? 'bg-slate-900 text-white'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            Salvar
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-900"
            onClick={() => onPanel('precos')}
          >
            Cancelar
          </button>
        </div>
        <PrecoInteligenteHelpModal open={smartHelpOpen} onClose={() => setSmartHelpOpen(false)} />
      </>
    );
  }

  if (panel === 'menu') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">{HINT}</p>
        <SettingCard
          title="Preços"
          subtitle="Básico, fim de semana e taxas"
          chevron
          onClick={() => onPanel('precos')}
        />
        <SettingCard
          title="Descontos"
          subtitle="Semanal, mensal e teto de parceiros"
          chevron
          onClick={() => onPanel('descontos')}
        />
        <SettingCard
          title="Disponibilidade"
          subtitle="Mínimo, máximo e antecedência"
          chevron
          onClick={() => onPanel('disponibilidade')}
        />
        <SettingCard
          title="Cancelamentos"
          subtitle="Políticas e opção não reembolsável"
          chevron
          onClick={() => onPanel('cancelamentos')}
        />
      </div>
    );
  }

  if (panel === 'precos') {
    return (
      <div className="space-y-3">
        <PanelHeader title="Preços" onBack={() => onPanel('menu')} hint={HINT} />
        <SettingCard
          title="Preço básico"
          subtitle="Valor por noite e taxa do anfitrião"
          value={baseNum != null ? moneyBr(baseNum) : undefined}
          chevron
          onClick={() => onPanel('preco-basico')}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <label className="block flex-1 text-sm font-medium text-slate-800">
              Preço para fins de semana
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-2xl font-bold"
                value={form.formWeekend}
                disabled={!isMaster || busy}
                onChange={(e) => onForm({ formWeekend: e.target.value })}
                placeholder="R$"
              />
            </label>
            {isMaster && form.formWeekend.trim() !== '' && (
              <button
                type="button"
                className="mt-1 text-sm text-slate-600 underline"
                disabled={busy}
                onClick={() => onForm({ formWeekend: '' })}
              >
                Remover
              </button>
            )}
          </div>
        </div>
        <SettingCard
          title="Taxas"
          subtitle="Limpeza, pet e hóspede extra"
          chevron
          onClick={() => onPanel('taxas')}
        />
        <SettingCard
          title="Preço Inteligente"
          subtitle={
            form.formSmartAtivo
              ? 'Ativo — ajusta automaticamente na faixa'
              : 'Desativado — ative para preços por demanda'
          }
          chevron
          onClick={() => onPanel('preco-inteligente')}
        />
        {isMaster && (
          <button
            type="button"
            disabled={busy}
            onClick={onSaveDefaults}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Salvar preços
          </button>
        )}
      </div>
    );
  }

  if (panel === 'taxas') {
    return (
      <div className="space-y-3">
        <PanelHeader title="Taxas" onBack={() => onPanel('precos')} hint={HINT} />
        {(
          [
            ['formTaxaLimpeza', 'Taxa de limpeza'],
            ['formTaxaPet', 'Taxa de pet'],
            ['formTaxaExtra', 'Taxa por hóspede extra'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-sm font-medium">
              {label} (R$)
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xl font-bold"
                value={form[key]}
                disabled={!isMaster || busy}
                onChange={(e) => onForm({ [key]: e.target.value })}
              />
            </label>
          </div>
        ))}
        {isMaster && (
          <button
            type="button"
            disabled={busy}
            onClick={onSaveDefaults}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Salvar taxas
          </button>
        )}
      </div>
    );
  }

  if (panel === 'descontos') {
    return (
      <div className="space-y-3">
        <PanelHeader title="Descontos" onBack={() => onPanel('menu')} hint={HINT} />
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-semibold">Por semana</p>
          <p className="text-sm text-slate-500">Para 7 noites ou mais</p>
          <label className="mt-2 block text-sm">
            Percentual
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-2xl font-bold"
              value={form.formSemanal}
              disabled={!isMaster || busy}
              onChange={(e) => onForm({ formSemanal: e.target.value })}
            />
          </label>
          <p className="mt-1 text-right text-2xl font-bold text-slate-900">
            {form.formSemanal || '0'}%
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-semibold">Por mês</p>
          <p className="text-sm text-slate-500">Para 28 noites ou mais</p>
          <label className="mt-2 block text-sm">
            Percentual
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-2xl font-bold"
              value={form.formMensal}
              disabled={!isMaster || busy}
              onChange={(e) => onForm({ formMensal: e.target.value })}
            />
          </label>
          <p className="mt-1 text-right text-2xl font-bold text-slate-900">
            {form.formMensal || '0'}%
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-800">Desconto máximo parceiros CRM</p>
          <p className="mt-1 text-sm text-slate-500">
            Teto server-side para corretores e agentes (somente leitura aqui).
          </p>
          <p className="mt-2 text-2xl font-bold">{teto}%</p>
        </div>
        {(
          [
            {
              title: 'Reservas de última hora',
              sub: 'Estadias reservadas N dias ou menos antes do check-in',
              pct: 'formUltimaHoraPct' as const,
              extra: 'formUltimaHoraDias' as const,
              extraLabel: 'Dias até o check-in',
            },
            {
              title: 'Reservas antecipadas',
              sub: 'Estadias reservadas com N dias ou mais de antecedência',
              pct: 'formAntecipadaPct' as const,
              extra: 'formAntecipadaDias' as const,
              extraLabel: 'Dias de antecedência',
            },
            {
              title: 'Promoção para novo anúncio',
              sub: 'Aplica-se às primeiras reservas do anúncio',
              pct: 'formNovoAnuncioPct' as const,
              extra: 'formNovoAnuncioLimite' as const,
              extraLabel: 'Primeiras reservas',
            },
          ] as const
        ).map((card) => (
          <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <p className="font-semibold">{card.title}</p>
            <p className="text-sm text-slate-500">{card.sub}</p>
            <label className="block text-sm">
              Percentual
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-xl font-bold"
                value={form[card.pct]}
                disabled={!isMaster || busy}
                onChange={(e) => onForm({ [card.pct]: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              {card.extraLabel}
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form[card.extra]}
                disabled={!isMaster || busy}
                onChange={(e) => onForm({ [card.extra]: e.target.value })}
              />
            </label>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="font-semibold">Hóspedes com avaliações excelentes</p>
          <p className="text-sm text-slate-500">
            Nota mínima e quantidade de avaliações do hóspede
          </p>
          <label className="block text-sm">
            Percentual
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-xl font-bold"
              value={form.formAvaliacaoPct}
              disabled={!isMaster || busy}
              onChange={(e) => onForm({ formAvaliacaoPct: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              Nota mín.
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.formAvaliacaoNota}
                disabled={!isMaster || busy}
                onChange={(e) => onForm({ formAvaliacaoNota: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Avaliações mín.
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={form.formAvaliacaoReviews}
                disabled={!isMaster || busy}
                onChange={(e) => onForm({ formAvaliacaoReviews: e.target.value })}
              />
            </label>
          </div>
        </div>
        {isMaster && (
          <button
            type="button"
            disabled={busy}
            onClick={onSaveDefaults}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Salvar descontos
          </button>
        )}
      </div>
    );
  }

  if (panel === 'disponibilidade') {
    const antecedenciaLabel =
      Number(form.formAntecedencia) === 0
        ? 'Mesmo dia'
        : `${form.formAntecedencia} dia(s)`;
    const prepLabel = prepSummaryLabel(form.formPreparacao, form.formPreparacaoHoras);
    const janelaLabel = janelaSummaryLabel(form.formJanelaMeses);
    const restrito =
      form.formCheckinDias.length > 0 || form.formCheckoutDias.length > 0;
    return (
      <div className="space-y-3">
        <PanelHeader
          title="Disponibilidade"
          onBack={() => onPanel('menu')}
          hint="Estas configurações se aplicam a todas as noites, a menos que você as personalize por data."
        />
        <SettingCard
          title="Número mínimo de noites"
          value={form.formMin || '1'}
          chevron
          onClick={() => isMaster && onPanel('disp-min-noites')}
        />
        <SettingCard
          title="Número máximo de noites"
          value={form.formMax || '30'}
          chevron
          onClick={() => isMaster && onPanel('disp-max-noites')}
        />
        <SettingCard
          title="Tempo de antecedência"
          value={antecedenciaLabel}
          chevron
          onClick={() => isMaster && onPanel('disp-antecedencia')}
        />
        {Number(form.formAntecedencia) === 0 && (
          <SettingCard
            title="Aviso prévio para o mesmo dia"
            value={form.formCutoff || '09:00'}
            chevron
            onClick={() => isMaster && onPanel('disp-aviso-mesmo-dia')}
          />
        )}
        <SettingCard
          title="Tempo de preparação"
          value={prepLabel}
          chevron
          onClick={() => isMaster && onPanel('disp-preparacao')}
        />
        <SettingCard
          title="Período de disponibilidade"
          value={janelaLabel}
          chevron
          onClick={() => isMaster && onPanel('disp-janela')}
        />
        <SettingCard
          title="Mais configurações de disponibilidade"
          subtitle={
            restrito
              ? 'Dias de check-in e checkout restritos'
              : 'Dias de check-in e checkout'
          }
          chevron
          onClick={() => isMaster && onPanel('disp-checkin-dias')}
        />
        <div className="pt-2 space-y-3 border-t border-slate-100">
          <h3 className="font-bold text-slate-900">Conectar calendários</h3>
          <p className="text-sm text-slate-500">
            Sincronize todos os seus calendários de hospedagem para que eles fiquem atualizados
            automaticamente.
          </p>
          <SettingCard
            title="Conectar a outro site"
            chevron
            onClick={() => isMaster && onPanel('disp-ical')}
          />
        </div>
      </div>
    );
  }

  if (panel === 'disp-min-noites') {
    const draft = form.formMin;
    const canSave = Number(draft) >= 1 && !busy;
    return (
      <div className="flex min-h-[420px] flex-col">
        <PanelHeader title="Número mínimo de noites" onBack={() => onPanel('disponibilidade')} />
        <div className="flex flex-1 flex-col items-center pt-8">
          <input
            type="number"
            min={1}
            className="w-40 border-0 bg-transparent text-center text-5xl font-bold text-slate-900 outline-none"
            value={draft}
            disabled={!isMaster || busy}
            onChange={(e) => onForm({ formMin: e.target.value })}
            autoFocus
          />
          <button
            type="button"
            disabled={!isMaster || busy}
            onClick={() => {
              const base = defaultMinPorCheckin(form.formMin);
              const current =
                form.formMinPorCheckin?.length === 7
                  ? form.formMinPorCheckin
                  : base;
              onForm({ formMinPorCheckin: current.map((v) => v || form.formMin || '1') });
              onPanel('disp-min-por-dia');
            }}
            className="mt-10 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-sm font-semibold text-slate-900"
          >
            Personalizar por dia de check-in
            <span className="text-slate-400">›</span>
          </button>
        </div>
        <div className="mt-auto space-y-2 pt-6">
          <SaveButton
            enabled={canSave && isMaster}
            busy={busy}
            onClick={() => {
              const n = Math.max(1, Number(form.formMin) || 1);
              const synced = (form.formMinPorCheckin?.length === 7
                ? form.formMinPorCheckin
                : defaultMinPorCheckin(String(n))
              ).map((v) => (Number(v) >= 1 ? v : String(n)));
              const patch = { formMin: String(n), formMinPorCheckin: synced };
              onForm(patch);
              onSaveDefaults(patch);
              onPanel('disponibilidade');
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => onPanel('disponibilidade')}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (panel === 'disp-min-por-dia') {
    const values =
      form.formMinPorCheckin?.length === 7
        ? form.formMinPorCheckin
        : defaultMinPorCheckin(form.formMin);
    return (
      <div className="flex min-h-[420px] flex-col">
        <PanelHeader
          title="Personalizar por dia"
          onBack={() => onPanel('disp-min-noites')}
          hint="Defina uma estadia mínima baseada no dia do check-in."
        />
        <div className="space-y-3">
          {WEEKDAYS.map((w) => (
            <div key={w.d} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800">{w.full}</span>
              <input
                type="number"
                min={1}
                className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-center text-lg font-semibold"
                value={values[w.d] ?? form.formMin}
                disabled={!isMaster || busy}
                onChange={(e) => {
                  const next = [...values];
                  next[w.d] = e.target.value;
                  onForm({ formMinPorCheckin: next });
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-auto pt-6">
          <SaveButton
            enabled={isMaster && !busy}
            busy={busy}
            onClick={() => {
              const cleaned = values.map((v) => String(Math.max(1, Number(v) || 1)));
              const globalMin = Math.min(...cleaned.map((v) => Number(v)));
              const patch = { formMinPorCheckin: cleaned, formMin: String(globalMin) };
              onForm(patch);
              onSaveDefaults(patch);
              onPanel('disponibilidade');
            }}
          />
        </div>
      </div>
    );
  }

  if (panel === 'disp-max-noites') {
    const canSave = isMaster && !busy && Number(form.formMax) >= 1;
    return (
      <div className="flex min-h-[360px] flex-col">
        <PanelHeader title="Número máximo de noites" onBack={() => onPanel('disponibilidade')} />
        <div className="flex flex-1 flex-col items-center pt-8">
          <input
            type="number"
            min={1}
            className="w-40 border-0 bg-transparent text-center text-5xl font-bold outline-none"
            value={form.formMax}
            disabled={!isMaster || busy}
            onChange={(e) => onForm({ formMax: e.target.value })}
            autoFocus
          />
        </div>
        <div className="mt-auto space-y-2">
          <SaveButton
            enabled={canSave}
            busy={busy}
            onClick={() => {
              onSaveDefaults();
              onPanel('disponibilidade');
            }}
          />
          <button
            type="button"
            onClick={() => onPanel('disponibilidade')}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (panel === 'disp-antecedencia') {
    const selected = Number(form.formAntecedencia) || 0;
    const known = ANTECEDENCIA_OPTIONS.some((o) => o.value === selected);
    return (
      <div className="flex min-h-[420px] flex-col space-y-4">
        <PanelHeader
          title="Tempo de antecedência"
          onBack={() => onPanel('disponibilidade')}
          hint="Quanto tempo de antecedência você precisa entre a reserva de um hóspede e a chegada dele?"
        />
        <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200">
          {ANTECEDENCIA_OPTIONS.map((o) => {
            const on = selected === o.value;
            return (
              <button
                key={o.value}
                type="button"
                disabled={!isMaster || busy}
                onClick={() => onForm({ formAntecedencia: String(o.value) })}
                className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0"
              >
                <span className={on ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                  {o.label}
                </span>
                {on && <span className="text-slate-900">✓</span>}
              </button>
            );
          })}
          {!known && (
            <div className="px-4 py-3 text-sm text-slate-500">
              Valor atual: {selected} dia(s)
            </div>
          )}
        </div>
        {selected === 0 && (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Permitir pedidos para o mesmo dia
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Você analisará e aprovará cada pedido de reserva.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.formPermitirPedidosMesmoDia}
              disabled={!isMaster || busy}
              onClick={() =>
                onForm({ formPermitirPedidosMesmoDia: !form.formPermitirPedidosMesmoDia })
              }
              className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${
                form.formPermitirPedidosMesmoDia ? 'bg-slate-900' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] shadow transition ${
                  form.formPermitirPedidosMesmoDia ? 'left-5' : 'left-0.5'
                }`}
              >
                {form.formPermitirPedidosMesmoDia ? '✓' : ''}
              </span>
            </button>
          </div>
        )}
        <div className="mt-auto">
          <SaveButton
            enabled={isMaster && !busy}
            busy={busy}
            onClick={() => {
              onSaveDefaults();
              onPanel('disponibilidade');
            }}
          />
        </div>
      </div>
    );
  }

  if (panel === 'disp-aviso-mesmo-dia') {
    const selected = form.formCutoff || '09:00';
    return (
      <div className="flex min-h-[420px] flex-col space-y-4">
        <PanelHeader
          title="Aviso prévio para o mesmo dia"
          onBack={() => onPanel('disponibilidade')}
          hint="Os hóspedes podem reservar no mesmo dia do check-in até esta hora."
        />
        <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200">
          {CUTOFF_HOURS.map((h) => {
            const on = selected === h;
            return (
              <button
                key={h}
                type="button"
                disabled={!isMaster || busy}
                onClick={() => onForm({ formCutoff: h })}
                className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0"
              >
                <span className={on ? 'font-semibold text-slate-900' : 'text-slate-700'}>{h}</span>
                {on && <span className="text-slate-900">✓</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-auto">
          <SaveButton
            enabled={isMaster && !busy}
            busy={busy}
            onClick={() => {
              onSaveDefaults();
              onPanel('disponibilidade');
            }}
          />
        </div>
      </div>
    );
  }

  if (panel === 'disp-preparacao') {
    const nights = Number(form.formPreparacao) || 0;
    const hours = Number(form.formPreparacaoHoras) || 0;
    return (
      <div className="flex min-h-[420px] flex-col space-y-4">
        <PanelHeader
          title="Tempo de preparação"
          onBack={() => onPanel('disponibilidade')}
          hint="Quantas noites antes e depois de cada reserva você precisa bloquear?"
        />
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          {PREP_NIGHT_OPTIONS.map((o) => {
            const selected = nights === o.value;
            const showCheck =
              selected && (o.value > 0 || hours === 0);
            return (
              <button
                key={o.value}
                type="button"
                disabled={!isMaster || busy}
                onClick={() =>
                  onForm({
                    formPreparacao: String(o.value),
                    formPreparacaoHoras: o.value > 0 ? '0' : form.formPreparacaoHoras,
                  })
                }
                className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0"
              >
                <span className={selected ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                  {o.label}
                </span>
                {showCheck && <span className="text-slate-900">✓</span>}
              </button>
            );
          })}
        </div>

        {nights === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Preparação em horas</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Bloqueia apenas algumas horas entre o checkout e o próximo check-in — a unidade
                volta a ficar disponível no mesmo dia.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!isMaster || busy}
                onClick={() => onForm({ formPreparacaoHoras: '0' })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  hours === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Sem horas
              </button>
              {PREP_HOUR_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  disabled={!isMaster || busy}
                  onClick={() => onForm({ formPreparacao: '0', formPreparacaoHoras: String(h) })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    hours === h ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
            <label className="block text-xs text-slate-600">
              Ou informe as horas (1–23)
              <input
                type="number"
                min={0}
                max={23}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-lg font-semibold"
                value={form.formPreparacaoHoras}
                disabled={!isMaster || busy}
                onChange={(e) =>
                  onForm({
                    formPreparacao: '0',
                    formPreparacaoHoras: e.target.value,
                  })
                }
              />
            </label>
          </div>
        )}

        <div className="mt-auto">
          <SaveButton
            enabled={isMaster && !busy}
            busy={busy}
            onClick={() => {
              const n = Math.max(0, Math.floor(Number(form.formPreparacao) || 0));
              const h =
                n > 0
                  ? 0
                  : Math.min(23, Math.max(0, Math.floor(Number(form.formPreparacaoHoras) || 0)));
              const patch = {
                formPreparacao: String(n),
                formPreparacaoHoras: String(h),
              };
              onForm(patch);
              onSaveDefaults(patch);
              onPanel('disponibilidade');
            }}
          />
        </div>
      </div>
    );
  }

  if (panel === 'disp-janela') {
    const selected = Number(form.formJanelaMeses);
    return (
      <div className="flex min-h-[420px] flex-col space-y-4">
        <PanelHeader
          title="Período de disponibilidade"
          onBack={() => onPanel('disponibilidade')}
          hint="Com quanta antecedência os hóspedes podem reservar?"
        />
        <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200">
          {JANELA_OPTIONS.map((o) => {
            const on = selected === o.value;
            return (
              <button
                key={o.value}
                type="button"
                disabled={!isMaster || busy}
                onClick={() => onForm({ formJanelaMeses: String(o.value) })}
                className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0 ${
                  on ? 'bg-slate-50' : ''
                }`}
              >
                <span className={on ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                  {o.label}
                </span>
                {on && <span className="text-slate-900">✓</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-auto">
          <SaveButton
            enabled={isMaster && !busy}
            busy={busy}
            onClick={() => {
              onSaveDefaults();
              onPanel('disponibilidade');
            }}
          />
        </div>
      </div>
    );
  }

  if (panel === 'disp-checkin-dias') {
    return (
      <div className="space-y-4">
        <PanelHeader title="Disponibilidade" onBack={() => onPanel('disponibilidade')} />
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900">Check-in restrito</h3>
          <p className="text-sm text-slate-500">
            Os hóspedes não poderão reservar seu espaço se a estadia começar nesses dias.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {WEEKDAYS_RESTRICT.map((w) => {
              const on = isDayRestricted(form.formCheckinDias, w.d);
              return (
                <button
                  key={`rin-${w.d}`}
                  type="button"
                  disabled={!isMaster || busy}
                  onClick={() =>
                    onForm({
                      formCheckinDias: toggleRestrictedDay(form.formCheckinDias, w.d),
                    })
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    on
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900">Checkout restrito</h3>
          <p className="text-sm text-slate-500">
            Os hóspedes não poderão reservar seu espaço se a estadia terminar nesses dias.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {WEEKDAYS_RESTRICT.map((w) => {
              const on = isDayRestricted(form.formCheckoutDias, w.d);
              return (
                <button
                  key={`rout-${w.d}`}
                  type="button"
                  disabled={!isMaster || busy}
                  onClick={() =>
                    onForm({
                      formCheckoutDias: toggleRestrictedDay(form.formCheckoutDias, w.d),
                    })
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    on
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
        {isMaster && (
          <SaveButton
            enabled={!busy}
            busy={busy}
            onClick={() => {
              onSaveDefaults();
              onPanel('disponibilidade');
            }}
          />
        )}
      </div>
    );
  }

  if (panel === 'disp-ical') {
    return (
      <div className="space-y-4">
        <PanelHeader
          title="Conectar a outro site"
          onBack={() => onPanel('disponibilidade')}
          hint="A conexão atualiza os calendários quando uma noite é reservada."
        />
        <div className="space-y-2">
          <p className="font-bold text-slate-900">Etapa 1</p>
          <p className="text-sm text-slate-500">Adicione este link ao outro site</p>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-medium text-slate-500">Link do calendário Reservei</p>
            <div className="mt-1 flex items-start gap-2">
              <p className="min-w-0 flex-1 break-all text-sm text-slate-800">
                {icalFeedUrl || 'Gere um token para obter a URL'}
              </p>
              {icalFeedUrl && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void copyIcalUrl()}
                  className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {copiedIcal ? 'Copiado' : 'Copiar'}
                </button>
              )}
            </div>
          </div>
          {isMaster && !form.formIcalToken && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onEnsureIcalToken?.()}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 text-sm font-semibold"
            >
              Gerar token iCal
            </button>
          )}
          {isMaster && form.formIcalToken && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRegenerateIcalToken?.()}
              className="text-xs font-semibold text-amber-800 underline"
            >
              Regenerar token
            </button>
          )}
        </div>
        <div className="space-y-2">
          <p className="font-bold text-slate-900">Etapa 2</p>
          <p className="text-sm text-slate-500">
            Crie um link com final .ics no outro site e adicione-o abaixo
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
            <label className="block text-[11px] font-medium text-slate-500">
              Link para outro site
              <input
                type="url"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://…/calendar.ics"
                value={form.formIcalImportUrl}
                disabled={!isMaster || busy}
                onChange={(e) => onForm({ formIcalImportUrl: e.target.value })}
              />
            </label>
            {form.formIcalImportLastStatus && (
              <p className="text-xs text-slate-600">
                Status: <strong>{form.formIcalImportLastStatus}</strong>
                {form.formIcalImportLastSyncAt
                  ? ` · ${new Date(form.formIcalImportLastSyncAt).toLocaleString('pt-BR')}`
                  : ''}
              </p>
            )}
            {form.formIcalImportLastError && (
              <p className="text-xs text-rose-600">{form.formIcalImportLastError}</p>
            )}
          </div>
        </div>
        {isMaster && (
          <div className="space-y-2">
            <SaveButton
              enabled={!busy && Boolean(form.formIcalImportUrl.trim())}
              busy={busy}
              label="Adicionar calendário"
              onClick={() => {
                onSaveIcalImportUrl?.();
                onSyncIcalImport?.();
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (panel === 'cancelamentos') {
    return (
      <div className="space-y-3">
        <PanelHeader title="Cancelamentos" onBack={() => onPanel('menu')} hint={HINT} />
        <SettingCard
          title="Estadias de curta duração"
          subtitle="Para menos de 28 noites"
          value={cancelShortLabel(form.formCancelCurta)}
          chevron
          onClick={() => isMaster && onPanel('cancel-curta')}
        />
        <SettingCard
          title="Estadias de longa duração"
          subtitle="Para 28 noites ou mais"
          value={cancelLongLabel(form.formCancelLonga)}
          chevron
          onClick={() => isMaster && onPanel('cancel-longa')}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Opção não reembolsável</p>
              <p className="mt-1 text-sm text-slate-500">
                Em estadias de curta duração, os hóspedes recebem 10% de desconto, e você mantém o
                pagamento integral caso eles cancelem.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.formNaoReembolsavel}
              disabled={!isMaster || busy}
              onClick={() => onForm({ formNaoReembolsavel: !form.formNaoReembolsavel })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                form.formNaoReembolsavel ? 'bg-slate-900' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  form.formNaoReembolsavel ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
        <p className="px-1 text-center text-xs text-slate-500">
          Todas as políticas padrão da Reservei Viagens incluem um período de cancelamento gratuito
          de 24 horas.
        </p>
        {isMaster && (
          <SaveButton
            enabled={!busy}
            busy={busy}
            label="Salvar cancelamentos"
            onClick={() => onSaveDefaults()}
          />
        )}
      </div>
    );
  }

  if (panel === 'cancel-curta') {
    return (
      <div className="flex min-h-[420px] flex-col">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Estadias de curta duração</h2>
          <p className="mt-1 text-sm text-slate-500">Para menos de 28 noites</p>
        </div>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {CANCEL_SHORT.map((o) => {
            const selected = form.formCancelCurta === o.value;
            return (
              <button
                key={o.value}
                type="button"
                disabled={!isMaster || busy}
                onClick={() => onForm({ formCancelCurta: o.value })}
                className={`relative w-full rounded-2xl border bg-white p-4 text-left transition ${
                  selected ? 'border-2 border-slate-900' : 'border-slate-200'
                }`}
              >
                <span
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500"
                  title={o.bullets.join(' ')}
                  aria-hidden
                >
                  i
                </span>
                <p className="pr-6 font-bold text-slate-900">{o.label}</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                  {o.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        <div className="mt-auto space-y-2 pt-4">
          <SaveButton
            enabled={isMaster && !busy}
            busy={busy}
            onClick={() => {
              onSaveDefaults({ formCancelCurta: form.formCancelCurta });
              onPanel('cancelamentos');
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => onPanel('cancelamentos')}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (panel === 'cancel-longa') {
    return (
      <div className="flex min-h-[420px] flex-col">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Estadias de longa duração</h2>
          <p className="mt-1 text-sm text-slate-500">Para 28 noites ou mais</p>
        </div>
        <div className="space-y-3">
          {CANCEL_LONG.map((o) => {
            const selected = form.formCancelLonga === o.value;
            return (
              <button
                key={o.value}
                type="button"
                disabled={!isMaster || busy}
                onClick={() => onForm({ formCancelLonga: o.value })}
                className={`w-full rounded-2xl border bg-white p-4 text-left transition ${
                  selected ? 'border-2 border-slate-900 bg-slate-50' : 'border-slate-200'
                }`}
              >
                <p className="font-bold text-slate-900">{o.label}</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                  {o.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        <div className="mt-auto space-y-2 pt-4">
          <SaveButton
            enabled={isMaster && !busy}
            busy={busy}
            onClick={() => {
              onSaveDefaults({ formCancelLonga: form.formCancelLonga });
              onPanel('cancelamentos');
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => onPanel('cancelamentos')}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return null;
}
