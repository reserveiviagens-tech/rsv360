'use client';

import { useEffect, useRef, useState } from 'react';
import { useUploadAcessibilidadeFoto } from '@/hooks/useAnfitriao';

export const ACESSIBILIDADE_CATALOG = [
  {
    id: 'vaga-pcd',
    label: 'Vaga no estacionamento para pessoas com deficiência',
    icon: '🅿️',
    hint: 'Vaga com largura adequada e sinalização.',
    criterio:
      'A vaga deve ter pelo menos 3,35 m de largura (incluindo área de transferência) e sinalização visível.',
    oQueFotografar:
      'Fotografe a vaga inteira, a sinalização no chão/placa e o caminho até a entrada.',
    exemplos: ['Largura total da vaga', 'Placa ou pintura PCD', 'Acesso nível à entrada'],
  },
  {
    id: 'caminho-iluminado',
    label: 'Caminho iluminado até a entrada dos hóspedes',
    icon: '💡',
    hint: 'Iluminação contínua do estacionamento até a porta.',
    criterio:
      'O caminho deve estar bem iluminado à noite, sem trechos escuros entre o estacionamento/rua e a entrada.',
    oQueFotografar: 'Mostre o trajeto com as luminárias acesas (preferencialmente à noite).',
    exemplos: ['Início do caminho', 'Meio do trajeto iluminado', 'Chegada na porta'],
  },
  {
    id: 'sem-degraus',
    label: 'Acesso sem degraus',
    icon: '♿',
    hint: 'Entrada sem degraus ou com rampa.',
    criterio:
      'Entrada acessível sem degraus, ou com rampa com inclinação adequada para cadeira de rodas.',
    oQueFotografar: 'Fotografe a entrada de frente e de lado, mostrando o piso contínuo ou a rampa.',
    exemplos: ['Vista frontal da entrada', 'Piso contínuo / rampa', 'Largura do vão'],
  },
  {
    id: 'entrada-larga',
    label: 'Entrada para os hóspedes possui mais de 81 cm de largura',
    icon: '🚪',
    hint: 'Vão livre da porta de entrada.',
    criterio: 'O vão livre da porta de entrada dos hóspedes deve ter mais de 81 cm de largura.',
    oQueFotografar: 'Fotografe a porta aberta com uma fita métrica visível na largura do vão.',
    exemplos: ['Porta aberta', 'Medição do vão', 'Acesso do corredor'],
  },
  {
    id: 'guincho-piscina',
    label: 'Guincho para piscina ou banheira de hidromassagem',
    icon: '🏊',
    hint: 'Equipamento de transferência aquática.',
    criterio:
      'Guincho ou equipamento equivalente que permita transferência segura para piscina ou hidromassagem.',
    oQueFotografar: 'Mostre o equipamento instalado e a área de transferência na água.',
    exemplos: ['Guincho instalado', 'Área de transferência', 'Acesso à beira d’água'],
  },
  {
    id: 'guincho-transferencia',
    label: 'Guincho de transferência móvel ou fixado no teto',
    icon: '🛏️',
    hint: 'Ajuda na transferência cama/banho.',
    criterio:
      'Guincho móvel ou de teto disponível para transferência entre cama, cadeira e banheiro.',
    oQueFotografar: 'Fotografe o guincho e o ambiente onde ele é usado (quarto/banho).',
    exemplos: ['Equipamento', 'Trilho ou base', 'Espaço de manobra'],
  },
] as const;

export type AcessibilidadeFotoStatus =
  | 'pendente'
  | 'em_revisao'
  | 'publicado'
  | 'rejeitado';

export type AcessibilidadeFoto = {
  url: string;
  status: AcessibilidadeFotoStatus;
  enviadoEm?: string;
  publicadoEm?: string;
};

export type AcessibilidadeItem = {
  id: string;
  possui: boolean | null;
  fotos: AcessibilidadeFoto[];
};

type Props = {
  unitId: number;
  items: AcessibilidadeItem[];
  onChange: (items: AcessibilidadeItem[]) => void;
};

const STATUS_LABEL: Record<AcessibilidadeFotoStatus, string> = {
  pendente: 'Pendente',
  em_revisao: 'Em revisão',
  publicado: 'Publicada',
  rejeitado: 'Rejeitada',
};

function normalizeFoto(raw: unknown): AcessibilidadeFoto | null {
  if (typeof raw === 'string' && raw.trim()) {
    return { url: raw.trim(), status: 'pendente' };
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const url = typeof o.url === 'string' ? o.url.trim() : '';
  if (!url) return null;
  const s = String(o.status ?? 'pendente');
  const status: AcessibilidadeFotoStatus =
    s === 'em_revisao' || s === 'publicado' || s === 'rejeitado' || s === 'pendente'
      ? s
      : 'pendente';
  return {
    url,
    status,
    ...(typeof o.enviadoEm === 'string' ? { enviadoEm: o.enviadoEm } : {}),
    ...(typeof o.publicadoEm === 'string' ? { publicadoEm: o.publicadoEm } : {}),
  };
}

export function normalizeAcessibilidadeItems(
  items: Array<{ id: string; possui: boolean | null; fotos?: unknown }> | undefined,
): AcessibilidadeItem[] {
  const map = new Map(
    (items ?? []).map((i) => {
      const fotos = Array.isArray(i.fotos)
        ? i.fotos.map(normalizeFoto).filter((f): f is AcessibilidadeFoto => Boolean(f))
        : [];
      return [i.id, { id: i.id, possui: i.possui, fotos } as AcessibilidadeItem];
    }),
  );
  return ACESSIBILIDADE_CATALOG.map((c) => {
    const cur = map.get(c.id);
    return cur ?? { id: c.id, possui: null, fotos: [] };
  });
}

export function summarizeAcessibilidadeClient(items: AcessibilidadeItem[]): string {
  const missingPhotos = items.filter((i) => i.possui === true && i.fotos.length === 0).length;
  if (missingPhotos > 0) return 'Obrigatório: adicione novas fotos';
  const waiting = items.reduce(
    (n, i) =>
      n + i.fotos.filter((f) => f.status === 'pendente' || f.status === 'em_revisao').length,
    0,
  );
  if (waiting > 0) return `${waiting} foto(s) em revisão`;
  const pub = items.reduce(
    (n, i) => n + i.fotos.filter((f) => f.status === 'publicado').length,
    0,
  );
  if (pub > 0) return `${pub} foto(s) publicadas`;
  const informed = items.filter((i) => i.possui != null).length;
  return informed > 0 ? `${informed} recurso(s) informados` : 'Adicionar informações';
}

function cloneItem(item: AcessibilidadeItem): AcessibilidadeItem {
  return {
    id: item.id,
    possui: item.possui,
    fotos: item.fotos.map((f) => ({ ...f })),
  };
}

function sameItem(a: AcessibilidadeItem, b: AcessibilidadeItem): boolean {
  if (a.possui !== b.possui || a.fotos.length !== b.fotos.length) return false;
  return a.fotos.every(
    (f, i) =>
      f.url === b.fotos[i]?.url &&
      f.status === b.fotos[i]?.status &&
      f.enviadoEm === b.fotos[i]?.enviadoEm &&
      f.publicadoEm === b.fotos[i]?.publicadoEm,
  );
}

function RecursoEditor({
  unitId,
  catalog,
  initial,
  onCancel,
  onSave,
}: {
  unitId: number;
  catalog: (typeof ACESSIBILIDADE_CATALOG)[number];
  initial: AcessibilidadeItem;
  onCancel: () => void;
  onSave: (next: AcessibilidadeItem) => void;
}) {
  const [draft, setDraft] = useState(() => cloneItem(initial));
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAcessibilidadeFoto(unitId);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraft(cloneItem(initial));
    setErr(null);
    setMsg(null);
  }, [initial.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset when resource changes

  const dirty = !sameItem(draft, initial);
  const needsPhotos = draft.possui === true && draft.fotos.length === 0;
  const canSave = dirty && !needsPhotos && draft.possui != null;
  const pendentes = draft.fotos.filter(
    (f) => f.status === 'pendente' || f.status === 'rejeitado',
  ).length;
  const emRevisao = draft.fotos.filter((f) => f.status === 'em_revisao').length;
  const publicadas = draft.fotos.filter((f) => f.status === 'publicado').length;

  async function onFile(file: File | null) {
    if (!file) return;
    setErr(null);
    setMsg(null);
    try {
      const res = await upload.mutateAsync(file);
      const absolute = res.data?.url;
      if (!absolute) throw new Error('Upload sem URL');
      setDraft((prev) => ({
        ...prev,
        possui: true,
        fotos: [...prev.fotos, { url: absolute, status: 'pendente' }],
      }));
      setMsg('Foto enviada. Conclua a revisão e salve o recurso.');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex min-h-[480px] flex-col space-y-4">
      <button
        type="button"
        className="self-start text-sm font-medium text-slate-600 hover:text-slate-900"
        onClick={onCancel}
      >
        ← Voltar
      </button>

      <div>
        <h2 className="text-2xl font-bold text-slate-900">{catalog.label}</h2>
        <p className="mt-2 text-sm text-slate-600">{catalog.criterio}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exemplos</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {catalog.exemplos.map((ex) => (
            <div
              key={ex}
              className="flex h-24 w-36 shrink-0 flex-col justify-end rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 p-2"
            >
              <span className="text-[10px] font-medium leading-tight text-slate-700">{ex}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">
          <span className="font-medium text-slate-800">Orientações para fotos: </span>
          enquadre o recurso completo, inclua medições quando couber e prefira boa iluminação.
          Revise as fotos originais antes de enviar.
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setDraft((p) => ({ ...p, possui: false, fotos: [] }))}
          className={`w-full rounded-2xl border p-4 text-left text-sm transition ${
            draft.possui === false
              ? 'border-slate-900 ring-2 ring-slate-900'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="font-semibold text-slate-900">Eu não tenho esse recurso</span>
        </button>
        <button
          type="button"
          onClick={() => setDraft((p) => ({ ...p, possui: true }))}
          className={`w-full rounded-2xl border p-4 text-left text-sm transition ${
            draft.possui === true
              ? 'border-slate-900 ring-2 ring-slate-900'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="font-semibold text-slate-900">Eu tenho esse recurso</span>
        </button>
      </div>

      {draft.possui === true && (
        <div className="rounded-2xl border border-slate-200 p-4">
          {needsPhotos && (
            <p className="mb-2 text-sm font-medium text-red-600">
              Obrigatório: adicione novas fotos
            </p>
          )}
          <p className="text-sm text-slate-600">{catalog.oQueFotografar}</p>
          <p className="mt-2 text-xs text-slate-500">
            As fotos passam por revisão antes de entrar no anúncio público.
          </p>

          {draft.fotos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {draft.fotos.map((foto) => (
                <div key={foto.url} className="w-28">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.url}
                    alt=""
                    className="h-20 w-28 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                  <p className="mt-1 text-[10px] font-medium text-slate-600">
                    {STATUS_LABEL[foto.status]}
                  </p>
                  <button
                    type="button"
                    className="mt-0.5 text-left text-[10px] text-red-600 underline"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        fotos: p.fotos.filter((f) => f.url !== foto.url),
                      }))
                    }
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="mt-3 flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-400 px-4 py-8 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            <span aria-hidden className="text-2xl">
              📷
            </span>
            {upload.isPending ? 'Enviando…' : 'Adicione fotos'}
          </button>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              disabled={pendentes === 0}
              onClick={() => {
                const now = new Date().toISOString();
                setDraft((p) => ({
                  ...p,
                  fotos: p.fotos.map((f) =>
                    f.status === 'pendente' || f.status === 'rejeitado'
                      ? { ...f, status: 'em_revisao', enviadoEm: now }
                      : f,
                  ),
                }));
                setMsg('Fotos marcadas para revisão.');
              }}
            >
              Enviar para revisão ({pendentes})
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-40"
              disabled={emRevisao === 0 && pendentes === 0}
              onClick={() => {
                const now = new Date().toISOString();
                setDraft((p) => ({
                  ...p,
                  fotos: p.fotos.map((f) =>
                    f.status === 'em_revisao' || f.status === 'pendente'
                      ? { ...f, status: 'publicado', publicadoEm: now }
                      : f,
                  ),
                }));
                setMsg('Fotos publicadas no rascunho — salve para persistir.');
              }}
            >
              Publicar no anúncio
              {emRevisao + pendentes > 0 ? ` (${emRevisao + pendentes})` : ''}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {publicadas} publicada(s) · {emRevisao} em revisão · {pendentes} pendente(s)
          </p>
        </div>
      )}

      {msg && <p className="text-sm text-teal-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="mt-auto flex gap-2 pt-2">
        <button
          type="button"
          className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-800"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canSave}
          className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onSave(draft)}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

export function AcessibilidadeEditor({ unitId, items, onChange }: Props) {
  const normalized = normalizeAcessibilidadeItems(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = normalized.find((i) => i.id === activeId) ?? null;
  const catalog = ACESSIBILIDADE_CATALOG.find((c) => c.id === activeId);

  if (active && catalog) {
    return (
      <RecursoEditor
        unitId={unitId}
        catalog={catalog}
        initial={active}
        onCancel={() => setActiveId(null)}
        onSave={(next) => {
          onChange(
            normalizeAcessibilidadeItems(
              normalized.map((i) => (i.id === next.id ? next : i)),
            ),
          );
          setActiveId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Recursos de acessibilidade</h2>
        <p className="mt-1 text-sm text-slate-500">
          Informe o que seu espaço oferece e anexe fotos para revisão.
        </p>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
        {ACESSIBILIDADE_CATALOG.map((c) => {
          const item = normalized.find((i) => i.id === c.id)!;
          const missing = item.possui === true && item.fotos.length === 0;
          const awaiting = item.fotos.filter(
            (f) => f.status === 'pendente' || f.status === 'em_revisao',
          ).length;
          const published = item.fotos.filter((f) => f.status === 'publicado').length;
          return (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
                onClick={() => setActiveId(c.id)}
              >
                <span className="flex min-w-0 items-start gap-3">
                  <span className="text-xl" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{c.label}</span>
                    {missing && (
                      <span className="mt-0.5 block text-xs font-medium text-red-600">
                        Obrigatório: adicione novas fotos
                      </span>
                    )}
                    {item.possui === true && !missing && awaiting > 0 && (
                      <span className="mt-0.5 block text-xs font-medium text-amber-700">
                        {awaiting} foto(s) aguardando revisão/publicação
                      </span>
                    )}
                    {item.possui === true && !missing && awaiting === 0 && (
                      <span className="mt-0.5 block text-xs text-teal-700">
                        {published > 0
                          ? `Publicado · ${published} foto(s)`
                          : `Configurado · ${item.fotos.length} foto(s)`}
                      </span>
                    )}
                    {item.possui === false && (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Não tenho este recurso
                      </span>
                    )}
                    {item.possui == null && (
                      <span className="mt-0.5 block text-xs text-slate-400">Não informado</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-slate-400" aria-hidden>
                  {item.possui != null ? '✎' : '+'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span aria-hidden>💡</span> Dicas
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
          <li>Recursos marcados como “tenho” exigem foto antes de salvar.</li>
          <li>Só fotos publicadas aparecem no anúncio público.</li>
          <li>Use medições e boa iluminação para facilitar a revisão.</li>
        </ul>
      </div>
    </div>
  );
}
