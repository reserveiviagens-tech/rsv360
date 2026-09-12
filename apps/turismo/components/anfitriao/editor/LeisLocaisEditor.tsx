'use client';

import type { EditorMeta } from './editor-types';

export type LeisMeta = NonNullable<EditorMeta['leis']>;

export const LEIS_LICENCA_MAX = 40;
export const LEIS_ZONEAMENTO_MAX = 80;
export const LEIS_NOTAS_MAX = 500;

/** Card preview — mirrors server summarizeLeisLocais. */
export function summarizeLeisLocaisClient(
  leis: LeisMeta | null | undefined,
): string {
  if (!leis || typeof leis !== 'object') {
    return 'Adicionar informações';
  }

  if (leis.declaracaoAceita === true) {
    return 'Declaração aceita';
  }

  const licenca =
    typeof leis.licencaNumero === 'string' ? leis.licencaNumero.trim() : '';
  if (licenca) {
    return 'Licença cadastrada';
  }

  const zoneamento =
    typeof leis.zoneamento === 'string' ? leis.zoneamento.trim() : '';
  if (zoneamento) {
    return 'Zoneamento informado';
  }

  const hasNotas =
    typeof leis.notas === 'string' && leis.notas.trim().length > 0;
  if (hasNotas) {
    return 'Informações adicionais';
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

type LeisLocaisEditorProps = {
  value: LeisMeta;
  onChange: (next: LeisMeta) => void;
};

export function LeisLocaisEditor({ value, onChange }: LeisLocaisEditorProps) {
  function patch(next: Partial<LeisMeta>) {
    onChange({ ...value, ...next });
  }

  return (
    <div>
      <PanelTitle
        title="Leis locais"
        hint="Revise zoneamento, licenças e conformidade com as leis aplicáveis."
      />

      <div className="space-y-4">
        <label className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={Boolean(value.declaracaoAceita)}
            onChange={(e) => {
              const checked = e.target.checked;
              patch({ declaracaoAceita: checked ? true : undefined });
            }}
          />
          <span>
            Declaro que li e aceito os Termos da Reservei Viagens e que minha acomodação
            está em conformidade com as leis locais aplicáveis.
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Número da licença
          </span>
          <input
            type="text"
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={value.licencaNumero ?? ''}
            maxLength={LEIS_LICENCA_MAX}
            placeholder="Ex.: LIC-1234"
            onChange={(e) =>
              patch({
                licencaNumero: e.target.value || undefined,
              })
            }
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Zoneamento</span>
          <input
            type="text"
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={value.zoneamento ?? ''}
            maxLength={LEIS_ZONEAMENTO_MAX}
            placeholder="Ex.: Residencial, comercial misto"
            onChange={(e) =>
              patch({
                zoneamento: e.target.value || undefined,
              })
            }
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Notas</span>
          <textarea
            className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-2"
            value={value.notas ?? ''}
            maxLength={LEIS_NOTAS_MAX}
            placeholder="Informações adicionais (opcional)"
            onChange={(e) => patch({ notas: e.target.value || undefined })}
          />
        </label>
      </div>
    </div>
  );
}
