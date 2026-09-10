'use client';

import Link from 'next/link';
import { HOST_SERVICE_FEE_RATE, hostPayoutBreakdown } from '../date-range-utils';

export const DESCONTO_PCT_MAX = 99;
export const NOITES_SEMANAL = 7;
export const NOITES_MENSAL = 28;

type Props = {
  unitId: number;
  precoDiaria: string;
  descSemanal: number;
  setDescSemanal: (v: number) => void;
  descMensal: number;
  setDescMensal: (v: number) => void;
};

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function summarizeDescontosClient(semanal: number, mensal: number): string | null {
  const parts: string[] = [];
  if (semanal > 0) parts.push(`Desconto semanal de ${Math.round(semanal)}%`);
  if (mensal > 0) parts.push(`Desconto mensal de ${Math.round(mensal)}%`);
  return parts.length ? parts.join(' · ') : null;
}

function parseDiaria(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function stayBreakdown(diaria: number, noites: number, pct: number) {
  const precoBaseTotal = Math.round(diaria * noites * 100) / 100;
  const descontoValor = Math.round(precoBaseTotal * (pct / 100) * 100) / 100;
  const precoHospede = Math.round((precoBaseTotal - descontoValor) * 100) / 100;
  const { taxa, recebe } = hostPayoutBreakdown(precoHospede);
  const mediaNoite = Math.round((precoHospede / noites) * 100) / 100;
  return { precoBaseTotal, descontoValor, precoHospede, taxa, recebe, mediaNoite, noites, pct };
}

function DiscountRow({
  title,
  subtitle,
  pct,
  onChange,
  diaria,
  noites,
  tip,
}: {
  title: string;
  subtitle: string;
  pct: number;
  onChange: (v: number) => void;
  diaria: number | null;
  noites: number;
  tip: string;
}) {
  const clamped = Math.min(DESCONTO_PCT_MAX, Math.max(0, Math.round(pct)));
  const bd = diaria != null ? stayBreakdown(diaria, noites, clamped) : null;

  return (
    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
          <input
            type="number"
            min={0}
            max={DESCONTO_PCT_MAX}
            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-right outline-none ring-slate-900 focus:ring-2"
            value={clamped}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange(
                Number.isFinite(n)
                  ? Math.min(DESCONTO_PCT_MAX, Math.max(0, Math.round(n)))
                  : 0,
              );
            }}
            aria-label={`${title} em porcentagem`}
          />
          <span>%</span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={DESCONTO_PCT_MAX}
        className="mt-4 w-full accent-slate-900"
        value={clamped}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Slider ${title}`}
      />

      {bd ? (
        <p className="mt-2 text-sm text-slate-600">
          Média {formatBrl(bd.mediaNoite)}
          <span className="text-slate-400"> / noite</span>
          {clamped > 0 ? (
            <span className="text-slate-500">
              {' '}
              · sem desconto {formatBrl(diaria!)}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          Defina o preço básico em Preços para ver médias em R$.
        </p>
      )}

      {bd && clamped > 0 ? (
        <dl className="mt-4 space-y-1.5 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <div className="flex justify-between gap-3">
            <dt>
              {bd.noites} noites × {formatBrl(diaria!)}
            </dt>
            <dd>{formatBrl(bd.precoBaseTotal)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-emerald-800">
            <dt>Desconto ({bd.pct}%)</dt>
            <dd>− {formatBrl(bd.descontoValor)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Taxa de serviço (~{Math.round(HOST_SERVICE_FEE_RATE * 1000) / 10}%)</dt>
            <dd>− {formatBrl(bd.taxa)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
            <dt>Você recebe</dt>
            <dd>{formatBrl(bd.recebe)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-slate-600">
            <dt>Preço do hóspede</dt>
            <dd>{formatBrl(bd.precoHospede)}</dd>
          </div>
        </dl>
      ) : null}

      <p className="mt-3 text-xs text-slate-500">{tip}</p>
    </div>
  );
}

export function DescontosEditor({
  unitId,
  precoDiaria,
  descSemanal,
  setDescSemanal,
  descMensal,
  setDescMensal,
}: Props) {
  const diaria = parseDiaria(precoDiaria);
  const mensalMenorQueSemanal = descMensal > 0 && descSemanal > 0 && descMensal < descSemanal;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Descontos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ofereça descontos para estadias longas. Semanal vale para 7+ noites; mensal para 28+.
          Os descontos não se acumulam — aplica-se o maior elegível.
        </p>
      </div>

      <DiscountRow
        title="Desconto semanal"
        subtitle="Estadias de 7 noites ou mais"
        pct={descSemanal}
        onChange={setDescSemanal}
        diaria={diaria}
        noites={NOITES_SEMANAL}
        tip="Dica: cerca de 10% costuma atrair mais reservas de uma semana."
      />

      <DiscountRow
        title="Desconto mensal"
        subtitle="Estadias de 28 noites ou mais"
        pct={descMensal}
        onChange={setDescMensal}
        diaria={diaria}
        noites={NOITES_MENSAL}
        tip="Dica: cerca de 20% é comum para estadias mensais."
      />

      {mensalMenorQueSemanal ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          O desconto mensal costuma ser maior que o semanal para incentivar estadias longas.
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dicas</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
          <li>Descontos aparecem no anúncio e no calendário de tarifas.</li>
          <li>Preços por data específica têm prioridade sobre estes percentuais.</li>
          <li>A taxa de serviço é estimativa — o valor final pode variar.</li>
        </ul>
      </div>

      <Link
        href={`/anfitriao/unidades/${unitId}/disponibilidade`}
        className="inline-flex text-sm font-medium text-slate-800 underline underline-offset-2"
        prefetch={false}
      >
        Abrir calendário de tarifas →
      </Link>
    </div>
  );
}
