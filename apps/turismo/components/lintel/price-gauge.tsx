'use client';

import React, { useMemo } from 'react';

/**
 * Gauge semicircular Lintel (Pixel-Perfect Reference Match).
 * - Arco azul da base até a estimativa de mercado (topo / 90°).
 * - Marcador vertical preto no topo com indicador de delta (+-$55K).
 * - Arco laranja de sobrepreço do topo até o valor alvo.
 * - Cursor bullseye (alvo com anel externo e ponto central escuro).
 * - Ticks radiais sincronizados com as cores de cada zona.
 */

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
  // Configuração geométrica do arco:
  // Centro (cx, cy) = (140, 145), Raio = 95
  // Ângulo inicial: 195° (esquerda inferior)
  // Ângulo topo (estimativa de mercado): 90° (topo central)
  // Ângulo final: -15° (direita inferior)
  // Total span = 210°
  const cx = 140;
  const cy = 145;
  const r = 95;
  const startAngleDeg = 195;
  const midAngleDeg = 90; // Topo / Mercado ($1.185M)
  const endAngleDeg = -15;

  const {
    targetAngleDeg,
    knobX,
    knobY,
    blueArcPath,
    orangeArcPath,
    deltaMarketK,
    isOverMarket,
  } = useMemo(() => {
    // Mapeamento linear do preço alvo para graus:
    // minM (1.00) -> 195°
    // marketEstimateM (1.185) -> 90°
    // maxM (1.50) -> -15°
    let angleDeg: number;
    if (targetPriceM <= marketEstimateM) {
      const f = Math.max(0, (targetPriceM - minM) / (marketEstimateM - minM));
      angleDeg = startAngleDeg - f * (startAngleDeg - midAngleDeg); // 195 -> 90
    } else {
      const f = Math.min(1, (targetPriceM - marketEstimateM) / (maxM - marketEstimateM));
      angleDeg = midAngleDeg - f * (midAngleDeg - endAngleDeg); // 90 -> -15
    }

    const rad = (angleDeg * Math.PI) / 180;
    const kx = cx + r * Math.cos(rad);
    const ky = cy - r * Math.sin(rad);

    // Caminho do arco azul:
    // Inicia em 195° e vai até o menor entre angleDeg e 90°
    const blueEndAngle = Math.max(angleDeg, midAngleDeg);
    const startRad = (startAngleDeg * Math.PI) / 180;
    const blueEndRad = (blueEndAngle * Math.PI) / 180;
    const x0 = cx + r * Math.cos(startRad);
    const y0 = cy - r * Math.sin(startRad);
    const x1 = cx + r * Math.cos(blueEndRad);
    const y1 = cy - r * Math.sin(blueEndRad);
    const blueSpan = startAngleDeg - blueEndAngle;
    const blueLargeArc = blueSpan > 180 ? 1 : 0;
    const bluePath = `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${blueLargeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;

    // Caminho do arco laranja (quando o preço está acima do mercado):
    let orangePath = '';
    if (angleDeg < midAngleDeg) {
      const midRad = (midAngleDeg * Math.PI) / 180;
      const mx = cx + r * Math.cos(midRad);
      const my = cy - r * Math.sin(midRad);
      const orangeSpan = midAngleDeg - angleDeg;
      const orangeLargeArc = orangeSpan > 180 ? 1 : 0;
      orangePath = `M ${mx.toFixed(2)} ${my.toFixed(2)} A ${r} ${r} 0 ${orangeLargeArc} 1 ${kx.toFixed(2)} ${ky.toFixed(2)}`;
    }

    const deltaK = Math.round((targetPriceM - marketEstimateM) * 1000);

    return {
      targetAngleDeg: angleDeg,
      knobX: kx,
      knobY: ky,
      blueArcPath: bluePath,
      orangeArcPath: orangePath,
      deltaMarketK: deltaK,
      isOverMarket: targetPriceM > marketEstimateM,
    };
  }, [targetPriceM, minM, maxM, marketEstimateM]);

  // Caminho do trilho de fundo completo (195° até -15°)
  const backgroundTrackPath = useMemo(() => {
    const sRad = (startAngleDeg * Math.PI) / 180;
    const eRad = (endAngleDeg * Math.PI) / 180;
    const sx = cx + r * Math.cos(sRad);
    const sy = cy - r * Math.sin(sRad);
    const ex = cx + r * Math.cos(eRad);
    const ey = cy - r * Math.sin(eRad);
    // Span total = 210° (> 180, logo largeArcFlag = 1)
    return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  }, [cx, cy, r]);

  const isHighRisk = targetPriceM > 1.22;
  const isFairPrice = targetPriceM >= 1.15 && targetPriceM <= 1.22;
  const statusLabel = isHighRisk ? 'High risk' : isFairPrice ? 'Fair price' : 'Below market';

  return (
    <div className={`flex flex-col items-center justify-center relative select-none ${className}`}>
      {/* INDICADOR DELTA DO TOPO (+-$55K) */}
      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 tracking-tight">
        {deltaMarketK >= 0 ? `+$${deltaMarketK}K` : `-$${Math.abs(deltaMarketK)}K`}
      </div>

      <div className="relative w-[280px] h-[165px] flex items-center justify-center overflow-visible">
        <svg
          viewBox="0 0 280 165"
          className="w-full h-full overflow-visible"
          aria-hidden
        >
          {/* TRILHO DE FUNDO CINZA CLARO */}
          <path
            d={backgroundTrackPath}
            fill="none"
            stroke="#ebf1f7"
            strokeWidth="14"
            strokeLinecap="round"
            className="dark:stroke-slate-800"
          />

          {/* ARCO AZUL (BASE ATÉ MERCADO OU PREÇO) */}
          <path
            d={blueArcPath}
            fill="none"
            stroke="#2f5bea"
            strokeWidth="14"
            strokeLinecap={isOverMarket ? 'butt' : 'round'}
            className="transition-all duration-75"
          />

          {/* ARCO LARANJA (ZONA DE SOBREPREÇO) */}
          {orangeArcPath && (
            <path
              d={orangeArcPath}
              fill="none"
              stroke="#ff8a3d"
              strokeWidth="14"
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          )}

          {/* TICKS RADIAIS EXTERNOS SINCRONIZADOS */}
          <g strokeLinecap="round">
            {Array.from({ length: 43 }).map((_, i) => {
              const f = i / 42;
              const tickAngle = startAngleDeg - f * (startAngleDeg - endAngleDeg);
              const isMajor = i % 4 === 0;
              const r1 = r + 13;
              const r2 = r1 + (isMajor ? 8 : 4.5);
              const rad = (tickAngle * Math.PI) / 180;
              const x1 = cx + r1 * Math.cos(rad);
              const y1 = cy - r1 * Math.sin(rad);
              const x2 = cx + r2 * Math.cos(rad);
              const y2 = cy - r2 * Math.sin(rad);

              // Cores dos ticks: azul na primeira zona, laranja na zona de sobrepreço ativa, cinza no restante
              let strokeColor = '#cbd5e1';
              if (tickAngle >= targetAngleDeg) {
                strokeColor = tickAngle >= midAngleDeg ? '#2f5bea' : '#ff8a3d';
              }

              return (
                <line
                  key={i}
                  x1={x1.toFixed(1)}
                  y1={y1.toFixed(1)}
                  x2={x2.toFixed(1)}
                  y2={y2.toFixed(1)}
                  stroke={strokeColor}
                  strokeWidth={isMajor ? 2 : 1.2}
                  className="transition-colors duration-150"
                />
              );
            })}
          </g>

          {/* MARCADOR VERTICAL PRETO NO TOPO (12h / ESTIMATIVA DE MERCADO) */}
          <line
            x1={cx}
            y1={cy - r - 9}
            x2={cx}
            y2={cy - r + 9}
            stroke="#121722"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="dark:stroke-white"
          />

          {/* CURSOR BULLSEYE (ALVO COM ANEL BRANCO, BORDA ESCURA E PONTO CENTRAL) */}
          <circle
            cx={knobX.toFixed(2)}
            cy={knobY.toFixed(2)}
            r="8.5"
            fill="#ffffff"
            stroke="#121722"
            strokeWidth="3.5"
            className="shadow-md transition-all duration-75 dark:stroke-white dark:fill-[#121722]"
          />
          <circle
            cx={knobX.toFixed(2)}
            cy={knobY.toFixed(2)}
            r="3.2"
            fill="#121722"
            className="dark:fill-white"
          />
        </svg>

        {/* CONTEÚDO CENTRAL: TEXTO, PREÇO GRANDE E BADGE HIGH RISK */}
        <div className="absolute top-[52px] left-0 right-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-[#5f6878] dark:text-slate-400">
            Target home price
          </span>
          <span className="text-[36px] font-black text-[#121722] dark:text-white leading-tight tracking-tight mt-0.5">
            ${targetPriceM.toFixed(2)}M
          </span>
          <div className="mt-1">
            <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-[#fee2e2] text-[#ef4444] shadow-xs">
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LintelSemiCircularPriceGauge;
