'use client';

/** Card preview — no destructive delete in this phase. */
export function summarizeRemoverAnuncioClient(): string {
  return 'Pausar via Não anunciado';
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function RemoverAnuncioEditor() {
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
