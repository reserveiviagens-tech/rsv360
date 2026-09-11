'use client';

/** Card preview — fiscal cadastro is fase 2. */
export function summarizeImpostosClient(): string {
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

export function ImpostosEditor() {
  return (
    <div>
      <PanelTitle title="Impostos" hint="Adicione impostos que você precisa recolher." />
      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Cadastro fiscal completo (alíquota, isenções, registro) na fase 2.
      </p>
    </div>
  );
}
