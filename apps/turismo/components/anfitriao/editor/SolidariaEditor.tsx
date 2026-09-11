'use client';

/** Card preview — mirrors server summarizeSolidaria. */
export function summarizeSolidariaClient(hospedagemSolidaria: boolean): string {
  return hospedagemSolidaria ? 'Ativa' : 'Desligada';
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}

type Props = {
  value: boolean;
  onChange: (next: boolean) => void;
};

export function SolidariaEditor({ value, onChange }: Props) {
  return (
    <div>
      <PanelTitle title="Hospedagem solidária" />
      <label className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
        <span>Disponível com desconto ou cortesia para parceiros verificados</span>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    </div>
  );
}
