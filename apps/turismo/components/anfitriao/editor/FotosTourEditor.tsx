'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePatchGaleria, useUploadGaleriaFoto } from '@/hooks/useAnfitriao';
import { AnfitriaoTrilhoThumbField } from '../AnfitriaoTrilhoThumbField';
import { compactThumbUrl } from '../unit-thumb';

const FOTO_CATEGORIAS = [
  { id: 'quarto', label: 'Quarto' },
  { id: 'sala', label: 'Sala' },
  { id: 'cozinha', label: 'Cozinha' },
  { id: 'banheiro', label: 'Banheiro' },
  { id: 'exterior', label: 'Exterior' },
  { id: 'piscina', label: 'Piscina' },
  { id: 'vista', label: 'Vista' },
  { id: 'entrada', label: 'Entrada' },
  { id: 'area_comum', label: 'Área comum' },
  { id: 'outro', label: 'Outro' },
] as const;

const ONBOARDING_LS = 'rsv360.anfitriao.fotos.onboarding.dismissed';

type FotoItem = {
  url: string;
  categoria?: string | null;
  caption?: string | null;
  ordem?: number;
};

type Props = {
  unitId: number;
  titulo?: string;
  midia: unknown;
  onMidiaChange: (next: unknown) => void;
};

function parseMidia(midia: unknown): {
  capa: string | null;
  fotos: string[];
  itens: FotoItem[];
  trilhoThumb: string | null;
} {
  if (!midia || typeof midia !== 'object' || Array.isArray(midia)) {
    return { capa: null, fotos: [], itens: [], trilhoThumb: null };
  }
  const o = midia as Record<string, unknown>;
  const itensRaw = Array.isArray(o.itens) ? o.itens : null;
  const fotosRaw = o.fotos ?? o.images ?? o.photos;
  const itens: FotoItem[] = [];
  const seen = new Set<string>();

  const pushItem = (it: FotoItem) => {
    if (!it.url || seen.has(it.url)) return;
    seen.add(it.url);
    itens.push(it);
  };

  if (itensRaw) {
    for (const raw of itensRaw) {
      if (typeof raw === 'string' && raw.trim()) {
        pushItem({ url: raw.trim(), categoria: null, caption: null });
      } else if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        const url = typeof r.url === 'string' ? r.url.trim() : '';
        if (!url) continue;
        pushItem({
          url,
          categoria: typeof r.categoria === 'string' ? r.categoria : null,
          caption: typeof r.caption === 'string' ? r.caption : null,
          ordem: typeof r.ordem === 'number' ? r.ordem : undefined,
        });
      }
    }
  }

  if (Array.isArray(fotosRaw)) {
    for (const raw of fotosRaw) {
      if (typeof raw === 'string' && raw.trim()) {
        pushItem({ url: raw.trim(), categoria: null, caption: null });
      } else if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        const url = typeof r.url === 'string' ? r.url.trim() : '';
        if (!url) continue;
        pushItem({
          url,
          categoria: typeof r.categoria === 'string' ? r.categoria : null,
          caption: typeof r.caption === 'string' ? r.caption : null,
        });
      }
    }
  }

  return {
    capa: typeof o.capa === 'string' ? o.capa : null,
    trilhoThumb: typeof o.trilhoThumb === 'string' ? o.trilhoThumb : null,
    fotos: itens.map((it) => it.url),
    itens,
  };
}

function labelCategoria(id: string | null | undefined): string | null {
  if (!id) return null;
  return FOTO_CATEGORIAS.find((c) => c.id === id)?.label ?? null;
}

export function FotosTourEditor({ unitId, titulo, midia, onMidiaChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadGaleriaFoto(unitId);
  const patch = usePatchGaleria(unitId);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategoria, setBulkCategoria] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const parsed = useMemo(() => parseMidia(midia), [midia]);

  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_LS) === '1') return;
      if (parsed.itens.length === 0) setOnboarding(true);
    } catch {
      /* ignore */
    }
  }, [parsed.itens.length]);

  async function onFiles(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (!list.length) return;
    setMsg(null);
    setErr(null);
    try {
      let lastMidia: unknown = midia;
      for (const file of list) {
        const res = await upload.mutateAsync(file);
        lastMidia = (res.data.unidade as { midia?: unknown })?.midia ?? lastMidia;
      }
      if (lastMidia != null) onMidiaChange(lastMidia);
      setMsg(`${list.length} foto(s) adicionada(s) à galeria.`);
      setPendingFiles([]);
      setUploadOpen(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function runPatch(body: {
    removeUrl?: string;
    moveUrl?: string;
    direction?: 'left' | 'right';
    setCapaUrl?: string;
    setCategoriaUrl?: string;
    categoria?: string | null;
    setCaptionUrl?: string;
    caption?: string | null;
  }) {
    setMsg(null);
    setErr(null);
    try {
      const res = await patch.mutateAsync(body);
      const unidade = res.data as { midia?: unknown };
      if (unidade?.midia != null) onMidiaChange(unidade.midia);
      setMsg('Galeria atualizada.');
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function applyBulkCategoria() {
    if (!bulkCategoria || selected.size === 0) return;
    setMsg(null);
    setErr(null);
    try {
      let lastMidia: unknown = midia;
      for (const url of selected) {
        const res = await patch.mutateAsync({
          setCategoriaUrl: url,
          categoria: bulkCategoria,
        });
        lastMidia = (res.data as { midia?: unknown })?.midia ?? lastMidia;
      }
      if (lastMidia != null) onMidiaChange(lastMidia);
      setMsg(`Categoria aplicada a ${selected.size} foto(s).`);
      setSelected(new Set());
      setSelectMode(false);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  function dismissOnboarding(organize: boolean) {
    try {
      localStorage.setItem(ONBOARDING_LS, '1');
    } catch {
      /* ignore */
    }
    setOnboarding(false);
    if (organize) setSelectMode(true);
  }

  function toggleSelect(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  const busy = upload.isPending || patch.isPending;
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of parsed.itens) {
      const key = it.categoria || 'sem_categoria';
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [parsed.itens]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tour por fotos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Grid, capa, categorias e ordem. Upload em WebP/JPEG alinhado ao trilho.
          </p>
          {parsed.itens.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {parsed.itens.length} foto(s)
              {Object.entries(categoryCounts)
                .filter(([k]) => k !== 'sem_categoria')
                .slice(0, 4)
                .map(([k, n]) => ` · ${labelCategoria(k) || k}: ${n}`)
                .join('')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || parsed.itens.length === 0}
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-40"
          >
            {selectMode ? 'Cancelar seleção' : 'Organizar fotos'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setUploadOpen(true)}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {selectMode && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs text-slate-600">
            Categoria em lote ({selected.size} selecionada(s))
            <select
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={bulkCategoria}
              onChange={(e) => setBulkCategoria(e.target.value)}
            >
              <option value="">Escolher…</option>
              {FOTO_CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !bulkCategoria || selected.size === 0}
            onClick={() => void applyBulkCategoria()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      )}

      {parsed.itens.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Nenhuma foto na galeria ainda. Clique em <strong>+ Adicionar</strong> para começar.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {parsed.itens.map((item, idx) => {
            const isCapa = parsed.capa === item.url || (!parsed.capa && idx === 0);
            const catLabel = labelCategoria(item.categoria);
            const isSelected = selected.has(item.url);
            return (
              <li
                key={item.url}
                className={`overflow-hidden rounded-2xl border bg-white ${
                  isCapa
                    ? 'border-slate-900 ring-2 ring-slate-900'
                    : isSelected
                      ? 'border-teal-600 ring-2 ring-teal-500'
                      : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  className="relative block w-full"
                  onClick={() => {
                    if (selectMode) toggleSelect(item.url);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={compactThumbUrl(item.url, 480)}
                    alt=""
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {catLabel && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                      {catLabel}
                    </span>
                  )}
                  {isCapa && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                      Foto de capa
                    </span>
                  )}
                  {selectMode && (
                    <span
                      className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                        isSelected
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-white bg-black/40 text-white'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  )}
                </button>
                <div className="space-y-1.5 p-2">
                  <label className="block text-[10px] text-slate-500">
                    Cômodo / área
                    <select
                      disabled={busy}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-800"
                      value={item.categoria || ''}
                      onChange={(e) =>
                        void runPatch({
                          setCategoriaUrl: item.url,
                          categoria: e.target.value || null,
                        })
                      }
                    >
                      <option value="">Sem categoria</option>
                      {FOTO_CATEGORIAS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!selectMode && (
                    <div className="flex flex-wrap gap-1">
                      {!isCapa && (
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white"
                          onClick={() => void runPatch({ setCapaUrl: item.url })}
                        >
                          Definir capa
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy || idx === 0}
                        className="rounded-lg border px-2 py-1 text-[10px] disabled:opacity-40"
                        onClick={() => void runPatch({ moveUrl: item.url, direction: 'left' })}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={busy || idx === parsed.itens.length - 1}
                        className="rounded-lg border px-2 py-1 text-[10px] disabled:opacity-40"
                        onClick={() => void runPatch({ moveUrl: item.url, direction: 'right' })}
                      >
                        →
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-red-200 px-2 py-1 text-[10px] text-red-700"
                        onClick={() => void runPatch({ removeUrl: item.url })}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {msg && <p className="text-sm text-teal-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <AnfitriaoTrilhoThumbField
        unitId={unitId}
        midia={midia}
        titulo={titulo}
        onMidiaChange={onMidiaChange}
      />

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fotos-upload-title"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3 id="fotos-upload-title" className="text-lg font-semibold text-slate-900">
              Enviar fotos
            </h3>
            <p className="mt-1 text-sm text-slate-500">Arraste e solte ou busque no dispositivo.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                setPendingFiles(files);
              }}
            />
            <button
              type="button"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const files = Array.from(e.dataTransfer.files || []).filter((f) =>
                  f.type.startsWith('image/'),
                );
                setPendingFiles(files);
              }}
              onClick={() => fileRef.current?.click()}
              className={`mt-4 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-10 text-sm ${
                dragOver ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50'
              }`}
            >
              <span className="font-medium text-slate-800">Arraste fotos aqui</span>
              <span className="mt-1 text-xs text-slate-500">ou clique para buscar · JPEG/PNG/WebP · máx. 8MB</span>
            </button>
            <p className="mt-3 text-xs text-slate-500">
              {pendingFiles.length === 0
                ? 'Não há itens selecionados'
                : `${pendingFiles.length} arquivo(s) selecionado(s)`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() => {
                  setUploadOpen(false);
                  setPendingFiles([]);
                }}
              >
                Concluído
              </button>
              <button
                type="button"
                disabled={busy || pendingFiles.length === 0}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"
                onClick={() => void onFiles(pendingFiles)}
              >
                {upload.isPending ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {onboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fotos-onboarding-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3 id="fotos-onboarding-title" className="text-lg font-semibold text-slate-900">
              Comece com as melhores fotos
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Ordene manualmente as fotos mais atrativas primeiro e atribua categorias (quarto,
              piscina, exterior…). Ranking automático fica para uma fase seguinte.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() => dismissOnboarding(false)}
              >
                Não, obrigado
              </button>
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
                onClick={() => {
                  dismissOnboarding(true);
                  setUploadOpen(true);
                }}
              >
                Organizar fotos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
