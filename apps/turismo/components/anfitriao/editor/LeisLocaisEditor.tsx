'use client';

/** Card preview — informational MVP (no persisted field). */
export function summarizeLeisLocaisClient(): string {
  return 'Declarado nos Termos';
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}

export function LeisLocaisEditor() {
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
