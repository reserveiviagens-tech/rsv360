'use client';

import React, { useMemo } from 'react';

/** Gauge semicircular Lintel (property overview). Coordenadas: x = cx + r·cos(θ), y = cy − r·sin(θ) */

export type LintelSemiCircularPriceGaugeProps = {
  /** Preço alvo em milhões (ex.: 1.24 → $1.24M) */
  targetPriceM: number;
  minM?: number;
  maxM?: number;
  marketEstimateM?: number;
  className?: string;
};

export function LintelSemiCircularPriceGauge({
  targetPriceM,
  minM = 1.0,
  maxM = 1.5,
  marketEstimateM = 1.185,
  className = '',
}: LintelSemiCircularPriceGaugeProps) {
  const { pricePct, filledArcPath, knobX, knobY, cx, cy, arcRadius } = useMemo(() => {
    const pct = Math.max(0, Math.min(1, (targetPriceM - minM) / (maxM - minM)));
    const currentAngleRad = ((200 - 220 * pct) * Math.PI) / 180;
    const r = 88;
    const centerX = 120;
    const centerY = 105;
    const kx = centerX + r * Math.cos(currentAngleRad);
    const ky = centerY - r * Math.sin(currentAngleRad);
    const sweepDeg = 220 * pct;
    const largeArcFlag = sweepDeg > 180 ? 1 : 0;
    const startX = centerX + r * Math.cos((200 * Math.PI) / 180);
    const startY = centerY - r * Math.sin((200 * Math.PI) / 180);
    const path = `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${kx.toFixed(2)} ${ky.toFixed(2)}`;
    return {
      pricePct: pct,
      filledArcPath: path,
      knobX: kx,
      knobY: ky,
      cx: centerX,
      cy: centerY,
      arcRadius: r,
    };
  }, [targetPriceM, minM, maxM]);

  const isHighRisk = targetPriceM > 1.22;
  const isFairPrice = targetPriceM >= 1.15 && targetPriceM <= 1.22;
  const statusLabel = isHighRisk ? 'High risk' : isFairPrice ? 'Fair price' : 'Below market';
  const statusBadgeColor = isHighRisk
    ? 'bg-rose-500/10 text-rose-500 border border-rose-200/50'
    : isFairPrice
      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200/50'
      : 'bg-blue-500/10 text-blue-600 border border-blue-200/50';

  const deltaMarket = targetPriceM - marketEstimateM;

  return (
    <div className={`flex flex-col items-center justify-center relative pt-1 pb-3 ${className}`}>
      <span className="text-xs font-black text-slate-500 mb-0.5 tracking-tight">
        {deltaMarket >= 0 ? `+$${Math.round(deltaMarket * 1000)}K` : `-$${Math.round(Math.abs(deltaMarket) * 1000)}K`}
      </span>

      <div className="relative w-72 h-36 flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 240 120" className="w-full h-full" aria-hidden>
          <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {Array.from({ length: 45 }).map((_, i) => {
              const f = i / 44;
              const angle = ((200 - 220 * f) * Math.PI) / 180;
              const isMajor = i % 4 === 0;
              const r1 = 98;
              const r2 = r1 + (isMajor ? 7 : 4);
              const x1 = cx + r1 * Math.cos(angle);
              const y1 = cy - r1 * Math.sin(angle);
              const x2 = cx + r2 * Math.cos(angle);
              const y2 = cy - r2 * Math.sin(angle);
              const isPassed = f <= pricePct;
              return (
                <line
                  key={i}
                  x1={x1.toFixed(1)}
                  y1={y1.toFixed(1)}
                  x2={x2.toFixed(1)}
                  y2={y2.toFixed(1)}
                  stroke={isPassed ? (f > 0.75 ? '#ff8a3d' : '#3b82f6') : '#cbd5e1'}
                  strokeWidth={isMajor ? 2 : 1.5}
                  className="transition-colors duration-150"
                />
              );
            })}
          </g>

          <path
            d="M 37.28 74.90 A 88 88 0 1 1 202.72 74.90"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="12"
            strokeLinecap="round"
            className="dark:stroke-slate-800"
          />

          <defs>
            <linearGradient id="lintelGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="70%" stopColor="#3b82f6" />
              <stop offset="90%" stopColor="#ff8a3d" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>

          {pricePct > 0.01 ? (
            <path
              d={filledArcPath}
              fill="none"
              stroke="url(#lintelGaugeGrad)"
              strokeWidth="12"
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          ) : null}

          <line x1="120" y1="4" x2="120" y2="26" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" className="dark:stroke-white" />

          <circle
            cx={knobX.toFixed(2)}
            cy={knobY.toFixed(2)}
            r="7.5"
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth="4.5"
            className="shadow-md transition-all duration-75 dark:fill-slate-900"
          />
        </svg>

        <div className="absolute bottom-1 text-center select-none">
          <span className="text-[11px] font-bold text-slate-400 block tracking-tight">Target home price</span>
          <span className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
            ${targetPriceM.toFixed(2)}M
          </span>
          <div className="mt-1.5">
            <span className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-black ${statusBadgeColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LintelSemiCircularPriceGauge;
