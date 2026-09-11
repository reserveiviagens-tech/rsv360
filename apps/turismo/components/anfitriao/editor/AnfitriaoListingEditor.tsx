'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { resolveUnitThumbUrl, compactThumbUrl, unitThumbPlaceholder } from '../unit-thumb';
import {
  AcessibilidadeEditor,
  normalizeAcessibilidadeItems,
  summarizeAcessibilidadeClient,
  type AcessibilidadeItem,
} from './AcessibilidadeEditor';
import { FotosTourEditor } from './FotosTourEditor';
import { TituloEditor } from './TituloEditor';
import { PrecosEditor, summarizePrecosClient } from './PrecosEditor';
import { HospedesEditor, clampCapacidadeClient, summarizeCapacidadeClient } from './HospedesEditor';
import { DescricaoEditor, summarizeDescricaoClient } from './DescricaoEditor';
import type { DescricaoSubKey } from './descricao-limits';
import { DESCRICAO_ANUNCIO_MAX, DESCRICAO_CAMPO_MAX } from './descricao-limits';
import { ComodidadesEditor, normalizeAmenitySetClient, summarizeComodidadesClient } from './ComodidadesEditor';
import { DescontosEditor, summarizeDescontosClient } from './DescontosEditor';
import {
  DisponibilidadeEditor,
  normalizeMinPorCheckinClient,
  summarizeDisponibilidadeClient,
  type MinNoitesPorCheckinClient,
} from './DisponibilidadeEditor';
import { TipoPropriedadeEditor, TIPO_PROPRIEDADE_ACOMODACOES, TIPO_PROPRIEDADE_TIPOS } from './TipoPropriedadeEditor';
import { TiposCamaEditor, normalizeTiposCamaClient, summarizeTiposCamaClient } from './TiposCamaEditor';
import { SegurancaEditor, summarizeSegurancaClient, type SegurancaMeta } from './SegurancaEditor';
import { VerificacaoLocalEditor, type VerificacaoLocalMeta } from './VerificacaoLocalEditor';
import { LocalizacaoEditor, summarizeLocalizacaoClient } from './LocalizacaoEditor';
import { SobreAnfitriaoEditor, summarizeSobreAnfitriaoClient } from './SobreAnfitriaoEditor';
import { CoanfitrioesEditor, summarizeCoanfitrioesClient } from './CoanfitrioesEditor';
import { ConfigReservaEditor, summarizeConfigReservaClient } from './ConfigReservaEditor';
import { CancelamentoEditor, summarizeCancelamentoClient } from './CancelamentoEditor';
import { LinkPersonalizadoEditor, summarizeLinkPersonalizadoClient } from './LinkPersonalizadoEditor';
import { RegrasCasaEditor, summarizeRegrasCasaClient } from './RegrasCasaEditor';
import {
  GUIA_CARDS,
  PREF_CARDS,
  SEU_ESPACO_CARDS,
  isEditorSection,
  readMeta,
  tabForSection,
  type EditorMeta,
  type EditorSection,
  type EditorTab,
  type GuiaSection,
  type ListingEditorUnidade,
  type PreferenciasSection,
  type SeuEspacoSection,
} from './editor-types';

type PricingDefaults = {
  precoDiaria?: number | null;
  precoFimSemana?: number | null;
  minNoites?: number;
  maxNoites?: number;
  descontoSemanalPct?: number;
  descontoMensalPct?: number;
  politicaCancelamentoCurta?: string;
  politicaCancelamentoLonga?: string;
  opcaoNaoReembolsavel?: boolean;
  precoInteligenteAtivo?: boolean;
  antecedenciaDias?: number;
  avisoPrevioMesmoDia?: string | null;
  minNoitesPorCheckin?: MinNoitesPorCheckinClient | null;
};

type Props = {
  unitId: number;
  unidade: ListingEditorUnidade;
  pricing?: PricingDefaults | null;
  saving?: boolean;
  message?: string | null;
  /** Deep-link from Desempenho (?secao=). */
  initialSection?: string | null;
  onSaveUnit: (body: Record<string, unknown>) => Promise<void>;
  onSavePricing: (body: Record<string, unknown>) => Promise<void>;
  onEnviarAprovacao?: () => Promise<void>;
};

function asAmenitySet(raw: unknown): Set<string> {
  return normalizeAmenitySetClient(raw);
}

function FooterSave({
  dirty,
  saving,
  onSave,
  onCancel,
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="sticky bottom-0 mt-8 flex items-center justify-end gap-3 border-t border-slate-200 bg-white py-4">
      {onCancel && (
        <button type="button" onClick={onCancel} className="text-sm font-medium text-slate-700">
          Cancelar
        </button>
      )}
      <button
        type="button"
        disabled={!dirty || saving}
        onClick={onSave}
        className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white ${
          dirty && !saving ? 'bg-slate-900' : 'cursor-not-allowed bg-slate-300'
        }`}
      >
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  );
}

export function AnfitriaoListingEditor({
  unitId,
  unidade,
  pricing,
  saving,
  message,
  initialSection,
  onSaveUnit,
  onSavePricing,
  onEnviarAprovacao,
}: Props) {
  const meta0 = useMemo(() => readMeta(unidade), [unidade]);
  const bootSection: EditorSection =
    initialSection && isEditorSection(initialSection) ? initialSection : 'fotos';
  const [tab, setTab] = useState<EditorTab>(() => tabForSection(bootSection));
  const [section, setSection] = useState<EditorSection>(bootSection);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [titulo, setTitulo] = useState(unidade.titulo ?? '');
  const [nomeInterno, setNomeInterno] = useState(meta0.nomeInterno ?? '');
  const [preco, setPreco] = useState(
    String(pricing?.precoDiaria ?? unidade.precoDiaria ?? ''),
  );
  const [precoFds, setPrecoFds] = useState(
    pricing?.precoFimSemana != null
      ? String(pricing.precoFimSemana)
      : unidade.precoFimSemana != null
        ? String(unidade.precoFimSemana)
        : '',
  );
  const [precoInteligente, setPrecoInteligente] = useState(
    Boolean(pricing?.precoInteligenteAtivo ?? unidade.precoInteligenteAtivo),
  );
  const [showFimSemana, setShowFimSemana] = useState(
    () =>
      (pricing?.precoFimSemana != null && Number(pricing.precoFimSemana) > 0) ||
      (unidade.precoFimSemana != null && Number(unidade.precoFimSemana) > 0),
  );
  const [capacidade, setCapacidade] = useState(
    clampCapacidadeClient(Number(unidade.capacidadeMax ?? 2)),
  );
  const [descAnuncio, setDescAnuncio] = useState(meta0.descricaoDetalhada?.anuncio ?? '');
  const [descProp, setDescProp] = useState(meta0.descricaoDetalhada?.suaPropriedade ?? '');
  const [descAcesso, setDescAcesso] = useState(meta0.descricaoDetalhada?.acessoHospede ?? '');
  const [descInteracao, setDescInteracao] = useState(
    meta0.descricaoDetalhada?.interacaoHospedes ?? '',
  );
  const [descOutras, setDescOutras] = useState(meta0.descricaoDetalhada?.outrasInformacoes ?? '');
  const [descSub, setDescSub] = useState<DescricaoSubKey | null>(null);
  const [amenities, setAmenities] = useState(() => asAmenitySet(unidade.amenidades));
  const [camas, setCamas] = useState<Record<string, number>>(() =>
    normalizeTiposCamaClient(meta0.tiposCama),
  );
  const [minNoites, setMinNoites] = useState(Number(pricing?.minNoites ?? unidade.minNoites ?? 1));
  const [maxNoites, setMaxNoites] = useState(Number(pricing?.maxNoites ?? unidade.maxNoites ?? 30));
  const [antecedenciaDias, setAntecedenciaDias] = useState(
    Number(pricing?.antecedenciaDias ?? unidade.antecedenciaDias ?? 0),
  );
  const [avisoPrevioMesmoDia, setAvisoPrevioMesmoDia] = useState(
    String(pricing?.avisoPrevioMesmoDia ?? unidade.avisoPrevioMesmoDia ?? '09:00'),
  );
  const [minNoitesPorCheckin, setMinNoitesPorCheckin] = useState<MinNoitesPorCheckinClient | null>(
    () =>
      normalizeMinPorCheckinClient(
        pricing?.minNoitesPorCheckin ?? unidade.minNoitesPorCheckin,
        Number(pricing?.minNoites ?? unidade.minNoites ?? 1),
      ),
  );
  const [descSemanal, setDescSemanal] = useState(
    Number(pricing?.descontoSemanalPct ?? unidade.descontoSemanalPct ?? 0),
  );
  const [descMensal, setDescMensal] = useState(
    Number(pricing?.descontoMensalPct ?? unidade.descontoMensalPct ?? 0),
  );
  const [modoReserva, setModoReserva] = useState(meta0.modoReserva ?? 'aprovar');
  const [exigirHistorico, setExigirHistorico] = useState(Boolean(meta0.exigirBomHistorico));
  const [msgPre, setMsgPre] = useState(meta0.mensagemPreReserva ?? '');
  const [regras, setRegras] = useState(meta0.regrasCasa ?? {});
  const [guia, setGuia] = useState(meta0.guiaChegada ?? {});
  const [slug, setSlug] = useState(meta0.slugPersonalizado ?? '');
  const [statusAnuncio, setStatusAnuncio] = useState(meta0.statusAnuncio ?? 'anunciado');
  const [exigirFoto, setExigirFoto] = useState(Boolean(meta0.exigirFotoPerfil));
  const [solidaria, setSolidaria] = useState(Boolean(meta0.hospedagemSolidaria));
  const [polCurta, setPolCurta] = useState(
    pricing?.politicaCancelamentoCurta ?? unidade.politicaCancelamentoCurta ?? 'limitada',
  );
  const [polLonga, setPolLonga] = useState(
    pricing?.politicaCancelamentoLonga ?? unidade.politicaCancelamentoLonga ?? 'restrita_longa',
  );
  const [naoReemb, setNaoReemb] = useState(
    Boolean(pricing?.opcaoNaoReembolsavel ?? unidade.opcaoNaoReembolsavel),
  );
  const [tipoProp, setTipoProp] = useState(meta0.tipoPropriedade ?? {});
  const [localizacao, setLocalizacao] = useState(meta0.localizacao ?? {});
  const [sobreAnfitriao, setSobreAnfitriao] = useState(meta0.sobreAnfitriao ?? {});
  const [coanfitrioes, setCoanfitrioes] = useState(meta0.coanfitrioes ?? []);
  const [acessibilidade, setAcessibilidade] = useState<AcessibilidadeItem[]>(() =>
    normalizeAcessibilidadeItems(meta0.acessibilidade),
  );
  const [seguranca, setSeguranca] = useState<SegurancaMeta>(() => meta0.seguranca ?? {});
  const [verificacaoLocal, setVerificacaoLocal] = useState<VerificacaoLocalMeta>(
    () => meta0.verificacaoLocal ?? {},
  );
  const [midiaJson, setMidiaJson] = useState(() => {
    try {
      return JSON.stringify(unidade.midia ?? { capa: null, trilhoThumb: null, fotos: [] }, null, 2);
    } catch {
      return '{}';
    }
  });

  const markDirty = useCallback(() => setDirty(true), []);

  const cards = tab === 'seu-espaco' ? SEU_ESPACO_CARDS : tab === 'guia-chegada' ? GUIA_CARDS : PREF_CARDS;

  function selectTab(next: EditorTab) {
    setTab(next);
    if (next === 'seu-espaco') setSection('fotos');
    else if (next === 'guia-chegada') setSection('checkin-checkout');
    else setSection('status');
  }

  function cardSummary(id: EditorSection): string {
    switch (id) {
      case 'fotos': {
        try {
          const m = JSON.parse(midiaJson || '{}') as {
            fotos?: unknown[];
            itens?: Array<{ categoria?: string | null }>;
            capa?: string | null;
          };
          const n = Array.isArray(m.itens)
            ? m.itens.length
            : Array.isArray(m.fotos)
              ? m.fotos.length
              : 0;
          const cats = Array.isArray(m.itens)
            ? new Set(m.itens.map((i) => i.categoria).filter(Boolean)).size
            : 0;
          if (n > 0) {
            return `${n} foto(s)${m.capa ? ' · capa' : ''}${cats > 0 ? ` · ${cats} categ.` : ''}`;
          }
        } catch {
          /* ignore */
        }
        const thumb = resolveUnitThumbUrl(unidade.midia);
        return thumb ? 'Capa do trilho definida' : 'Adicionar fotos';
      }
      case 'seguranca':
        return summarizeSegurancaClient(seguranca);
      case 'verificacao':
        return verificacaoLocal.status === 'aprovado'
          ? 'Verificada'
          : verificacaoLocal.status === 'enviado'
            ? 'Enviada para revisão'
            : 'Adicionar informações';
      case 'titulo': {
        if (!titulo.trim()) return 'Adicionar título';
        return nomeInterno.trim()
          ? `${titulo.trim()} · ${nomeInterno.trim()}`
          : titulo.trim();
      }
      case 'tipo': {
        const tipoLabel = TIPO_PROPRIEDADE_TIPOS.find((t) => t.id === tipoProp.tipo)?.label;
        const acoLabel = TIPO_PROPRIEDADE_ACOMODACOES.find(
          (t) => t.id === (tipoProp.acomodacao || tipoProp.representacao),
        )?.label;
        const parts = [
          tipoLabel,
          acoLabel,
          tipoProp.tamanhoM2 != null ? `${tipoProp.tamanhoM2} m²` : null,
        ].filter(Boolean);
        return parts.length ? parts.join(' · ') : 'Adicionar informações';
      }
      case 'camas':
        return summarizeTiposCamaClient(camas) || 'Adicionar informações';
      case 'precos':
        return summarizePrecosClient(preco, showFimSemana ? precoFds : '', precoInteligente) ||
          'Definir preço';
      case 'descontos':
        return (
          summarizeDescontosClient(descSemanal, descMensal) || 'Adicionar descontos'
        );
      case 'disponibilidade':
        return summarizeDisponibilidadeClient(minNoites, maxNoites, antecedenciaDias);
      case 'hospedes':
        return summarizeCapacidadeClient(capacidade) || 'Definir capacidade';
      case 'descricao':
        return summarizeDescricaoClient(descAnuncio) || 'Adicionar informações';
      case 'comodidades':
        return summarizeComodidadesClient(amenities) || 'Adicionar comodidades';
      case 'config-reserva':
        return summarizeConfigReservaClient(modoReserva);
      case 'regras':
      case 'regras-guia':
        return summarizeRegrasCasaClient(regras);
      case 'cancelamento':
        return summarizeCancelamentoClient({
          politicaCancelamentoCurta: polCurta,
          politicaCancelamentoLonga: polLonga,
          opcaoNaoReembolsavel: naoReemb,
        });
      case 'link-personalizado':
        return summarizeLinkPersonalizadoClient(slug);
      case 'wifi':
        return guia.wifiRede ? `Rede: ${guia.wifiRede}` : 'Adicionar informações';
      case 'metodo-checkin':
        return guia.metodoCheckIn || 'Adicionar informações';
      case 'interacao':
        return guia.preferenciaInteracao || 'Adicionar informações';
      case 'status':
        return statusAnuncio === 'anunciado' ? 'Anunciado' : 'Não anunciado';
      case 'acessibilidade':
        return summarizeAcessibilidadeClient(acessibilidade);
      case 'localizacao':
        return summarizeLocalizacaoClient(localizacao) ?? 'Adicionar informações';
      case 'sobre-anfitriao':
        return summarizeSobreAnfitriaoClient(sobreAnfitriao) ?? 'Adicionar informações';
      case 'coanfitrioes':
        return summarizeCoanfitrioesClient(coanfitrioes) ?? 'Adicionar';
      default:
        return 'Adicionar informações';
    }
  }

  async function persist() {
    let midia: unknown = unidade.midia;
    try {
      midia = JSON.parse(midiaJson || '{}');
    } catch {
      throw new Error('Mídia: JSON inválido');
    }

    const metadata: EditorMeta = {
      ...meta0,
      nomeInterno: nomeInterno || undefined,
      descricaoDetalhada: {
        anuncio: descAnuncio.slice(0, DESCRICAO_ANUNCIO_MAX),
        suaPropriedade: descProp.slice(0, DESCRICAO_CAMPO_MAX),
        acessoHospede: descAcesso.slice(0, DESCRICAO_CAMPO_MAX),
        interacaoHospedes: descInteracao.slice(0, DESCRICAO_CAMPO_MAX),
        outrasInformacoes: descOutras.slice(0, DESCRICAO_CAMPO_MAX),
      },
      tiposCama: camas,
      tipoPropriedade: tipoProp,
      modoReserva,
      exigirBomHistorico: exigirHistorico,
      mensagemPreReserva: msgPre.slice(0, 400),
      regrasCasa: regras,
      guiaChegada: guia,
      slugPersonalizado: slug.slice(0, 116),
      statusAnuncio,
      exigirFotoPerfil: exigirFoto,
      hospedagemSolidaria: solidaria,
      localizacao,
      sobreAnfitriao,
      coanfitrioes: coanfitrioes.length > 0 ? coanfitrioes : undefined,
      acessibilidade,
      seguranca,
      verificacaoLocal,
      idiomas: meta0.idiomas ?? ['Português'],
    };

    await onSaveUnit({
      titulo,
      precoDiaria: preco,
      capacidadeMax: clampCapacidadeClient(capacidade),
      amenidades: Array.from(amenities),
      midia,
      metadata,
      statusPublicacao: 'completo',
    });

    await onSavePricing({
      precoDiaria: preco === '' ? null : Number(String(preco).replace(',', '.')),
      precoFimSemana:
        !showFimSemana || precoFds === '' ? null : Number(String(precoFds).replace(',', '.')),
      precoInteligenteAtivo: precoInteligente,
      minNoites,
      maxNoites,
      antecedenciaDias,
      avisoPrevioMesmoDia: antecedenciaDias === 0 ? avisoPrevioMesmoDia || '09:00' : null,
      minNoitesPorCheckin,
      descontoSemanalPct: descSemanal,
      descontoMensalPct: descMensal,
      politicaCancelamentoCurta: polCurta,
      politicaCancelamentoLonga: polLonga,
      opcaoNaoReembolsavel: naoReemb,
    });

    setDirty(false);
  }

  const thumb = resolveUnitThumbUrl(unidade.midia);
  const previewSrc = thumb ? compactThumbUrl(thumb, 640) : unitThumbPlaceholder();

  return (
    <div className="relative flex min-h-[70vh] flex-col lg:flex-row">
      {/* Left rail */}
      <aside className="flex w-full flex-col border-b border-slate-200 bg-slate-50 lg:w-[360px] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <Link
            href="/anfitriao/unidades"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Voltar para anúncios"
            prefetch={false}
          >
            ←
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Editor de anúncios</h1>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3">
          {(
            [
              ['seu-espaco', 'Seu espaço'],
              ['guia-chegada', 'Guia de chegada'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                tab === id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => selectTab('preferencias')}
            className={`ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full ${
              tab === 'preferencias' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'
            }`}
            aria-label="Edite suas preferências"
            title="Preferências"
          >
            ⚙
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-20">
          {cards.map((c) => {
            const active = section === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSection(c.id as EditorSection)}
                className={`w-full rounded-2xl border bg-white p-3 text-left transition ${
                  active ? 'border-slate-900 shadow-sm' : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{cardSummary(c.id)}</p>
              </button>
            );
          })}
        </div>

        <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center lg:w-[360px]">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            👁 Visualizar
          </button>
        </div>
      </aside>

      {/* Right panel */}
      <main className="min-w-0 flex-1 bg-white px-4 py-6 md:px-8">
        {message && (
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {message}
          </p>
        )}

        {tab === 'seu-espaco' && (
          <SeuEspacoPanel
            section={section as SeuEspacoSection}
            unitId={unitId}
            titulo={titulo}
            setTitulo={(v) => {
              setTitulo(v);
              markDirty();
            }}
            nomeInterno={nomeInterno}
            setNomeInterno={(v) => {
              setNomeInterno(v);
              markDirty();
            }}
            preco={preco}
            setPreco={(v) => {
              setPreco(v);
              markDirty();
            }}
            precoFds={precoFds}
            setPrecoFds={(v) => {
              setPrecoFds(v);
              markDirty();
            }}
            precoInteligente={precoInteligente}
            setPrecoInteligente={(v) => {
              setPrecoInteligente(v);
              markDirty();
            }}
            showFimSemana={showFimSemana}
            setShowFimSemana={(v) => {
              setShowFimSemana(v);
              markDirty();
            }}
            capacidade={capacidade}
            setCapacidade={(v) => {
              setCapacidade(v);
              markDirty();
            }}
            minNoites={minNoites}
            setMinNoites={(v) => {
              setMinNoites(v);
              markDirty();
            }}
            maxNoites={maxNoites}
            setMaxNoites={(v) => {
              setMaxNoites(v);
              markDirty();
            }}
            antecedenciaDias={antecedenciaDias}
            setAntecedenciaDias={(v) => {
              setAntecedenciaDias(v);
              markDirty();
            }}
            avisoPrevioMesmoDia={avisoPrevioMesmoDia}
            setAvisoPrevioMesmoDia={(v) => {
              setAvisoPrevioMesmoDia(v);
              markDirty();
            }}
            minNoitesPorCheckin={minNoitesPorCheckin}
            setMinNoitesPorCheckin={(v) => {
              setMinNoitesPorCheckin(v);
              markDirty();
            }}
            descSemanal={descSemanal}
            setDescSemanal={(v) => {
              setDescSemanal(v);
              markDirty();
            }}
            descMensal={descMensal}
            setDescMensal={(v) => {
              setDescMensal(v);
              markDirty();
            }}
            descAnuncio={descAnuncio}
            descProp={descProp}
            descAcesso={descAcesso}
            descInteracao={descInteracao}
            descOutras={descOutras}
            descSub={descSub}
            setDescSub={setDescSub}
            setDescField={(key, v) => {
              markDirty();
              if (key === 'anuncio') setDescAnuncio(v);
              if (key === 'propriedade') setDescProp(v);
              if (key === 'acesso') setDescAcesso(v);
              if (key === 'interacao') setDescInteracao(v);
              if (key === 'outras') setDescOutras(v);
            }}
            amenities={amenities}
            toggleAmenity={(id) => {
              markDirty();
              setAmenities((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            camas={camas}
            setCamas={(next) => {
              markDirty();
              setCamas(next);
            }}
            modoReserva={modoReserva}
            setModoReserva={(v) => {
              setModoReserva(v);
              markDirty();
            }}
            exigirHistorico={exigirHistorico}
            setExigirHistorico={(v) => {
              setExigirHistorico(v);
              markDirty();
            }}
            msgPre={msgPre}
            setMsgPre={(v) => {
              setMsgPre(v.slice(0, 400));
              markDirty();
            }}
            regras={regras}
            setRegras={(v) => {
              setRegras(v);
              markDirty();
            }}
            polCurta={polCurta}
            setPolCurta={(v) => {
              setPolCurta(v);
              markDirty();
            }}
            polLonga={polLonga}
            setPolLonga={(v) => {
              setPolLonga(v);
              markDirty();
            }}
            naoReemb={naoReemb}
            setNaoReemb={(v) => {
              setNaoReemb(v);
              markDirty();
            }}
            slug={slug}
            setSlug={(v) => {
              setSlug(v);
              markDirty();
            }}
            tipoProp={tipoProp}
            setTipoProp={(v) => {
              setTipoProp(v);
              markDirty();
            }}
            localizacao={localizacao}
            setLocalizacao={(v) => {
              setLocalizacao(v);
              markDirty();
            }}
            sobreAnfitriao={sobreAnfitriao}
            setSobreAnfitriao={(v) => {
              setSobreAnfitriao(v);
              markDirty();
            }}
            coanfitrioes={coanfitrioes}
            setCoanfitrioes={(v) => {
              setCoanfitrioes(v);
              markDirty();
            }}
            acessibilidade={acessibilidade}
            setAcessibilidade={(v) => {
              setAcessibilidade(v);
              markDirty();
            }}
            seguranca={seguranca}
            setSeguranca={(v) => {
              setSeguranca(v);
              markDirty();
            }}
            verificacaoLocal={verificacaoLocal}
            setVerificacaoLocal={(v) => {
              setVerificacaoLocal(v);
              markDirty();
            }}
            midia={unidade.midia}
            midiaJson={midiaJson}
            setMidiaJson={(v) => {
              setMidiaJson(v);
              markDirty();
            }}
            onMidiaChange={(next) => {
              if (next != null) {
                setMidiaJson(JSON.stringify(next, null, 2));
                markDirty();
              }
            }}
          />
        )}

        {tab === 'guia-chegada' && (
          <GuiaPanel
            section={section as GuiaSection}
            regras={regras}
            setRegras={(v) => {
              setRegras(v);
              markDirty();
            }}
            guia={guia}
            setGuia={(v) => {
              setGuia(v);
              markDirty();
            }}
            capacidade={capacidade}
            setCapacidade={(v) => {
              setCapacidade(v);
              markDirty();
            }}
          />
        )}

        {tab === 'preferencias' && (
          <PreferenciasPanel
            section={section as PreferenciasSection}
            statusAnuncio={statusAnuncio}
            setStatusAnuncio={(v) => {
              setStatusAnuncio(v);
              markDirty();
            }}
            exigirFoto={exigirFoto}
            setExigirFoto={(v) => {
              setExigirFoto(v);
              markDirty();
            }}
            solidaria={solidaria}
            setSolidaria={(v) => {
              setSolidaria(v);
              markDirty();
            }}
            onEnviarAprovacao={onEnviarAprovacao}
          />
        )}

        <FooterSave
          dirty={dirty}
          saving={saving}
          onSave={() => {
            void persist().catch(() => undefined);
          }}
        />

        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/anfitriao/unidades/${unitId}/disponibilidade`}
            className="text-slate-700 underline"
            prefetch={false}
          >
            Calendário de tarifas →
          </Link>
        </div>
      </main>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold">Sua estadia</p>
              <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Fechar">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt="" className="h-48 w-full rounded-2xl object-cover" />
              <h2 className="mt-4 text-xl font-bold">{titulo || 'Anúncio'}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-sm">
                <div>
                  <p className="text-slate-500">Check-in</p>
                  <p className="font-semibold">{regras.checkInDe ?? '14:00'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Checkout</p>
                  <p className="font-semibold">{regras.checkOutAte ?? '11:00'}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <strong>Como chegar</strong>
                  <p className="text-slate-500">{localizacao.endereco || guia.comoChegar || '—'}</p>
                </li>
                <li>
                  <strong>Como entrar</strong>
                  <p className="text-slate-500">{guia.metodoCheckIn || 'Informações de check-in'}</p>
                </li>
                <li>
                  <strong>Guia da Casa</strong>
                  <p className="text-slate-500">Instruções e Regras da Casa</p>
                </li>
                <li>
                  <strong>Informações de checkout</strong>
                  <p className="text-slate-500">Como fazer o checkout</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

function SeuEspacoPanel(props: {
  section: SeuEspacoSection;
  unitId: number;
  titulo: string;
  setTitulo: (v: string) => void;
  nomeInterno: string;
  setNomeInterno: (v: string) => void;
  preco: string;
  setPreco: (v: string) => void;
  precoFds: string;
  setPrecoFds: (v: string) => void;
  precoInteligente: boolean;
  setPrecoInteligente: (v: boolean) => void;
  showFimSemana: boolean;
  setShowFimSemana: (v: boolean) => void;
  capacidade: number;
  setCapacidade: (v: number) => void;
  minNoites: number;
  setMinNoites: (v: number) => void;
  maxNoites: number;
  setMaxNoites: (v: number) => void;
  antecedenciaDias: number;
  setAntecedenciaDias: (v: number) => void;
  avisoPrevioMesmoDia: string;
  setAvisoPrevioMesmoDia: (v: string) => void;
  minNoitesPorCheckin: MinNoitesPorCheckinClient | null;
  setMinNoitesPorCheckin: (v: MinNoitesPorCheckinClient | null) => void;
  descSemanal: number;
  setDescSemanal: (v: number) => void;
  descMensal: number;
  setDescMensal: (v: number) => void;
  descAnuncio: string;
  descProp: string;
  descAcesso: string;
  descInteracao: string;
  descOutras: string;
  descSub: DescricaoSubKey | null;
  setDescSub: (v: DescricaoSubKey | null) => void;
  setDescField: (key: DescricaoSubKey, v: string) => void;
  amenities: Set<string>;
  toggleAmenity: (id: string) => void;
  camas: Record<string, number>;
  setCamas: (v: Record<string, number>) => void;
  modoReserva: 'instantanea' | 'aprovar';
  setModoReserva: (v: 'instantanea' | 'aprovar') => void;
  exigirHistorico: boolean;
  setExigirHistorico: (v: boolean) => void;
  msgPre: string;
  setMsgPre: (v: string) => void;
  regras: NonNullable<EditorMeta['regrasCasa']>;
  setRegras: (v: NonNullable<EditorMeta['regrasCasa']>) => void;
  polCurta: string;
  setPolCurta: (v: string) => void;
  polLonga: string;
  setPolLonga: (v: string) => void;
  naoReemb: boolean;
  setNaoReemb: (v: boolean) => void;
  slug: string;
  setSlug: (v: string) => void;
  tipoProp: NonNullable<EditorMeta['tipoPropriedade']>;
  setTipoProp: (v: NonNullable<EditorMeta['tipoPropriedade']>) => void;
  localizacao: NonNullable<EditorMeta['localizacao']>;
  setLocalizacao: (v: NonNullable<EditorMeta['localizacao']>) => void;
  sobreAnfitriao: NonNullable<EditorMeta['sobreAnfitriao']>;
  setSobreAnfitriao: (v: NonNullable<EditorMeta['sobreAnfitriao']>) => void;
  coanfitrioes: NonNullable<EditorMeta['coanfitrioes']>;
  setCoanfitrioes: (v: NonNullable<EditorMeta['coanfitrioes']>) => void;
  acessibilidade: AcessibilidadeItem[];
  setAcessibilidade: (v: AcessibilidadeItem[]) => void;
  seguranca: SegurancaMeta;
  setSeguranca: (v: SegurancaMeta) => void;
  verificacaoLocal: VerificacaoLocalMeta;
  setVerificacaoLocal: (v: VerificacaoLocalMeta) => void;
  midia: unknown;
  midiaJson: string;
  setMidiaJson: (v: string) => void;
  onMidiaChange: (next: unknown) => void;
}) {
  const s = props.section;

  if (s === 'fotos') {
    let midiaParsed: unknown = props.midia;
    try {
      midiaParsed = JSON.parse(props.midiaJson || '{}');
    } catch {
      midiaParsed = props.midia;
    }
    return (
      <FotosTourEditor
        unitId={props.unitId}
        titulo={props.titulo}
        midia={midiaParsed}
        onMidiaChange={(next) => {
          props.onMidiaChange(next);
        }}
      />
    );
  }

  if (s === 'titulo') {
    return (
      <TituloEditor
        titulo={props.titulo}
        setTitulo={props.setTitulo}
        nomeInterno={props.nomeInterno}
        setNomeInterno={props.setNomeInterno}
      />
    );
  }

  if (s === 'precos') {
    return (
      <PrecosEditor
        unitId={props.unitId}
        preco={props.preco}
        setPreco={props.setPreco}
        precoFds={props.precoFds}
        setPrecoFds={props.setPrecoFds}
        precoInteligente={props.precoInteligente}
        setPrecoInteligente={props.setPrecoInteligente}
        showFimSemana={props.showFimSemana}
        setShowFimSemana={props.setShowFimSemana}
      />
    );
  }

  if (s === 'descontos') {
    return (
      <DescontosEditor
        unitId={props.unitId}
        precoDiaria={props.preco}
        descSemanal={props.descSemanal}
        setDescSemanal={props.setDescSemanal}
        descMensal={props.descMensal}
        setDescMensal={props.setDescMensal}
      />
    );
  }

  if (s === 'disponibilidade') {
    return (
      <DisponibilidadeEditor
        unitId={props.unitId}
        minNoites={props.minNoites}
        setMinNoites={props.setMinNoites}
        maxNoites={props.maxNoites}
        setMaxNoites={props.setMaxNoites}
        antecedenciaDias={props.antecedenciaDias}
        setAntecedenciaDias={props.setAntecedenciaDias}
        avisoPrevioMesmoDia={props.avisoPrevioMesmoDia}
        setAvisoPrevioMesmoDia={props.setAvisoPrevioMesmoDia}
        minNoitesPorCheckin={props.minNoitesPorCheckin}
        setMinNoitesPorCheckin={props.setMinNoitesPorCheckin}
      />
    );
  }

  if (s === 'hospedes') {
    return <HospedesEditor capacidade={props.capacidade} setCapacidade={props.setCapacidade} />;
  }

  if (s === 'descricao') {
    return (
      <DescricaoEditor
        descAnuncio={props.descAnuncio}
        descProp={props.descProp}
        descAcesso={props.descAcesso}
        descInteracao={props.descInteracao}
        descOutras={props.descOutras}
        descSub={props.descSub}
        setDescSub={props.setDescSub}
        setDescField={props.setDescField}
      />
    );
  }

  if (s === 'comodidades') {
    return (
      <ComodidadesEditor amenities={props.amenities} toggleAmenity={props.toggleAmenity} />
    );
  }

  if (s === 'camas') {
    return <TiposCamaEditor value={props.camas} onChange={props.setCamas} />;
  }

  if (s === 'tipo') {
    return (
      <TipoPropriedadeEditor
        value={props.tipoProp}
        onChange={props.setTipoProp}
      />
    );
  }

  if (s === 'config-reserva') {
    return (
      <ConfigReservaEditor
        modoReserva={props.modoReserva}
        setModoReserva={props.setModoReserva}
        exigirHistorico={props.exigirHistorico}
        setExigirHistorico={props.setExigirHistorico}
        msgPre={props.msgPre}
        setMsgPre={props.setMsgPre}
      />
    );
  }

  if (s === 'regras') {
    return (
      <RegrasCasaEditor
        regras={props.regras}
        setRegras={props.setRegras}
        capacidade={props.capacidade}
        setCapacidade={props.setCapacidade}
      />
    );
  }

  if (s === 'cancelamento') {
    return (
      <CancelamentoEditor
        polCurta={props.polCurta}
        setPolCurta={props.setPolCurta}
        polLonga={props.polLonga}
        setPolLonga={props.setPolLonga}
        naoReemb={props.naoReemb}
        setNaoReemb={props.setNaoReemb}
      />
    );
  }

  if (s === 'link-personalizado') {
    return <LinkPersonalizadoEditor slug={props.slug} setSlug={props.setSlug} />;
  }

  if (s === 'localizacao') {
    return <LocalizacaoEditor value={props.localizacao} onChange={props.setLocalizacao} />;
  }

  if (s === 'sobre-anfitriao') {
    return (
      <SobreAnfitriaoEditor value={props.sobreAnfitriao} onChange={props.setSobreAnfitriao} />
    );
  }

  if (s === 'acessibilidade') {
    return (
      <AcessibilidadeEditor
        unitId={props.unitId}
        items={props.acessibilidade}
        onChange={props.setAcessibilidade}
      />
    );
  }

  if (s === 'seguranca') {
    return <SegurancaEditor value={props.seguranca} onChange={props.setSeguranca} />;
  }

  if (s === 'verificacao') {
    return (
      <VerificacaoLocalEditor
        unitId={props.unitId}
        value={props.verificacaoLocal}
        onChange={props.setVerificacaoLocal}
      />
    );
  }

  if (s === 'coanfitrioes') {
    return (
      <CoanfitrioesEditor value={props.coanfitrioes} onChange={props.setCoanfitrioes} />
    );
  }

  return <PanelTitle title="Seção" hint="Em construção." />;
}

function GuiaPanel({
  section,
  regras,
  setRegras,
  guia,
  setGuia,
  capacidade,
  setCapacidade,
}: {
  section: GuiaSection;
  regras: NonNullable<EditorMeta['regrasCasa']>;
  setRegras: (v: NonNullable<EditorMeta['regrasCasa']>) => void;
  guia: NonNullable<EditorMeta['guiaChegada']>;
  setGuia: (v: NonNullable<EditorMeta['guiaChegada']>) => void;
  capacidade: number;
  setCapacidade: (v: number) => void;
}) {
  if (section === 'regras-guia') {
    return (
      <RegrasCasaEditor
        regras={regras}
        setRegras={setRegras}
        capacidade={capacidade}
        setCapacidade={setCapacidade}
      />
    );
  }
  if (section === 'checkin-checkout') {
    return (
      <div>
        <PanelTitle title="Check-in e checkout" />
        <label className="block text-sm">
          Início do check-in
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={regras.checkInDe ?? '14:00'}
            onChange={(e) => setRegras({ ...regras, checkInDe: e.target.value })}
          />
        </label>
        <label className="mt-3 block text-sm">
          Término do check-in
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={regras.checkInAte ?? 'Flexível'}
            onChange={(e) => setRegras({ ...regras, checkInAte: e.target.value })}
          />
        </label>
        <label className="mt-3 block text-sm">
          Checkout
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={regras.checkOutAte ?? '11:00'}
            onChange={(e) => setRegras({ ...regras, checkOutAte: e.target.value })}
          />
        </label>
      </div>
    );
  }
  if (section === 'como-chegar') {
    return (
      <div>
        <PanelTitle title="Como chegar" hint="Compartilhado depois que a reserva é confirmada." />
        <textarea
          className="h-40 w-full rounded-xl border px-3 py-2 text-sm"
          value={guia.comoChegar ?? ''}
          onChange={(e) => setGuia({ ...guia, comoChegar: e.target.value })}
          placeholder="Link do mapa ou instruções"
        />
      </div>
    );
  }
  if (section === 'metodo-checkin') {
    const metodos = [
      'Fechadura inteligente',
      'Teclado numérico',
      'Cofre de chaves',
      'Funcionários do prédio',
      'Recepção presencial',
      'Outro',
    ];
    return (
      <div>
        <PanelTitle title="Método de check-in" hint="Compartilhado 24 a 48 horas antes do check-in." />
        <div className="space-y-2">
          {metodos.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setGuia({ ...guia, metodoCheckIn: m })}
              className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                guia.metodoCheckIn === m ? 'border-slate-900' : 'border-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm">
          Detalhe (ex. Recepção do Hotel)
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={guia.metodoCheckInDetalhe ?? ''}
            onChange={(e) => setGuia({ ...guia, metodoCheckInDetalhe: e.target.value })}
          />
        </label>
        <label className="mt-3 block text-sm">
          Instruções de check-in
          <textarea
            className="mt-1 h-28 w-full rounded-xl border px-3 py-2"
            value={guia.instrucoesCheckIn ?? ''}
            onChange={(e) => setGuia({ ...guia, instrucoesCheckIn: e.target.value })}
          />
        </label>
      </div>
    );
  }
  if (section === 'wifi') {
    return (
      <div>
        <PanelTitle title="Informações do Wi-Fi" hint="Compartilhado 24 a 48 horas antes do check-in." />
        <label className="block text-sm">
          Nome da rede
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={guia.wifiRede ?? ''}
            onChange={(e) => setGuia({ ...guia, wifiRede: e.target.value })}
          />
        </label>
        <label className="mt-3 block text-sm">
          Senha
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={guia.wifiSenha ?? ''}
            onChange={(e) => setGuia({ ...guia, wifiSenha: e.target.value })}
            autoComplete="off"
          />
        </label>
      </div>
    );
  }
  if (section === 'guia-casa') {
    return (
      <div>
        <PanelTitle title="Guia da Casa" hint="Compartilhado 24 a 48 horas antes do check-in." />
        <textarea
          className="h-48 w-full rounded-xl border px-3 py-2"
          value={guia.guiaCasa ?? ''}
          onChange={(e) => setGuia({ ...guia, guiaCasa: e.target.value })}
          placeholder="Dicas sobre internet, TV, equipamentos…"
        />
      </div>
    );
  }
  if (section === 'checkout-instrucoes') {
    const items = guia.instrucoesCheckout ?? [];
    return (
      <div>
        <PanelTitle
          title="Instruções de checkout"
          hint="Visíveis antes da reserva. Lembrete às 17h do dia anterior."
        />
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={it.id} className="rounded-xl border px-3 py-2">
              <input
                className="w-full font-medium outline-none"
                value={it.titulo}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, titulo: e.target.value };
                  setGuia({ ...guia, instrucoesCheckout: next });
                }}
              />
              <textarea
                className="mt-1 w-full text-sm outline-none"
                value={it.texto}
                maxLength={140}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, texto: e.target.value };
                  setGuia({ ...guia, instrucoesCheckout: next });
                }}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-sm"
          onClick={() =>
            setGuia({
              ...guia,
              instrucoesCheckout: [
                ...items,
                { id: `c-${Date.now()}`, titulo: 'Nova instrução', texto: '' },
              ],
            })
          }
        >
          + Adicionar instrução
        </button>
      </div>
    );
  }
  if (section === 'interacao') {
    const opts = [
      'Não estarei disponível pessoalmente e prefiro me comunicar pelo aplicativo',
      'Gosto de cumprimentar pessoalmente, mas fora isso, prefiro ficar mais na minha',
      'Eu gosto de socializar e passar tempo com os hóspedes',
      'Não tenho preferência, me adapto às preferências dos hóspedes',
    ];
    return (
      <div>
        <PanelTitle title="Interação com os hóspedes" />
        <div className="space-y-2">
          {opts.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setGuia({ ...guia, preferenciaInteracao: o })}
              className={`w-full rounded-2xl border p-4 text-left text-sm ${
                guia.preferenciaInteracao === o ? 'border-slate-900' : 'border-slate-200'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <PanelTitle title="Guias" hint="Crie um guia para compartilhar dicas locais com os hóspedes." />
      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        MVP: estrutura salva no metadata. Editor rico de guias locais na fase 2.
      </p>
    </div>
  );
}

function PreferenciasPanel({
  section,
  statusAnuncio,
  setStatusAnuncio,
  exigirFoto,
  setExigirFoto,
  solidaria,
  setSolidaria,
  onEnviarAprovacao,
}: {
  section: PreferenciasSection;
  statusAnuncio: 'anunciado' | 'nao_anunciado';
  setStatusAnuncio: (v: 'anunciado' | 'nao_anunciado') => void;
  exigirFoto: boolean;
  setExigirFoto: (v: boolean) => void;
  solidaria: boolean;
  setSolidaria: (v: boolean) => void;
  onEnviarAprovacao?: () => Promise<void>;
}) {
  if (section === 'status') {
    return (
      <div>
        <PanelTitle title="Status do anúncio" />
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['anunciado', 'Anunciado', 'Aparece nas buscas e pode ser reservado.'],
              ['nao_anunciado', 'Não anunciado', 'Fora da busca; você pode pausar datas.'],
            ] as const
          ).map(([id, title, desc]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusAnuncio(id)}
              className={`rounded-2xl border p-4 text-left ${
                statusAnuncio === id ? 'border-slate-900' : 'border-slate-200'
              }`}
            >
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
            </button>
          ))}
        </div>
        {onEnviarAprovacao && (
          <button
            type="button"
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm"
            onClick={() => void onEnviarAprovacao()}
          >
            Enviar para aprovação do staff
          </button>
        )}
      </div>
    );
  }
  if (section === 'requisitos') {
    return (
      <div>
        <PanelTitle title="Requisitos do hóspede" />
        <label className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
          <span>Exigir foto de perfil</span>
          <input type="checkbox" checked={exigirFoto} onChange={(e) => setExigirFoto(e.target.checked)} />
        </label>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>E-mail e telefone confirmados</li>
          <li>Informações de pagamento</li>
          <li>Concordar com as Regras da Casa</li>
        </ul>
      </div>
    );
  }
  if (section === 'solidaria') {
    return (
      <div>
        <PanelTitle title="Hospedagem solidária" />
        <label className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
          <span>Disponível com desconto ou cortesia para parceiros verificados</span>
          <input type="checkbox" checked={solidaria} onChange={(e) => setSolidaria(e.target.checked)} />
        </label>
      </div>
    );
  }
  if (section === 'remover') {
    return (
      <div>
        <PanelTitle title="Remover anúncio" hint="Ação destrutiva — use Não anunciado para pausar." />
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Para remover permanentemente, altere o status para Não anunciado e contate o suporte Reservei.
          Soft-delete com auditoria na fase 2.
        </p>
      </div>
    );
  }
  if (section === 'idiomas') {
    return (
      <div>
        <PanelTitle title="Idiomas" />
        <p className="text-sm">Português (padrão)</p>
        <p className="mt-2 text-xs text-slate-500">
          Hóspedes podem ver traduções automáticas de outros campos.
        </p>
      </div>
    );
  }
  if (section === 'leis') {
    return (
      <div>
        <PanelTitle title="Leis locais" />
        <p className="text-sm text-slate-600">
          Revise zoneamento, licenças e impostos aplicáveis à sua acomodação. Ao aceitar os Termos da
          Reservei Viagens, você declara conformidade com as leis aplicáveis.
        </p>
      </div>
    );
  }
  return (
    <div>
      <PanelTitle title="Impostos" hint="Adicione impostos que você precisa recolher." />
      <p className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">
        Cadastro fiscal completo (alíquota, isenções, registro) na fase 2.
      </p>
    </div>
  );
}
