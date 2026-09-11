'use client';

/** Card preview — mirrors server summarizeRequisitos. */
export function summarizeRequisitosClient(exigirFotoPerfil: boolean): string {
  return exigirFotoPerfil ? 'Foto de perfil exigida' : 'Requisitos padrão';
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

export function RequisitosHospedeEditor({ value, onChange }: Props) {
  return (
    <div>
      <PanelTitle title="Requisitos do hóspede" />
      <label className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
        <span>Exigir foto de perfil</span>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>E-mail e telefone confirmados</li>
        <li>Informações de pagamento</li>
        <li>Concordar com as Regras da Casa</li>
      </ul>
    </div>
  );
}
