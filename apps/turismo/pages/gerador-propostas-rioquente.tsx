'use client';

import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  buildPdfHtmlLintel,
  buildWhatsAppShareUrl,
  formatarMensagemWhatsApp,
  formatarMoedaBrl,
  montarPropostaRioQuente,
  RIO_QUENTE_AVIVA_CATALOG,
  type EntradaPixPadrao,
  type RioQuenteHotelId,
  type RioQuentePropostaDraft,
} from '@rsv360/shared';

import { KpiZeigarnikCard } from '../components/lintel/KpiZeigarnikCard';
import { LINTEL_THEME_TOKENS } from '../components/lintel/lintel-theme';
import { StickyBottomBar } from '../components/lintel/StickyBottomBar';

const HOJE = new Date().toISOString().slice(0, 10);

export default function GeradorPropostasRioQuentePage() {
  const [hotelId, setHotelId] = useState<RioQuenteHotelId>('luupi');
  const [checkIn, setCheckIn] = useState(HOJE);
  const [checkOut, setCheckOut] = useState('');
  const [adultos, setAdultos] = useState(2);
  const [criancas, setCriancas] = useState(0);
  const [entradaPix, setEntradaPix] = useState<EntradaPixPadrao>(200);
  const [parcelas, setParcelas] = useState(10);
  const [nomeCliente, setNomeCliente] = useState('');

  const draftResult = useMemo(
    () =>
      montarPropostaRioQuente({
        hotelId,
        checkIn,
        checkOut: checkOut || checkIn,
        adultos,
        criancas,
        entradaPix,
        parcelasCartao: parcelas,
      }),
    [hotelId, checkIn, checkOut, adultos, criancas, entradaPix, parcelas],
  );

  const draft = 'error' in draftResult ? null : draftResult;
  const error = 'error' in draftResult ? draftResult.error : null;

  const progress =
    draft && nomeCliente.trim() && checkOut
      ? 100
      : draft
        ? 65
        : checkIn && checkOut
          ? 35
          : 15;

  const whatsapp =
    draft != null ? formatarMensagemWhatsApp(draft, { nomeCliente: nomeCliente || undefined }) : '';

  function openPdf() {
    if (!draft) return;
    const html = buildPdfHtmlLintel(draft);
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
    }
  }

  return (
    <>
      <Head>
        <title>Gerador Rio Quente | RSV 360</title>
      </Head>
      <div className="min-h-screen bg-[var(--lintel-bg-canvas)] pb-24">
        <motionHeader />
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-2">
          <form className="space-y-4 rounded-2xl border border-[var(--lintel-bg-subtle)] bg-[var(--lintel-bg-surface)] p-5">
            <label className="block text-sm font-medium text-[var(--lintel-brand-navy)] dark:text-white">
              Hotel Aviva
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={hotelId}
                onChange={(e) => setHotelId(e.target.value as RioQuenteHotelId)}
              >
                {Object.values(RIO_QUENTE_AVIVA_CATALOG).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nome}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Check-in
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border px-3 py-2 lintel-tabular-nums"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Check-out
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border px-3 py-2 lintel-tabular-nums"
                  value={checkOut}
                  min={checkIn}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Adultos
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border px-3 py-2 lintel-tabular-nums"
                  value={adultos}
                  onChange={(e) => setAdultos(Number(e.target.value))}
                />
              </label>
              <label className="text-sm">
                Crianças
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border px-3 py-2 lintel-tabular-nums"
                  value={criancas}
                  onChange={(e) => setCriancas(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="text-sm">
              Nome do cliente (WhatsApp)
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Primeiro nome"
                autoComplete="off"
              />
            </label>
            <fieldset className="text-sm">
              <legend className="font-medium">Entrada PIX</legend>
              <div className="mt-2 flex gap-3">
                {([200, 400] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={entradaPix === v}
                      onChange={() => setEntradaPix(v)}
                    />
                    {formatarMoedaBrl(v)}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-sm">
              Parcelas cartão (máx. 10)
              <input
                type="range"
                min={1}
                max={10}
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
                className="mt-2 w-full"
              />
              <span className="lintel-tabular-nums text-xs text-slate-600">{parcelas}x</span>
            </label>
          </form>

          <motionAside draft={draft} error={error} progress={progress} />
        </div>

        {error ? (
          <p className="mx-auto max-w-5xl px-4 text-sm text-[var(--lintel-status-danger)]">{error}</p>
        ) : null}

        {draft ? (
          <StickyBottomBar>
            <span className="lintel-tabular-nums text-sm font-semibold text-[var(--lintel-brand-navy)] dark:text-white">
              Total {formatarMoedaBrl(draft.pagamento.valorTotal)}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--lintel-brand-gold)] px-4 py-2 text-sm font-medium"
                onClick={openPdf}
              >
                Visualizar PDF Lintel
              </button>
              <a
                href={buildWhatsAppShareUrl(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-lg bg-[#${LINTEL_THEME_TOKENS.brandWhatsApp}] px-4 py-2 text-sm font-semibold text-white`}
              >
                Enviar WhatsApp
              </a>
            </div>
          </StickyBottomBar>
        ) : null}
      </div>
    </>
  );
}

function motionHeader() {
  return (
    <header className="border-b border-[var(--lintel-bg-subtle)] bg-[var(--lintel-brand-navy)] px-4 py-6 text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide opacity-80">Complexo Rio Quente · Aviva</p>
          <h1 className="text-2xl font-bold">Gerador de propostas Luupi & Giardino</h1>
        </div>
        <Link href="/propostas" className="text-sm underline opacity-90">
          ← Propostas
        </Link>
      </div>
    </header>
  );
}

function motionAside({
  draft,
  error,
  progress,
}: {
  draft: RioQuentePropostaDraft | null;
  error: string | null;
  progress: number;
}) {
  if (error || !draft) {
    return (
      <KpiZeigarnikCard
        title="Proposta"
        metric="—"
        subcopy="Preencha datas e hóspedes para calcular PIX + cartão."
        progressPercent={progress}
      />
    );
  }

  const p = draft.pagamento;
  return (
    <div className="space-y-4">
      <KpiZeigarnikCard
        title="Pagamento"
        metric={formatarMoedaBrl(p.valorTotal)}
        subcopy={`PIX ${formatarMoedaBrl(p.entradaPix)} + ${p.parcelas}x de ${formatarMoedaBrl(p.valorParcela)}`}
        progressPercent={progress}
        actionLabel={progress < 100 ? 'Complete o nome do cliente' : undefined}
      />
      <div className="rounded-2xl border border-[var(--lintel-bg-subtle)] bg-[var(--lintel-bg-surface)] p-4 text-sm">
        <h3 className="font-semibold text-[var(--lintel-brand-navy)] dark:text-white">Regras Aviva</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-400">
          {draft.regrasAviva.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}