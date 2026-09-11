'use client';

import type { EditorMeta } from './editor-types';

export type ImpostosMeta = NonNullable<EditorMeta['impostos']>;

export const IMPOSTOS_INSCRICAO_MAX = 40;
export const IMPOSTOS_NOTAS_MAX = 500;
const IMPOSTOS_CNPJ_LEN = 14;

/** LGPD-safe preview — mirrors server maskCnpj. */
export function maskCnpjClient(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length !== IMPOSTOS_CNPJ_LEN) {
    return '**.***.***/****-**';
  }
  return `**.***.***/****-${d.slice(12)}`;
}

function formatCnpjInput(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, IMPOSTOS_CNPJ_LEN);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Card preview — mirrors server summarizeImpostos. */
export function summarizeImpostosClient(
  impostos: ImpostosMeta | null | undefined,
): string {
  if (!impostos || typeof impostos !== 'object') {
    return 'Adicionar informações';
  }

  if (impostos.isento === true) {
    return 'Isento';
  }

  if (
    typeof impostos.aliquotaPct === 'number' &&
    Number.isFinite(impostos.aliquotaPct)
  ) {
    const rounded = Math.round(impostos.aliquotaPct * 100) / 100;
    const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
    return `${text}%`;
  }

  const inscricao =
    typeof impostos.inscricaoMunicipal === 'string'
      ? impostos.inscricaoMunicipal.trim()
      : '';

  if (inscricao) {
    return 'Inscrição cadastrada';
  }

  const cnpj =
    typeof impostos.cnpj === 'string' ? impostos.cnpj.replace(/\D/g, '') : '';
  if (cnpj.length === IMPOSTOS_CNPJ_LEN) {
    return `CNPJ ${maskCnpjClient(cnpj)}`;
  }

  return 'Adicionar informações';
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

type ImpostosEditorProps = {
  value: ImpostosMeta;
  onChange: (next: ImpostosMeta) => void;
};

export function ImpostosEditor({ value, onChange }: ImpostosEditorProps) {
  const isento = Boolean(value.isento);

  function patch(next: Partial<ImpostosMeta>) {
    onChange({ ...value, ...next });
  }

  return (
    <div>
      <PanelTitle
        title="Impostos"
        hint="Adicione impostos que você precisa recolher."
      />

      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">CNPJ</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={formatCnpjInput(value.cnpj ?? '')}
            placeholder="00.000.000/0000-00"
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, IMPOSTOS_CNPJ_LEN);
              patch({ cnpj: digits || undefined });
            }}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Inscrição municipal
          </span>
          <input
            type="text"
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={value.inscricaoMunicipal ?? ''}
            maxLength={IMPOSTOS_INSCRICAO_MAX}
            placeholder="Ex.: IM-1234"
            onChange={(e) =>
              patch({
                inscricaoMunicipal: e.target.value || undefined,
              })
            }
          />
        </label>

        <label className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
          <span>Isento de recolhimento</span>
          <input
            type="checkbox"
            checked={isento}
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked) {
                const { aliquotaPct: _omit, ...rest } = value;
                onChange({ ...rest, isento: true });
              } else {
                patch({ isento: undefined });
              }
            }}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Alíquota (%)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            disabled={isento}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
            value={isento ? '' : value.aliquotaPct ?? ''}
            placeholder="0–100"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                patch({ aliquotaPct: undefined });
                return;
              }
              const n = Number(raw.replace(',', '.'));
              patch({ aliquotaPct: Number.isFinite(n) ? n : undefined });
            }}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Notas</span>
          <textarea
            className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-2"
            value={value.notas ?? ''}
            maxLength={IMPOSTOS_NOTAS_MAX}
            placeholder="Informações adicionais (opcional)"
            onChange={(e) => patch({ notas: e.target.value || undefined })}
          />
        </label>
      </div>
    </div>
  );
}
