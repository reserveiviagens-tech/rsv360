'use client';

export const TIPO_PROPRIEDADE_TIPOS = [
  { id: 'apartamento', label: 'Apartamento' },
  { id: 'casa', label: 'Casa' },
  { id: 'condominio', label: 'Condomínio' },
  { id: 'studio', label: 'Studio' },
  { id: 'loft', label: 'Loft' },
  { id: 'chale', label: 'Chalé' },
  { id: 'kitnet', label: 'Kitnet' },
  { id: 'pousada', label: 'Pousada' },
  { id: 'outro', label: 'Outro' },
] as const;

export const TIPO_PROPRIEDADE_ACOMODACOES = [
  { id: 'espaco_inteiro', label: 'Espaço inteiro' },
  { id: 'quarto_privativo', label: 'Quarto privativo' },
  { id: 'quarto_compartilhado', label: 'Quarto compartilhado' },
] as const;

export type TipoPropriedadeForm = {
  representacao?: string;
  tipo?: string;
  acomodacao?: string;
  andares?: number;
  andar?: number;
  ano?: number;
  tamanhoM2?: number;
};

type Props = {
  value: TipoPropriedadeForm;
  onChange: (next: TipoPropriedadeForm) => void;
};

function numOrEmpty(v: number | undefined): string {
  return v == null || Number.isNaN(v) ? '' : String(v);
}

export function TipoPropriedadeEditor({ value, onChange }: Props) {
  const yearMax = new Date().getFullYear() + 2;

  function patch(partial: Partial<TipoPropriedadeForm>) {
    onChange({ ...value, ...partial });
  }

  function patchNumber(key: keyof TipoPropriedadeForm, raw: string) {
    if (raw.trim() === '') {
      const next = { ...value };
      delete next[key];
      onChange(next);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    patch({ [key]: n } as Partial<TipoPropriedadeForm>);
  }

  const previewTipo = TIPO_PROPRIEDADE_TIPOS.find((t) => t.id === value.tipo)?.label;
  const previewAco = TIPO_PROPRIEDADE_ACOMODACOES.find(
    (t) => t.id === (value.acomodacao || value.representacao),
  )?.label;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Tipo de propriedade</h2>
        <p className="mt-1 text-sm text-slate-500">
          Defina o tipo do imóvel, como os hóspedes se acomodam e detalhes do prédio.
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-900">Tipo</span>
        <span className="mt-0.5 block text-xs text-slate-500">Apartamento, casa, loft…</span>
        <select
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          value={value.tipo ?? ''}
          onChange={(e) => patch({ tipo: e.target.value || undefined })}
        >
          <option value="">Selecionar…</option>
          {TIPO_PROPRIEDADE_TIPOS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-900">Acomodação</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          O que os hóspedes reservam (espaço inteiro ou quarto)
        </span>
        <select
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          value={value.acomodacao ?? ''}
          onChange={(e) => {
            const acomodacao = e.target.value || undefined;
            patch({
              acomodacao,
              // keep representacao aligned when empty / same family
              representacao: value.representacao || acomodacao,
            });
          }}
        >
          <option value="">Selecionar…</option>
          {TIPO_PROPRIEDADE_ACOMODACOES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-900">Representação do espaço</span>
        <span className="mt-0.5 block text-xs text-slate-500">Como o anúncio apresenta o espaço</span>
        <select
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          value={value.representacao ?? ''}
          onChange={(e) => patch({ representacao: e.target.value || undefined })}
        >
          <option value="">Selecionar…</option>
          {TIPO_PROPRIEDADE_ACOMODACOES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-900">Andares do prédio</span>
          <input
            type="number"
            min={1}
            max={200}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={numOrEmpty(value.andares)}
            onChange={(e) => patchNumber('andares', e.target.value)}
            placeholder="Ex.: 12"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-900">Andar</span>
          <input
            type="number"
            min={-5}
            max={200}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={numOrEmpty(value.andar)}
            onChange={(e) => patchNumber('andar', e.target.value)}
            placeholder="Ex.: 3"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-900">Ano</span>
          <input
            type="number"
            min={1800}
            max={yearMax}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={numOrEmpty(value.ano)}
            onChange={(e) => patchNumber('ano', e.target.value)}
            placeholder={`Ex.: ${yearMax - 5}`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-900">Tamanho (m²)</span>
          <input
            type="number"
            min={1}
            max={100000}
            step={0.01}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={numOrEmpty(value.tamanhoM2)}
            onChange={(e) => patchNumber('tamanhoM2', e.target.value)}
            placeholder="Ex.: 68"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prévia</p>
        <p className="mt-2 font-semibold text-slate-900">
          {[previewTipo, previewAco, value.tamanhoM2 != null ? `${value.tamanhoM2} m²` : null]
            .filter(Boolean)
            .join(' · ') || 'Preencha o tipo de propriedade'}
        </p>
        {(value.andar != null || value.andares != null || value.ano != null) && (
          <p className="mt-1 text-xs text-slate-500">
            {[
              value.andar != null ? `Andar ${value.andar}` : null,
              value.andares != null ? `${value.andares} andares` : null,
              value.ano != null ? `Ano ${value.ano}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}
