'use client';

import { useRef, useState } from 'react';
import { useUploadAcessibilidadeFoto } from '@/hooks/useAnfitriao';

export const ACESSIBILIDADE_CATALOG = [
  {
    id: 'vaga-pcd',
    label: 'Vaga no estacionamento para pessoas com deficiência',
    hint: 'Vaga com largura adequada e sinalização.',
  },
  {
    id: 'caminho-iluminado',
    label: 'Caminho iluminado até a entrada dos hóspedes',
    hint: 'Iluminação contínua do estacionamento até a porta.',
  },
  {
    id: 'sem-degraus',
    label: 'Acesso sem degraus',
    hint: 'Entrada sem degraus ou com rampa.',
  },
  {
    id: 'entrada-larga',
    label: 'Entrada para os hóspedes com mais de 81 cm de largura',
    hint: 'Vão livre da porta de entrada.',
  },
  {
    id: 'guincho-piscina',
    label: 'Guincho para piscina ou banheira de hidromassagem',
    hint: 'Equipamento de transferência aquática.',
  },
  {
    id: 'guincho-transferencia',
    label: 'Guincho de transferência móvel ou fixado no teto',
    hint: 'Ajuda na transferência cama/banho.',
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

function ensureItems(items: AcessibilidadeItem[]): AcessibilidadeItem[] {
  return normalizeAcessibilidadeItems(items);
}

export function AcessibilidadeEditor({ unitId, items, onChange }: Props) {
  const normalized = ensureItems(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = normalized.find((i) => i.id === activeId) ?? null;
  const catalog = ACESSIBILIDADE_CATALOG.find((c) => c.id === activeId);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAcessibilidadeFoto(unitId);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function updateItem(id: string, patch: Partial<AcessibilidadeItem>) {
    onChange(ensureItems(normalized).map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function patchFotos(
    id: string,
    mapper: (fotos: AcessibilidadeFoto[]) => AcessibilidadeFoto[],
  ) {
    const cur = ensureItems(normalized).find((i) => i.id === id)!;
    updateItem(id, { fotos: mapper(cur.fotos) });
  }

  async function onFile(file: File | null) {
    if (!file || !activeId) return;
    setErr(null);
    setMsg(null);
    try {
      const res = await upload.mutateAsync(file);
      const absolute = res.data?.url;
      if (!absolute) throw new Error('Upload sem URL');
      const cur = ensureItems(normalized).find((i) => i.id === activeId)!;
      updateItem(activeId, {
        possui: true,
        fotos: [...cur.fotos, { url: absolute, status: 'pendente' }],
      });
      setMsg('Foto enviada como pendente. Envie para revisão e publique após conferir.');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function enviarRevisao() {
    if (!activeId) return;
    const now = new Date().toISOString();
    patchFotos(activeId, (fotos) =>
      fotos.map((f) =>
        f.status === 'pendente' || f.status === 'rejeitado'
          ? { ...f, status: 'em_revisao', enviadoEm: now }
          : f,
      ),
    );
    setMsg('Fotos enviadas para revisão. Publique quando estiverem ok para o anúncio.');
  }

  function publicarFotos() {
    if (!activeId) return;
    const now = new Date().toISOString();
    patchFotos(activeId, (fotos) =>
      fotos.map((f) =>
        f.status === 'em_revisao' || f.status === 'pendente'
          ? { ...f, status: 'publicado', publicadoEm: now }
          : f,
      ),
    );
    setMsg('Fotos publicadas no anúncio. Salve para persistir.');
  }

  function rejeitarFoto(url: string) {
    if (!activeId) return;
    patchFotos(activeId, (fotos) =>
      fotos.map((f) => (f.url === url ? { ...f, status: 'rejeitado' } : f)),
    );
  }

  function removerFoto(url: string) {
    if (!activeId) return;
    patchFotos(activeId, (fotos) => fotos.filter((f) => f.url !== url));
  }

  if (active && catalog) {
    const needsPhotos = active.possui === true && active.fotos.length === 0;
    const pendentes = active.fotos.filter(
      (f) => f.status === 'pendente' || f.status === 'rejeitado',
    ).length;
    const emRevisao = active.fotos.filter((f) => f.status === 'em_revisao').length;
    const publicadas = active.fotos.filter((f) => f.status === 'publicado').length;

    return (
      <div>
        <button
          type="button"
          className="mb-3 text-sm text-slate-600"
          onClick={() => setActiveId(null)}
        >
          ← Voltar
        </button>
        <h2 className="text-xl font-bold text-slate-900">{catalog.label}</h2>
        <p className="mt-1 text-sm text-slate-500">{catalog.hint}</p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => updateItem(active.id, { possui: false, fotos: [] })}
            className={`w-full rounded-2xl border p-4 text-left text-sm ${
              active.possui === false ? 'border-slate-900' : 'border-slate-200'
            }`}
          >
            Eu não tenho esse recurso
          </button>
          <button
            type="button"
            onClick={() => updateItem(active.id, { possui: true })}
            className={`w-full rounded-2xl border p-4 text-left text-sm ${
              active.possui === true ? 'border-slate-900' : 'border-slate-200'
            }`}
          >
            Eu tenho esse recurso
          </button>
        </div>

        {active.possui === true && (
          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            {needsPhotos && (
              <p className="mb-2 text-sm font-medium text-red-600">
                Obrigatório: adicione novas fotos
              </p>
            )}
            <p className="text-xs text-slate-500">
              Fluxo: enviar → revisão → publicar no anúncio. Só fotos publicadas entram no listing
              público.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {active.fotos.map((foto) => (
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
                  <div className="mt-1 flex flex-col gap-0.5">
                    {foto.status !== 'rejeitado' && foto.status !== 'publicado' && (
                      <button
                        type="button"
                        className="text-left text-[10px] text-amber-700 underline"
                        onClick={() => rejeitarFoto(foto.url)}
                      >
                        Rejeitar
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-left text-[10px] text-red-600 underline"
                      onClick={() => removerFoto(foto.url)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="mt-3 rounded-xl border border-dashed border-slate-400 px-4 py-6 text-sm text-slate-700"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? 'Enviando…' : '📷 Adicionar fotos'}
            </button>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                disabled={pendentes === 0}
                onClick={enviarRevisao}
              >
                Enviar para revisão ({pendentes})
              </button>
              <button
                type="button"
                className="rounded-xl border border-teal-600 px-3 py-2 text-sm font-medium text-teal-800 disabled:opacity-40"
                disabled={emRevisao === 0 && pendentes === 0}
                onClick={publicarFotos}
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

        {msg && <p className="mt-2 text-sm text-teal-700">{msg}</p>}
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Recursos de acessibilidade</h2>
      <p className="mt-1 text-sm text-slate-500">
        Declare o que você tem, anexe fotos e conclua revisão/publicação.
      </p>
      <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
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
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setActiveId(c.id)}
              >
                <span>
                  <span className="block text-sm font-medium text-slate-900">{c.label}</span>
                  {missing && (
                    <span className="text-xs font-medium text-red-600">
                      Obrigatório: adicione novas fotos
                    </span>
                  )}
                  {item.possui === true && !missing && awaiting > 0 && (
                    <span className="text-xs font-medium text-amber-700">
                      {awaiting} foto(s) aguardando revisão/publicação
                    </span>
                  )}
                  {item.possui === true && !missing && awaiting === 0 && (
                    <span className="text-xs text-teal-700">
                      {published > 0
                        ? `Publicado · ${published} foto(s)`
                        : `Configurado · ${item.fotos.length} foto(s)`}
                    </span>
                  )}
                  {item.possui === false && (
                    <span className="text-xs text-slate-500">Não tenho este recurso</span>
                  )}
                  {item.possui == null && (
                    <span className="text-xs text-slate-400">Não informado</span>
                  )}
                </span>
                <span aria-hidden>{item.possui != null ? '✎' : '+'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
