'use client';

import { useEffect, useState } from 'react';
import type { EditorMeta } from './editor-types';

export type LocalizacaoValue = NonNullable<EditorMeta['localizacao']>;

export const LOCALIZACAO_CARACTERISTICAS = [
  { id: 'praia', label: 'Perto da praia' },
  { id: 'centro', label: 'Centro da cidade' },
  { id: 'rural', label: 'Área rural / campo' },
  { id: 'montanha', label: 'Montanha' },
  { id: 'lago', label: 'Perto de lago / rio' },
  { id: 'transporte', label: 'Fácil acesso a transporte público' },
  { id: 'comercio', label: 'Comércio e serviços próximos' },
  { id: 'natureza', label: 'Contato com a natureza' },
] as const;

export const LOCALIZACAO_VISTAS = [
  { id: 'mar', label: 'Vista para o mar' },
  { id: 'montanha', label: 'Vista para montanhas' },
  { id: 'cidade', label: 'Vista da cidade' },
  { id: 'jardim', label: 'Vista para jardim' },
  { id: 'piscina', label: 'Vista para piscina' },
  { id: 'lago', label: 'Vista para lago / rio' },
  { id: 'campo', label: 'Vista para o campo' },
] as const;

export const LOCALIZACAO_TEXTO_LONGO_MAX = 1000;

type SubKey =
  | 'endereco'
  | 'compartilhamento'
  | 'caracteristicas'
  | 'bairro'
  | 'locomocao'
  | 'vistas';

const SUBS: Array<{ id: SubKey; title: string; hint: string }> = [
  { id: 'endereco', title: 'Endereço', hint: 'Rua, apto, bairro, cidade, UF e CEP' },
  {
    id: 'compartilhamento',
    title: 'Compartilhamento no anúncio',
    hint: 'Mostrar ou aproximar a localização no mapa público',
  },
  { id: 'caracteristicas', title: 'Características da região', hint: 'O que torna o entorno especial' },
  { id: 'bairro', title: 'Descrição do bairro', hint: 'Contexto para o hóspede' },
  { id: 'locomocao', title: 'Locomoção', hint: 'Como chegar e se deslocar' },
  { id: 'vistas', title: 'Vistas', hint: 'O que se vê do espaço' },
];

type Props = {
  value: LocalizacaoValue;
  onChange: (next: LocalizacaoValue) => void;
};

export function summarizeLocalizacaoClient(value: LocalizacaoValue): string | null {
  const cidade = String(value.cidade ?? '').trim();
  const uf = String(value.uf ?? '').trim();
  const endereco = String(value.endereco ?? '').trim();
  const nCar = Array.isArray(value.caracteristicas) ? value.caracteristicas.length : 0;
  const nVis = Array.isArray(value.vistas) ? value.vistas.length : 0;
  if (cidade && uf) {
    const extra = nCar || nVis ? ` · ${nCar + nVis} detalhe${nCar + nVis === 1 ? '' : 's'}` : '';
    return `${cidade}, ${uf}${extra}`;
  }
  if (endereco) return endereco.length <= 72 ? endereco : `${endereco.slice(0, 71)}…`;
  if (nCar || nVis) return `${nCar} característica(s) · ${nVis} vista(s)`;
  return null;
}

function snippet(text: string | undefined, empty = 'Adicionar'): string {
  const t = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return empty;
  return t.length <= 72 ? t : `${t.slice(0, 71)}…`;
}

function toggleId(list: string[] | undefined, id: string): string[] {
  const cur = Array.isArray(list) ? [...list] : [];
  const i = cur.indexOf(id);
  if (i >= 0) cur.splice(i, 1);
  else cur.push(id);
  return cur;
}

function TextEditor({
  title,
  hint,
  max,
  initial,
  onCancel,
  onSave,
}: {
  title: string;
  hint: string;
  max: number;
  initial: string;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(initial.slice(0, max));
  const dirty = draft !== initial;

  useEffect(() => {
    setDraft(initial.slice(0, max));
  }, [initial, max]);

  return (
    <div className="flex min-h-[420px] flex-col space-y-4">
      <button
        type="button"
        className="self-start text-sm font-medium text-slate-600 hover:text-slate-900"
        onClick={onCancel}
      >
        ← Voltar
      </button>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{hint}</p>
      </div>
      <textarea
        className="min-h-[220px] w-full flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none ring-slate-900 focus:ring-2"
        value={draft}
        maxLength={max}
        onChange={(e) => setDraft(e.target.value.slice(0, max))}
        aria-label={title}
      />
      <p className={`text-xs ${draft.length >= max ? 'font-medium text-amber-700' : 'text-slate-500'}`}>
        {draft.length}/{max} disponíveis
      </p>
      <div className="mt-auto flex gap-2 pt-2">
        <button
          type="button"
          className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!dirty}
          className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => onSave(draft)}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

export function LocalizacaoEditor({ value, onChange }: Props) {
  const [sub, setSub] = useState<SubKey | null>(null);

  if (sub === 'endereco') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
          onClick={() => setSub(null)}
        >
          ← Voltar
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Endereço</h2>
        {(
          [
            ['endereco', 'Endereço'],
            ['apto', 'Apto / unidade'],
            ['bairro', 'Bairro'],
            ['cidade', 'Cidade'],
            ['uf', 'UF'],
            ['cep', 'CEP'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={value[key] ?? ''}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              aria-label={label}
            />
          </label>
        ))}
      </div>
    );
  }

  if (sub === 'compartilhamento') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
          onClick={() => setSub(null)}
        >
          ← Voltar
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Compartilhamento no anúncio</h2>
        <p className="text-sm text-slate-500">
          Se desmarcado, o anúncio público mostra apenas uma localização aproximada (sem endereço
          completo).
        </p>
        <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <span>Mostrar localização exata</span>
          <input
            type="checkbox"
            checked={Boolean(value.mostrarExata)}
            onChange={(e) => onChange({ ...value, mostrarExata: e.target.checked })}
          />
        </label>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-medium">Pin do anúncio</p>
          <p className="text-xs text-slate-500">
            Necessário para verificação pelo navegador. Use no endereço da propriedade.
          </p>
          {value.lat != null && value.lng != null ? (
            <p className="mt-2 text-xs text-teal-800">Pin definido · salve o anúncio para persistir</p>
          ) : (
            <p className="mt-2 text-xs text-amber-800">Pin ainda não definido</p>
          )}
          <PinGpsButton
            disabled={false}
            onCaptured={(lat, lng) => onChange({ ...value, lat, lng })}
          />
        </div>
        <div
          className="flex h-40 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500"
          aria-hidden
        >
          Pré-visualização do mapa (em breve)
        </div>
      </div>
    );
  }

  if (sub === 'caracteristicas') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
          onClick={() => setSub(null)}
        >
          ← Voltar
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Características da região</h2>
        <ul className="space-y-2">
          {LOCALIZACAO_CARACTERISTICAS.map((c) => {
            const on = (value.caracteristicas ?? []).includes(c.id);
            return (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <span>{c.label}</span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      onChange({
                        ...value,
                        caracteristicas: toggleId(value.caracteristicas, c.id),
                      })
                    }
                  />
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (sub === 'vistas') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
          onClick={() => setSub(null)}
        >
          ← Voltar
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Vistas</h2>
        <ul className="space-y-2">
          {LOCALIZACAO_VISTAS.map((c) => {
            const on = (value.vistas ?? []).includes(c.id);
            return (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <span>{c.label}</span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      onChange({
                        ...value,
                        vistas: toggleId(value.vistas, c.id),
                      })
                    }
                  />
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (sub === 'bairro') {
    return (
      <TextEditor
        title="Descrição do bairro"
        hint="Conte o que o hóspede encontra por perto"
        max={LOCALIZACAO_TEXTO_LONGO_MAX}
        initial={value.descricaoBairro ?? ''}
        onCancel={() => setSub(null)}
        onSave={(v) => {
          onChange({ ...value, descricaoBairro: v });
          setSub(null);
        }}
      />
    );
  }

  if (sub === 'locomocao') {
    return (
      <TextEditor
        title="Locomoção"
        hint="Como chegar e se deslocar na região"
        max={LOCALIZACAO_TEXTO_LONGO_MAX}
        initial={value.locomocao ?? ''}
        onCancel={() => setSub(null)}
        onSave={(v) => {
          onChange({ ...value, locomocao: v });
          setSub(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Localização</h2>
        <p className="mt-1 text-sm text-slate-500">
          Endereço, compartilhamento, região, bairro, locomoção e vistas
        </p>
      </div>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {SUBS.map((s) => {
          let summary = 'Adicionar';
          if (s.id === 'endereco') {
            summary = snippet(
              [value.endereco, value.bairro, value.cidade, value.uf].filter(Boolean).join(' · '),
            );
          } else if (s.id === 'compartilhamento') {
            summary = value.mostrarExata ? 'Localização exata' : 'Aproximada no anúncio';
          } else if (s.id === 'caracteristicas') {
            const n = value.caracteristicas?.length ?? 0;
            summary = n ? `${n} selecionada(s)` : 'Adicionar';
          } else if (s.id === 'bairro') {
            summary = snippet(value.descricaoBairro);
          } else if (s.id === 'locomocao') {
            summary = snippet(value.locomocao);
          } else if (s.id === 'vistas') {
            const n = value.vistas?.length ?? 0;
            summary = n ? `${n} selecionada(s)` : 'Adicionar';
          }
          return (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => setSub(s.id)}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{s.hint}</span>
                  <span className="mt-1 block text-xs text-slate-600">{summary}</span>
                </span>
                <span className="text-slate-400" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PinGpsButton({
  disabled,
  onCaptured,
}: {
  disabled: boolean;
  onCaptured: (lat: number, lng: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function capture() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErr('Geolocalização não disponível neste navegador.');
      return;
    }
    setErr(null);
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        onCaptured(
          Math.round(pos.coords.latitude * 1e6) / 1e6,
          Math.round(pos.coords.longitude * 1e6) / 1e6,
        );
      },
      () => {
        setLoading(false);
        setErr('Não foi possível obter o pin. Permita a localização e tente novamente.');
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-40"
        disabled={disabled || loading}
        onClick={capture}
      >
        {loading ? 'Obtendo pin…' : 'Usar minha localização como pin'}
      </button>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
    </div>
  );
}
