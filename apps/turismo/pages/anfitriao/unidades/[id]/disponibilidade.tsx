import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import AnfitriaoRoleGuard from '../../../../components/AnfitriaoRoleGuard';
import {
  AnfitriaoMonthCalendar,
  type CalendarioDiaView,
} from '../../../../components/anfitriao/AnfitriaoMonthCalendar';
import {
  RateCalendarDrawer,
  type DrawerPanel,
  type PricingForm,
} from '../../../../components/anfitriao/RateCalendarDrawer';
import { RateCalendarDicas } from '../../../../components/anfitriao/RateCalendarDicas';
import { SelecioneNoitesModal } from '../../../../components/anfitriao/SelecioneNoitesModal';
import {
  MultiNightDrawer,
  type MultiNightPanel,
} from '../../../../components/anfitriao/MultiNightDrawer';
import { CompareAnunciosModal } from '../../../../components/anfitriao/CompareAnunciosModal';
import { SelectionContextAlert } from '../../../../components/anfitriao/SelectionContextAlert';
import { AnfitriaoHostNav } from '../../../../components/anfitriao/AnfitriaoHostNav';
import { AnfitriaoPropertySwitcher } from '../../../../components/anfitriao/AnfitriaoPropertySwitcher';
import type { ConjuntoRegrasView } from '../../../../components/anfitriao/ConjuntosRegrasPanel';
import { fase1Api } from '@/lib/fase1-api';
import { useAuth } from '@/src/context/AuthContext';
import { parseRouteId } from '@/src/lib/parse-route-id';

type PageProps = { unitId: number };

/**
 * Validate id on the server. Rejects literal `/unidades/[id]/…` and non-numeric ids
 * so the client never interpolates a broken Next.js href.
 */
export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const unitId = parseRouteId(ctx.params?.id);
  if (unitId == null) {
    return {
      redirect: { destination: '/anfitriao/unidades', permanent: false },
    };
  }
  return { props: { unitId } };
};

function parseMoney(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parsePct(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function AnfitriaoRateCalendarPage({ unitId }: PageProps) {
  const id = unitId;
  const { user } = useAuth();
  const isMaster =
    user?.role === 'admin' || user?.role === 'manager' || user?.role === 'anfitriao';

  const [de, setDe] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [ate, setAte] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dias, setDias] = useState<CalendarioDiaView[]>([]);
  const [titulo, setTitulo] = useState('');
  const [teto, setTeto] = useState(10);
  const [dicaPreco, setDicaPreco] = useState(199);
  const [dicaGanho, setDicaGanho] = useState(26);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [panel, setPanel] = useState<DrawerPanel>('menu');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [selectNightsOpen, setSelectNightsOpen] = useState(false);
  const [multiDates, setMultiDates] = useState<string[]>([]);
  const [multiPanel, setMultiPanel] = useState<MultiNightPanel>('overview');
  const [compareOpen, setCompareOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(true);
  const [lastSelected, setLastSelected] = useState<string | null>(null);
  const [conjuntosRegras, setConjuntosRegras] = useState<ConjuntoRegrasView[]>([]);

  const [form, setForm] = useState<PricingForm>({
    formBase: '',
    formWeekend: '',
    formMin: '1',
    formMax: '30',
    formAntecedencia: '0',
    formCutoff: '09:00',
    formSemanal: '0',
    formMensal: '0',
    formTaxaLimpeza: '',
    formTaxaPet: '',
    formTaxaExtra: '',
    formCancelCurta: 'limitada',
    formCancelLonga: 'restrita_longa',
    formNaoReembolsavel: false,
    dayPrice: '',
    dayNote: '',
    formSmartAtivo: false,
    formSmartMin: '',
    formSmartMax: '',
    formUltimaHoraPct: '0',
    formUltimaHoraDias: '3',
    formAntecipadaPct: '0',
    formAntecipadaDias: '30',
    formNovoAnuncioPct: '0',
    formNovoAnuncioLimite: '3',
    formAvaliacaoPct: '0',
    formAvaliacaoNota: '4.8',
    formAvaliacaoReviews: '3',
    formPreparacao: '0',
    formPreparacaoHoras: '0',
    formJanelaMeses: '12',
    formCheckinDias: [],
    formCheckoutDias: [],
    formIcalToken: '',
    formIcalImportUrl: '',
    formIcalImportLastSyncAt: '',
    formIcalImportLastStatus: '',
    formIcalImportLastError: '',
    formMinPorCheckin: ['1', '1', '1', '1', '1', '1', '1'],
    formPermitirPedidosMesmoDia: true,
  });

  const patchForm = useCallback((patch: Partial<PricingForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const load = useCallback(async () => {
    if (!id || id <= 0) {
      setLoading(false);
      setErro('ID da unidade inválido');
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fase1Api.anfitriaoRateCalendar(id, de, ate);
      const data = res.data;
      const pd = data.pricingDefaults;
      setTitulo(data.titulo);
      setTeto(data.dias[0]?.tetoDesconto ?? 10);
      if (data.dicas) {
        setDicaPreco(data.dicas.precoSugerido);
        setDicaGanho(data.dicas.ganhoBuscasPct);
      }
      setForm((prev) => ({
        ...prev,
        formBase: pd.precoDiaria != null ? String(pd.precoDiaria) : '',
        formWeekend: pd.precoFimSemana != null ? String(pd.precoFimSemana) : '',
        formMin: String(pd.minNoites ?? 1),
        formMax: String(pd.maxNoites ?? 30),
        formAntecedencia: String(pd.antecedenciaDias ?? 0),
        formCutoff: pd.avisoPrevioMesmoDia || '09:00',
        formSemanal: String(pd.descontoSemanalPct ?? 0),
        formMensal: String(pd.descontoMensalPct ?? 0),
        formTaxaLimpeza: pd.taxaLimpeza != null ? String(pd.taxaLimpeza) : '',
        formTaxaPet: pd.taxaPet != null ? String(pd.taxaPet) : '',
        formTaxaExtra: pd.taxaHospedeExtra != null ? String(pd.taxaHospedeExtra) : '',
        formCancelCurta: pd.politicaCancelamentoCurta || 'limitada',
        formCancelLonga: pd.politicaCancelamentoLonga || 'restrita_longa',
        formNaoReembolsavel: Boolean(pd.opcaoNaoReembolsavel),
        formSmartAtivo: Boolean(pd.precoInteligenteAtivo),
        formSmartMin: pd.precoInteligenteMin != null ? String(pd.precoInteligenteMin) : '',
        formSmartMax: pd.precoInteligenteMax != null ? String(pd.precoInteligenteMax) : '',
        formUltimaHoraPct: String(pd.descontoUltimaHoraPct ?? 0),
        formUltimaHoraDias: String(pd.descontoUltimaHoraDias ?? 3),
        formAntecipadaPct: String(pd.descontoAntecipadaPct ?? 0),
        formAntecipadaDias: String(pd.descontoAntecipadaDias ?? 30),
        formNovoAnuncioPct: String(pd.descontoNovoAnuncioPct ?? 0),
        formNovoAnuncioLimite: String(pd.descontoNovoAnuncioLimite ?? 3),
        formAvaliacaoPct: String(pd.descontoAvaliacaoPct ?? 0),
        formAvaliacaoNota: String(pd.descontoAvaliacaoMinNota ?? 4.8),
        formAvaliacaoReviews: String(pd.descontoAvaliacaoMinReviews ?? 3),
        formPreparacao: String(pd.tempoPreparacaoNoites ?? 0),
        formPreparacaoHoras: String(pd.tempoPreparacaoHoras ?? 0),
        formJanelaMeses: String(pd.periodoDisponibilidadeMeses ?? 12),
        formCheckinDias: pd.checkinDiasPermitidos ?? [],
        formCheckoutDias: pd.checkoutDiasPermitidos ?? [],
        formIcalToken: pd.icalToken || '',
        formIcalImportUrl: pd.icalImportUrl || '',
        formIcalImportLastSyncAt: pd.icalImportLastSyncAt || '',
        formIcalImportLastStatus: pd.icalImportLastStatus || '',
        formIcalImportLastError: pd.icalImportLastError || '',
        formMinPorCheckin: (() => {
          const globalMin = Number(pd.minNoites ?? 1) || 1;
          const fallback = String(globalMin);
          const map = pd.minNoitesPorCheckin;
          if (!map || typeof map !== 'object') {
            return Array.from({ length: 7 }, () => fallback);
          }
          return Array.from({ length: 7 }, (_, i) => {
            const n = Number((map as Record<string, number>)[String(i)]);
            return String(Number.isFinite(n) && n >= 1 ? Math.floor(n) : globalMin);
          });
        })(),
        formPermitirPedidosMesmoDia: pd.permitirPedidosMesmoDia !== false,
      }));
      setConjuntosRegras(data.conjuntosRegras ?? []);
      setDias(
        data.dias.map((d) => ({
          data: d.data,
          estado: d.estado,
          disponivel: d.disponivel,
          readOnly: d.readOnly || !isMaster,
          precoOverride: d.precoOverride,
          precoEfetivo: d.precoEfetivo,
          precoBase: d.precoBase,
          observacao: d.observacao ?? null,
          contexto: d.contexto ?? null,
        })),
      );
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, de, ate, isMaster]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedDia = useMemo(
    () => dias.find((d) => d.data === selectedDate) || null,
    [dias, selectedDate],
  );

  const calendarSelected = multiSelectMode
    ? multiDates
    : selectedDate
      ? [selectedDate]
      : [];

  function handleSelectDia(data: string, estado: CalendarioDiaView['estado']) {
    if (estado === 'reservado') return;
    if (multiSelectMode) {
      setSelectedDate(null);
      setLastSelected(data);
      setMultiDates((prev) => {
        const next = prev.includes(data)
          ? prev.filter((d) => d !== data)
          : [...prev, data].sort();
        if (next.length > 0) setMultiPanel('overview');
        return next;
      });
      return;
    }
    setMultiDates([]);
    setLastSelected(data);
    setSelectedDate(data);
    setPanel('dia');
    const d = dias.find((x) => x.data === data);
    const note =
      d?.observacao && d.observacao !== 'bloqueado' && d.observacao !== 'reservado'
        ? d.observacao
        : '';
    patchForm({
      dayPrice:
        d?.precoEfetivo != null ? String(d.precoEfetivo) : d?.precoOverride || '',
      dayNote: note,
    });
  }

  const applyRange = useMemo(() => {
    if (multiDates.length === 0) return null;
    const sorted = [...multiDates].sort();
    return { de: sorted[0]!, ate: sorted[sorted.length - 1]! };
  }, [multiDates]);

  async function saveConjuntosRegras(next: ConjuntoRegrasView[]) {
    if (!id || !isMaster) return;
    setBusy(true);
    setErro(null);
    try {
      await fase1Api.atualizarAnfitriaoUnidade(id, {
        metadata: { conjuntosRegras: next },
      });
      setConjuntosRegras(next);
      setMsg('Conjuntos de regras salvos');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function applyConjuntoRegras(conjuntoId: string, de: string, ate: string) {
    if (!id || !isMaster) return;
    setBusy(true);
    setErro(null);
    try {
      const res = await fase1Api.anfitriaoAplicarConjuntoRegras(id, conjuntoId, { de, ate });
      const d = res.data;
      if (d.precoInteligenteAtivo) {
        setMsg(
          `Conjunto aplicado parcialmente: ${d.diasBloqueados} bloqueio(s); preços ignorados (Preço Inteligente ativo).`,
        );
      } else {
        setMsg(
          `Conjunto aplicado: ${d.precosAplicados} preço(s), ${d.diasBloqueados} bloqueio(s) em ${d.diasNoIntervalo} dia(s).`,
        );
      }
      await load();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const meuPrecoCompare = useMemo(() => {
    if (multiDates.length === 0) {
      const base = parseMoney(form.formBase);
      return base ?? dicaPreco;
    }
    const prices = multiDates
      .map((d) => dias.find((x) => x.data === d)?.precoEfetivo)
      .filter((n): n is number => n != null && Number.isFinite(n));
    if (prices.length === 0) return parseMoney(form.formBase) ?? dicaPreco;
    return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  }, [multiDates, dias, form.formBase, dicaPreco]);

  async function saveDefaults(override?: Partial<typeof form>) {
    if (!id || !isMaster) return;
    const f = { ...form, ...override };
    setBusy(true);
    setErro(null);
    try {
      const minPorCheckinPayload =
        f.formMinPorCheckin?.length === 7
          ? Object.fromEntries(
              f.formMinPorCheckin.map((v, i) => [
                String(i),
                Math.max(1, Math.floor(Number(v) || 1)),
              ]),
            )
          : null;
      await fase1Api.anfitriaoPricingDefaults(id, {
        precoDiaria: parseMoney(f.formBase),
        precoFimSemana: parseMoney(f.formWeekend),
        minNoites: Number(f.formMin),
        maxNoites: Number(f.formMax),
        minNoitesPorCheckin: minPorCheckinPayload,
        antecedenciaDias: Number(f.formAntecedencia),
        avisoPrevioMesmoDia:
          Number(f.formAntecedencia) === 0 ? f.formCutoff || '09:00' : null,
        descontoSemanalPct: parsePct(f.formSemanal),
        descontoMensalPct: parsePct(f.formMensal),
        taxaLimpeza: parseMoney(f.formTaxaLimpeza),
        taxaPet: parseMoney(f.formTaxaPet),
        taxaHospedeExtra: parseMoney(f.formTaxaExtra),
        politicaCancelamentoCurta: f.formCancelCurta,
        politicaCancelamentoLonga: f.formCancelLonga,
        opcaoNaoReembolsavel: f.formNaoReembolsavel,
        precoInteligenteAtivo: f.formSmartAtivo,
        precoInteligenteMin: parseMoney(f.formSmartMin),
        precoInteligenteMax: parseMoney(f.formSmartMax),
        descontoUltimaHoraPct: parsePct(f.formUltimaHoraPct),
        descontoUltimaHoraDias: Number(f.formUltimaHoraDias),
        descontoAntecipadaPct: parsePct(f.formAntecipadaPct),
        descontoAntecipadaDias: Number(f.formAntecipadaDias),
        descontoNovoAnuncioPct: parsePct(f.formNovoAnuncioPct),
        descontoNovoAnuncioLimite: Number(f.formNovoAnuncioLimite),
        descontoAvaliacaoPct: parsePct(f.formAvaliacaoPct),
        descontoAvaliacaoMinNota: Number(f.formAvaliacaoNota),
        descontoAvaliacaoMinReviews: Number(f.formAvaliacaoReviews),
        tempoPreparacaoNoites: Number(f.formPreparacao),
        tempoPreparacaoHoras: Number(f.formPreparacaoHoras),
        periodoDisponibilidadeMeses: Number(f.formJanelaMeses),
        checkinDiasPermitidos: f.formCheckinDias.length ? f.formCheckinDias : null,
        checkoutDiasPermitidos: f.formCheckoutDias.length ? f.formCheckoutDias : null,
        permitirPedidosMesmoDia: f.formPermitirPedidosMesmoDia,
      });
      setMsg('Configurações salvas');
      await load();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveDay() {
    if (!id || !selectedDate || !isMaster) return;
    setBusy(true);
    setErro(null);
    try {
      await fase1Api.anfitriaoRateCalendarDay(id, {
        data: selectedDate,
        preco: parseMoney(form.dayPrice),
      });
      setMsg('Dia atualizado');
      await load();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveDayNote() {
    if (!id || !selectedDate || !isMaster) return;
    setBusy(true);
    setErro(null);
    try {
      const note = form.dayNote.trim().slice(0, 100);
      await fase1Api.anfitriaoRateCalendarDay(id, {
        data: selectedDate,
        disponivel: false,
        observacao: note || 'bloqueado',
      });
      setMsg(note ? 'Observação salva' : 'Bloqueio atualizado');
      setPanel('dia');
      await load();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlockDay(bloquear: boolean) {
    if (!id || !selectedDate || !isMaster) return;
    setBusy(true);
    try {
      if (bloquear) {
        const existingNote =
          selectedDia?.observacao &&
          selectedDia.observacao !== 'bloqueado' &&
          selectedDia.observacao !== 'reservado'
            ? selectedDia.observacao
            : undefined;
        await fase1Api.anfitriaoRateCalendarDay(id, {
          data: selectedDate,
          disponivel: false,
          observacao: existingNote || 'bloqueado',
        });
        setMsg('Dia bloqueado');
      } else {
        await fase1Api.anfitriaoRateCalendarDay(id, {
          data: selectedDate,
          disponivel: true,
        });
        setMsg('Dia liberado');
        patchForm({ dayNote: '' });
      }
      await load();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function ensureIcalToken() {
    if (!id || !isMaster) return;
    if (form.formIcalToken) {
      setMsg('Token iCal já ativo — use Copiar URL ou Regenerar');
      return;
    }
    setBusy(true);
    try {
      const res = await fase1Api.anfitriaoIcalToken(id);
      patchForm({ formIcalToken: res.data.icalToken });
      setMsg('Token iCal gerado');
      await load();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function regenerateIcalToken() {
    if (!id || !isMaster) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Regenerar o token invalida a URL antiga em todos os sites conectados. Continuar?',
      )
    ) {
      return;
    }
    setBusy(true);
    setErro(null);
    try {
      const res = await fase1Api.anfitriaoIcalToken(id, { regenerate: true });
      patchForm({ formIcalToken: res.data.icalToken });
      setMsg('Token iCal regenerado — atualize a URL nos outros sites');
      await load();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveIcalImportUrl() {
    if (!id || !isMaster) return;
    setBusy(true);
    setErro(null);
    try {
      const url = form.formIcalImportUrl.trim() || null;
      const res = await fase1Api.anfitriaoIcalImportUrl(id, url);
      patchForm({
        formIcalImportUrl: res.data.icalImportUrl || '',
        formIcalImportLastStatus: res.data.icalImportLastStatus || '',
        formIcalImportLastError: '',
      });
      setMsg(url ? 'URL de calendário externo salva' : 'URL de importação removida');
      await load();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function syncIcalImport() {
    if (!id || !isMaster) return;
    setBusy(true);
    setErro(null);
    try {
      if (form.formIcalImportUrl.trim()) {
        await fase1Api.anfitriaoIcalImportUrl(id, form.formIcalImportUrl.trim());
      }
      const res = await fase1Api.anfitriaoIcalImportSync(id);
      setMsg(
        `iCal sincronizado: ${res.data.blocked} bloqueada(s), ${res.data.unblocked} liberada(s) (${res.data.busyNights} noites externas)`,
      );
      await load();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function clearMulti() {
    setMultiDates([]);
    setMultiPanel('overview');
    setPanel('menu');
  }

  async function saveMultiAvailability(action: 'disponibilizar' | 'bloquear') {
    if (!id || !isMaster || multiDates.length === 0) return;
    setBusy(true);
    setErro(null);
    try {
      if (action === 'bloquear') {
        await fase1Api.anfitriaoBulkBloquear(id, multiDates);
        setMsg(`${multiDates.length} noite(s) bloqueada(s)`);
      } else {
        await fase1Api.anfitriaoBulkDesbloquear(id, multiDates);
        setMsg(`${multiDates.length} noite(s) disponibilizada(s)`);
      }
      await load();
      setMultiPanel('overview');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveMultiPrices(preco: number) {
    if (!id || !isMaster || multiDates.length === 0) return;
    setBusy(true);
    setErro(null);
    try {
      await fase1Api.anfitriaoAjustarPreco(id, multiDates, preco);
      setMsg(`Preço atualizado em ${multiDates.length} noite(s)`);
      await load();
      setMultiPanel('overview');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveBaseFromFlow() {
    if (!id || !isMaster) return;
    setBusy(true);
    setErro(null);
    try {
      await fase1Api.anfitriaoPricingDefaults(id, {
        precoDiaria: parseMoney(form.formBase),
      });
      setMsg('Preço básico salvo');
      await load();
      setMultiPanel('overview');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveCustomFromFlow() {
    if (!id || !isMaster) return;
    setBusy(true);
    setErro(null);
    try {
      await fase1Api.anfitriaoPricingDefaults(id, {
        minNoites: Number(form.formMin),
        politicaCancelamentoCurta: form.formCancelCurta,
      });
      setMsg('Configurações personalizadas salvas');
      await load();
      setMultiPanel('overview');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Calendário de tarifas | Reservei Viagens</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <AnfitriaoHostNav />
        <div className="mx-auto max-w-[1400px] px-3 py-4 md:px-6 md:py-6">
          <div className="flex gap-3 md:gap-5">
            <AnfitriaoPropertySwitcher
              currentId={id}
              hrefFor={(unitId) => `/anfitriao/unidades/${unitId}/disponibilidade`}
              className="hidden sm:flex"
            />
            <div className="min-w-0 flex-1">
              <div className="mb-3 sm:hidden">
                <AnfitriaoPropertySwitcher
                  currentId={id}
                  hrefFor={(unitId) => `/anfitriao/unidades/${unitId}/disponibilidade`}
                  variant="chip"
                />
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Calendário de tarifas</h1>
                  <p className="text-sm text-slate-600">{titulo || `Unidade #${id}`}</p>
                </div>
                <Link
                  href={`/anfitriao/unidades/${id}`}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                  prefetch={false}
                >
                  Editar anúncio
                </Link>
              </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              De
              <input
                type="date"
                className="ml-2 rounded border px-2 py-1"
                value={de}
                onChange={(e) => setDe(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Até
              <input
                type="date"
                className="ml-2 rounded border px-2 py-1"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
              />
            </label>
            {isMaster && (
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  multiSelectMode
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 bg-white text-slate-800'
                }`}
                onClick={() => {
                  setMultiSelectMode((v) => {
                    const next = !v;
                    if (!next) {
                      setMultiDates([]);
                      setLastSelected(null);
                    } else {
                      setSelectedDate(null);
                      setPanel('menu');
                    }
                    return next;
                  });
                }}
              >
                {multiSelectMode ? 'Seleção múltipla ligada' : 'Seleção múltipla'}
              </button>
            )}
            {multiSelectMode && multiDates.length > 0 && (
              <button
                type="button"
                className="text-sm font-medium text-slate-600 underline"
                onClick={() => {
                  setMultiDates([]);
                  setLastSelected(null);
                }}
              >
                Limpar seleção ({multiDates.length})
              </button>
            )}
          </div>

          {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
          {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

          {multiSelectMode && multiDates.length > 0 && (
            <div className="mt-4">
              <SelectionContextAlert
                dates={multiDates}
                dias={dias}
                lastSelected={lastSelected}
              />
            </div>
          )}
          {!multiSelectMode && selectedDate && (
            <div className="mt-4">
              <SelectionContextAlert
                dates={[selectedDate]}
                dias={dias}
                lastSelected={selectedDate}
              />
            </div>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              {loading ? (
                <p className="text-sm text-slate-600">Carregando…</p>
              ) : (
                <AnfitriaoMonthCalendar
                  dias={dias}
                  selectedDates={calendarSelected}
                  onSelectDia={handleSelectDia}
                  readOnly={!isMaster}
                />
              )}
            </div>

            <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
              <RateCalendarDicas
                precoSugerido={dicaPreco}
                ganhoBuscasPct={dicaGanho}
                onCompetitiveTipClick={() => {
                  setSelectedDate(null);
                  setSelectNightsOpen(true);
                }}
              />
              {multiSelectMode && multiDates.length > 0 ? (
                <MultiNightDrawer
                  dates={multiDates}
                  dias={dias}
                  panel={multiPanel}
                  onPanel={setMultiPanel}
                  isMaster={isMaster}
                  busy={busy}
                  precoSugerido={dicaPreco}
                  ganhoBuscasPct={dicaGanho}
                  formMin={form.formMin}
                  formCancelCurta={form.formCancelCurta}
                  formBase={form.formBase}
                  onFormMin={(v) => patchForm({ formMin: v })}
                  onFormCancel={(v) => patchForm({ formCancelCurta: v })}
                  onFormBase={(v) => patchForm({ formBase: v })}
                  onClear={clearMulti}
                  onSaveAvailability={(a) => void saveMultiAvailability(a)}
                  onSavePrices={(p) => void saveMultiPrices(p)}
                  onSaveBasePrice={() => void saveBaseFromFlow()}
                  onSaveCustom={() => void saveCustomFromFlow()}
                  onOpenCompare={() => setCompareOpen(true)}
                  conjuntosRegras={conjuntosRegras}
                  smartPricingAtivo={form.formSmartAtivo}
                  applyRange={applyRange}
                  onApplyConjunto={(cid, de, ate) => void applyConjuntoRegras(cid, de, ate)}
                  onManageConjuntos={() => {
                    setMultiDates([]);
                    setLastSelected(null);
                    setPanel('conjuntos-regras');
                  }}
                />
              ) : (
                <RateCalendarDrawer
                  panel={panel}
                  onPanel={setPanel}
                  isMaster={isMaster}
                  busy={busy}
                  teto={teto}
                  acomodacaoId={id}
                  selectedDate={selectedDate}
                  selectedDia={selectedDia}
                  form={form}
                  onForm={patchForm}
                  onSaveDefaults={(override) => void saveDefaults(override)}
                  onSaveDay={() => void saveDay()}
                  onSaveDayNote={() => void saveDayNote()}
                  onToggleBlock={(b) => void toggleBlockDay(b)}
                  onCloseDay={() => {
                    setSelectedDate(null);
                    setPanel('menu');
                  }}
                  onEnsureIcalToken={() => void ensureIcalToken()}
                  onRegenerateIcalToken={() => void regenerateIcalToken()}
                  onSaveIcalImportUrl={() => void saveIcalImportUrl()}
                  onSyncIcalImport={() => void syncIcalImport()}
                  precoSugerido={dicaPreco}
                  ganhoBuscasPct={dicaGanho}
                  conjuntosRegras={conjuntosRegras}
                  applyRange={applyRange}
                  onSaveConjuntosRegras={saveConjuntosRegras}
                  onApplyConjuntoRegras={applyConjuntoRegras}
                />
              )}
            </aside>
          </div>
            </div>
          </div>
        </div>
      </div>

      <SelecioneNoitesModal
        open={selectNightsOpen}
        dias={dias}
        onClose={() => setSelectNightsOpen(false)}
        onConfirm={(dates) => {
          setSelectNightsOpen(false);
          if (dates.length === 0) return;
          setMultiDates(dates);
          setMultiPanel('overview');
          setSelectedDate(null);
        }}
      />

      <CompareAnunciosModal
        open={compareOpen}
        noites={multiDates.length || 1}
        precoMeu={meuPrecoCompare}
        precoSugerido={dicaPreco}
        onClose={() => setCompareOpen(false)}
      />
    </AnfitriaoRoleGuard>
  );
}
