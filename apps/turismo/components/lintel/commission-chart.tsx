'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Copy, MoreHorizontal, TrendingUp, X } from 'lucide-react';
import { lintelBtnGhost, lintelEase, lintelIconBtn, lintelSegment } from './overview-primitives';
import { useCrmLocaleOptional } from './crm-locale-provider';
import { getCrmCopy } from './crm-copy';

export type CommissionPeriod = '6M' | '12M';

export type CommissionMonthPoint = {
  key: string;
  label: string;
  value: number;
};

/** Meta mensal Lintel (USD) — linha tracejada no gráfico. */
export const COMMISSION_MONTHLY_TARGET = 131_700;

const CHART = {
  viewW: 500,
  viewH: 150,
  padL: 40,
  padR: 500,
  padTop: 20,
  padBottom: 130,
  maxValue: 200_000,
};

/** Série demo alinhada ao vídeo comissão.mp4 (total $913,375 · 0 meses na meta). */
const DEMO_12M: CommissionMonthPoint[] = [
  { key: 'nov', label: 'Nov', value: 96_025 },
  { key: 'dec', label: 'Dec', value: 72_400 },
  { key: 'jan', label: 'Jan', value: 68_200 },
  { key: 'feb', label: 'Feb', value: 71_000 },
  { key: 'mar', label: 'Mar', value: 69_100 },
  { key: 'apr', label: 'Apr', value: 74_000 },
  { key: 'may', label: 'May', value: 92_500 },
  { key: 'jun', label: 'Jun', value: 92_500 },
  { key: 'jul', label: 'Jul', value: 74_100 },
  { key: 'aug', label: 'Aug', value: 82_000 },
  { key: 'sep', label: 'Sep', value: 78_000 },
  { key: 'oct', label: 'Oct', value: 43_550 },
];

function normalizeDemoTotal(points: CommissionMonthPoint[]): CommissionMonthPoint[] {
  const targetTotal = 913_375;
  const sum = points.reduce((a, p) => a + p.value, 0);
  if (sum === targetTotal) return points;
  const last = points[points.length - 1];
  const rest = sum - last.value;
  return [
    ...points.slice(0, -1),
    { ...last, value: Math.max(0, targetTotal - rest) },
  ];
}

const LINTEL_DEMO_12M = normalizeDemoTotal(DEMO_12M);

export function seriesForPeriod(
  period: CommissionPeriod,
  full: CommissionMonthPoint[] = LINTEL_DEMO_12M,
): CommissionMonthPoint[] {
  if (period === '12M') return full;
  return full.slice(-6);
}

export function commissionStats(points: CommissionMonthPoint[]) {
  const total = points.reduce((a, p) => a + p.value, 0);
  const monthsAtTarget = points.filter((p) => p.value >= COMMISSION_MONTHLY_TARGET).length;
  const latest = points[points.length - 1]?.value ?? 0;
  return { total, monthsAtTarget, monthCount: points.length, latestMonthValue: latest };
}

export function formatUsdFull(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export function formatMoneyFull(value: number, currency: 'USD' | 'BRL' = 'USD'): string {
  if (currency === 'BRL') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
  return formatUsdFull(value);
}

export function formatUsdCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return formatUsdFull(value);
}

export function formatMoneyCompact(value: number, currency: 'USD' | 'BRL' = 'USD'): string {
  if (currency === 'BRL') {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
    return formatMoneyFull(value, 'BRL');
  }
  return formatUsdCompact(value);
}

function valueToY(value: number, maxValue: number): number {
  const span = CHART.padBottom - CHART.padTop;
  return CHART.padBottom - (value / maxValue) * span;
}

function indexToX(index: number, count: number): number {
  if (count <= 1) return CHART.padL;
  return CHART.padL + (index / (count - 1)) * (CHART.padR - CHART.padL);
}

function chartMaxForPoints(points: CommissionMonthPoint[]): number {
  const peak = points.reduce((m, p) => Math.max(m, p.value), 0);
  const base = Math.max(COMMISSION_MONTHLY_TARGET, peak, 50_000);
  return Math.ceil(base / 10_000) * 10_000;
}

/** Curva suave estilo Lintel (cúbica entre pontos). */
function buildSmoothPath(points: CommissionMonthPoint[], maxValue: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const x = indexToX(0, 1);
    const y = valueToY(points[0].value, maxValue);
    return `M ${x},${y}`;
  }

  const coords = points.map((p, i) => ({
    x: indexToX(i, points.length),
    y: valueToY(p.value, maxValue),
  }));

  let d = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx.toFixed(1)},${p0.y.toFixed(1)} ${cx.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}

function buildAreaPath(linePath: string, pointCount: number): string {
  if (!linePath || pointCount === 0) return '';
  const lastX = indexToX(pointCount - 1, pointCount);
  const firstX = CHART.padL;
  return `${linePath} L ${lastX},${CHART.padBottom} L ${firstX},${CHART.padBottom} Z`;
}

/** Overview CRM: série real só com histórico suficiente; senão demo Lintel USD (comissão.mp4). */
export const COMMISSION_DEMO_MIN_MONTHS = 6;

export function shouldUseLintelCommissionDemo(series: CommissionMonthPoint[] | null | undefined): boolean {
  return !series || series.length < COMMISSION_DEMO_MIN_MONTHS;
}

/** Agrega comissões pagas por mês (YYYY-MM) para o gráfico. */
export function aggregatePaidComissoesByMonth(
  items: Array<{ valorComissao: string; criadoEm: string | null; status: string }>,
  months = 12,
): CommissionMonthPoint[] | null {
  const paid = items.filter((i) => i.status === 'paga' && i.criadoEm);
  if (paid.length === 0) return null;

  const buckets = new Map<string, number>();
  for (const row of paid) {
    const d = new Date(row.criadoEm!);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const val = Number(row.valorComissao);
    if (!Number.isFinite(val)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + val);
  }

  const keys = [...buckets.keys()].sort();
  if (keys.length === 0) return null;

  const lastKeys = keys.slice(-months);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return lastKeys.map((key) => {
    const [, m] = key.split('-');
    const mi = Number(m) - 1;
    return {
      key,
      label: monthNames[mi] ?? key,
      value: buckets.get(key) ?? 0,
    };
  });
}

function useAnimatedNumber(target: number, durationMs = 520) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    const from = prev.current;
    const to = target;
    prev.current = to;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}

type CommissionChartProps = {
  points: CommissionMonthPoint[];
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  gradientId: string;
  animateKey: string;
  className?: string;
  moneyCurrency?: 'USD' | 'BRL';
  legendCommission?: string;
  legendTarget?: string;
};

function CommissionChartSkeleton({ className = 'h-44' }: { className?: string }) {
  return (
    <div className={`relative w-full ${className}`} aria-hidden>
      <div className="absolute inset-0 flex flex-col justify-between px-10 py-2 pointer-events-none">
        <div className="flex justify-between text-[10px] font-bold text-gray-300 dark:text-gray-600">
          <span>$140.0K</span>
          <span className="opacity-0">.</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-gray-300 dark:text-gray-600">
          <span>$70.0K</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-gray-300 dark:text-gray-600">
          <span>$0</span>
        </div>
      </div>
      <div className="lintel-shimmer mx-8 mt-6 h-[72%] rounded-2xl opacity-90" />
      <div className="flex justify-between text-[10px] font-bold text-gray-300 dark:text-gray-600 px-10 mt-2">
        {['Nov', 'Dec', 'Jan', 'Feb', 'May', 'Oct'].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function CommissionChart({
  points,
  hoveredIndex,
  onHoverIndex,
  gradientId,
  animateKey,
  className = 'h-44',
  moneyCurrency = 'USD',
  legendCommission = 'Commission',
  legendTarget = 'Target',
}: CommissionChartProps) {
  const maxValue = useMemo(() => chartMaxForPoints(points), [points]);
  const linePath = useMemo(() => buildSmoothPath(points, maxValue), [points, maxValue]);
  const areaPath = useMemo(() => buildAreaPath(linePath, points.length), [linePath, points.length]);
  const targetY = valueToY(COMMISSION_MONTHLY_TARGET, maxValue);
  const yTicks = useMemo(() => {
    const mid = maxValue / 2;
    return [maxValue, mid, 0];
  }, [maxValue]);

  const handlePointer = (clientX: number, rect: DOMRect) => {
    if (points.length === 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    const idx = Math.round(ratio * (points.length - 1));
    onHoverIndex(Math.max(0, Math.min(points.length - 1, idx)));
  };

  return (
    <div className={`relative w-full ${className}`}>
      <svg
        className="w-full h-full overflow-visible touch-none"
        viewBox={`0 0 ${CHART.viewW} ${CHART.viewH}`}
        onMouseLeave={() => onHoverIndex(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          handlePointer(e.clientX, rect);
        }}
        onTouchMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const touch = e.touches[0];
          if (touch) handlePointer(touch.clientX, rect);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f5bea" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2f5bea" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((v) => {
          const y = valueToY(v, maxValue);
          return (
            <g key={v}>
              <line
                x1={CHART.padL}
                y1={y}
                x2={CHART.padR}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="3 4"
              />
              <text
                x={30}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-gray-400 font-semibold"
              >
                {v === 0 ? formatMoneyFull(0, moneyCurrency) : formatMoneyCompact(v, moneyCurrency)}
              </text>
            </g>
          );
        })}

        {moneyCurrency === 'USD' && (
          <line
            x1={CHART.padL}
            y1={targetY}
            x2={CHART.padR}
            y2={targetY}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="5 5"
            strokeOpacity={0.45}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {areaPath && (
          <path
            key={`area-${animateKey}`}
            d={areaPath}
            fill={`url(#${gradientId})`}
            className="lintel-commission-area"
          />
        )}
        {linePath && (
          <path
            key={`line-${animateKey}`}
            d={linePath}
            pathLength={1}
            fill="none"
            stroke="#2f5bea"
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="lintel-commission-stroke"
          />
        )}

        {hoveredIndex != null && points[hoveredIndex] && (
          <>
            <line
              x1={indexToX(hoveredIndex, points.length)}
              y1={CHART.padTop}
              x2={indexToX(hoveredIndex, points.length)}
              y2={CHART.padBottom}
              stroke="#2f5bea"
              strokeOpacity={0.25}
              strokeWidth={1}
            />
            <circle
              cx={indexToX(hoveredIndex, points.length)}
              cy={valueToY(points[hoveredIndex].value, maxValue)}
              r={5}
              fill="#2f5bea"
              stroke="white"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {hoveredIndex != null && points[hoveredIndex] && (
        <div
          className="lintel-map-tooltip pointer-events-none absolute z-10 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#1d222c] shadow-lg px-3 py-2 text-left min-w-[140px]"
          style={{
            left: `${(hoveredIndex / Math.max(1, points.length - 1)) * 100}%`,
            top: 8,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-[11px] font-black text-gray-900 dark:text-white block mb-1">
            {points[hoveredIndex].label}
          </span>
          <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#2f5bea]" />
              {legendCommission}
            </span>
            <span className="font-black text-gray-900 dark:text-white">
              {formatMoneyCompact(points[hoveredIndex].value, moneyCurrency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-gray-600 dark:text-gray-300 mt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#121722] dark:bg-white" />
              {legendTarget}
            </span>
            <span className="font-black text-gray-900 dark:text-white">
              {formatMoneyCompact(COMMISSION_MONTHLY_TARGET, moneyCurrency)}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-between text-[10px] text-gray-400 font-bold px-8 mt-1">
        {points.map((p) => (
          <span key={p.key}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

export type CommissionOverviewCardProps = {
  period: CommissionPeriod;
  onPeriodChange: (p: CommissionPeriod) => void;
  series12M?: CommissionMonthPoint[] | null;
  onOpenComissoes?: () => void;
  className?: string;
  moneyCurrency?: 'USD' | 'BRL';
  /** Carregamento API / boot antes do draw da curva (ref. caregamento da comissão.mp4). */
  loading?: boolean;
};

export function CommissionOverviewCard({
  period,
  onPeriodChange,
  series12M,
  onOpenComissoes,
  className = '',
  moneyCurrency = 'USD',
  loading = false,
}: CommissionOverviewCardProps) {
  const crm = useCrmLocaleOptional();
  const copy = crm?.copy ?? getCrmCopy('pt');
  const co = copy.commission;
  const common = copy.common;
  const baseSeries = series12M && series12M.length > 0 ? series12M : LINTEL_DEMO_12M;
  const points = useMemo(() => seriesForPeriod(period, baseSeries), [period, baseSeries]);
  const stats = useMemo(() => commissionStats(points), [points]);
  const animatedTotal = useAnimatedNumber(loading ? 0 : stats.total, loading ? 80 : 680);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [revealGeneration, setRevealGeneration] = useState(0);
  const gradientId = useId().replace(/:/g, '');
  const animateKey = `${revealGeneration}-${period}-${points.map((p) => p.key).join('-')}`;

  useEffect(() => {
    if (!loading) {
      setRevealGeneration((g) => g + 1);
    }
  }, [loading]);

  useEffect(() => {
    setHoveredIndex(null);
  }, [period]);

  const targetLabel = formatMoneyCompact(COMMISSION_MONTHLY_TARGET, moneyCurrency);

  return (
    <>
      <div
        className={`lintel-overview-commission min-h-[300px] w-full lg:min-h-[320px] rounded-2xl border border-white/80 bg-white/70 p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#171b23]/80 flex flex-col justify-between lintel-card-hover ${className}`}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span>{co.title}</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="inline-flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-[11px] font-bold">
                <button
                  type="button"
                  aria-pressed={period === '6M'}
                  onClick={() => onPeriodChange('6M')}
                  className={lintelSegment(period === '6M')}
                >
                  6M
                </button>
                <button
                  type="button"
                  aria-pressed={period === '12M'}
                  onClick={() => onPeriodChange('12M')}
                  className={lintelSegment(period === '12M')}
                >
                  12M
                </button>
              </div>
              <div className="relative">
                <button
                  type="button"
                  aria-label={co.optionsAria}
                  aria-expanded={showMenu}
                  onClick={() => setShowMenu((v) => !v)}
                  className={`w-8 h-8 ${lintelIconBtn}`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-9 w-56 rounded-2xl bg-white dark:bg-[#1c212c] border border-gray-200/80 dark:border-gray-700 shadow-xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl p-2.5 font-bold text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => {
                        void navigator.clipboard.writeText(formatMoneyFull(stats.total, moneyCurrency));
                        setShowMenu(false);
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                      {co.copyTotal}
                    </button>
                    {onOpenComissoes ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl p-2.5 font-bold text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => {
                          setShowMenu(false);
                          onOpenComissoes();
                        }}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#2f5bea]" />
                        {co.myCommissions}
                      </button>
                    ) : (
                      <Link
                        href="/anfitriao/comissoes"
                        className="flex w-full items-center gap-2 rounded-xl p-2.5 font-bold hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setShowMenu(false)}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#2f5bea]" />
                        {co.myCommissions}
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label={co.expandAria}
                onClick={() => setExpanded(true)}
                className={`w-8 h-8 ${lintelIconBtn}`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span
              className={`text-4xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums transition-opacity ${lintelEase} ${
                loading ? 'opacity-40' : 'opacity-100'
              }`}
              aria-busy={loading}
            >
              {formatMoneyFull(loading ? 0 : animatedTotal, moneyCurrency)}
            </span>
            <span className="text-xs text-gray-500 font-semibold">
              {moneyCurrency === 'USD' ? (
                <>
                  {co.earnedThisYear} · <b>{stats.monthsAtTarget}</b>{' '}
                  {co.monthsAtTargetSuffix.replace('{total}', String(stats.monthCount))}
                </>
              ) : (
                <>
                  {co.paidBrlPrefix} · <b>{stats.monthCount}</b> {co.paidBrlSuffix}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 mb-3">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2f5bea]" /> {co.earnedLegend}
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-3 border-t-2 border-dashed border-[#121722] dark:border-white" /> {co.teamTarget} ·{' '}
              {moneyCurrency === 'USD' ? `${targetLabel} ${co.perMonth}` : co.teamTargetDemoBrl}
            </span>
          </div>
        </div>

        {loading ? (
          <CommissionChartSkeleton />
        ) : (
          <CommissionChart
            points={points}
            hoveredIndex={hoveredIndex}
            onHoverIndex={setHoveredIndex}
            gradientId={gradientId}
            animateKey={animateKey}
            moneyCurrency={moneyCurrency}
            legendCommission={co.tooltipCommission}
            legendTarget={co.tooltipTarget}
          />
        )}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm lintel-overview-enter"
          role="dialog"
          aria-modal="true"
          aria-labelledby="commission-expand-title"
          onClick={() => setExpanded(false)}
        >
          <div
            className="w-full max-w-3xl rounded-[26px] bg-white dark:bg-[#171b23] border border-white/80 dark:border-white/10 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="commission-expand-title" className="text-lg font-black text-gray-900 dark:text-white">
                {co.title}
              </h2>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label={common.close}
                className={`w-9 h-9 ${lintelIconBtn}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CommissionChart
              points={points}
              hoveredIndex={hoveredIndex}
              onHoverIndex={setHoveredIndex}
              gradientId={`${gradientId}-modal`}
              animateKey={`modal-${animateKey}`}
              className="h-64"
              moneyCurrency={moneyCurrency}
              legendCommission={co.tooltipCommission}
              legendTarget={co.tooltipTarget}
            />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setExpanded(false)} className={lintelBtnGhost + ' px-4 py-2'}>
                {common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** KPI do hero — comissão do mês corrente na série. */
export function commissionMonthKpi(
  series12M?: CommissionMonthPoint[] | null,
  currency: 'USD' | 'BRL' = 'USD',
): string {
  const base = series12M && series12M.length > 0 ? series12M : LINTEL_DEMO_12M;
  const latest = base[base.length - 1]?.value ?? 0;
  return formatMoneyFull(latest, currency);
}

export { LINTEL_DEMO_12M };
