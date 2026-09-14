/**
 * RSV360 PMS/CRM — Reservei Viagens
 * Copyright (c) 2024-2026 Reservei Viagens LTDA. Todos os direitos reservados.
 * Desenvolvido por Douglas P. Figueiredo <douglas@reserveiviagens.com.br>
 * @author Douglas P. Figueiredo
 * @license UNLICENSED
 */
/** Visual stand-in only — not a scannable QR (Aruanda C2). */
export function QRCodePlaceholder({ code }: { code: string }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4" role="img" aria-label="QR code placeholder">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-amber-950">
        Placeholder — não é um QR válido
      </p>
      <div className="grid grid-cols-6 gap-1" aria-hidden>
        {Array.from({ length: 36 }, (_, index) => (
          <div
            key={index}
            className={`aspect-square rounded-[2px] ${index % 3 === 0 || index % 7 === 0 ? 'bg-slate-900' : 'bg-white'}`}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-slate-600">Código de referência: {code}</p>
    </div>
  );
}
