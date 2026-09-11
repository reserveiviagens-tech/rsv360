'use client';

export function summarizeGuiasLocaisClient(): string {
  return 'Em breve';
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function GuiasLocaisEditor() {
  return (
    <div>
      <PanelTitle title="Guias" hint="Crie um guia para compartilhar dicas locais com os hóspedes." />
      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        MVP: estrutura salva no metadata. Editor rico de guias locais na fase 2.
      </p>
    </div>
  );
}
