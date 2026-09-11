'use client';

/** Card preview — mirrors server summarizeIdiomas. */
export function summarizeIdiomasClient(idiomas: string[] | null | undefined): string {
  const list = Array.isArray(idiomas) && idiomas.length > 0 ? idiomas : ['Português'];
  if (list.length === 1 && list[0]?.toLowerCase() === 'português') {
    return 'Português';
  }
  return `${list.length} idiomas`;
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}

export function IdiomasEditor() {
  return (
    <div>
      <PanelTitle title="Idiomas" />
      <p className="text-sm">Português (padrão)</p>
      <p className="mt-2 text-xs text-slate-500">
        Hóspedes podem ver traduções automáticas de outros campos.
      </p>
    </div>
  );
}
