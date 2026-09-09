'use client';

import { useMemo, useRef, useState } from 'react';
import { usePatchGaleria, useUploadGaleriaFoto } from '@/hooks/useAnfitriao';
import { AnfitriaoTrilhoThumbField } from '../AnfitriaoTrilhoThumbField';
import { compactThumbUrl } from '../unit-thumb';

type Props = {
  unitId: number;
  titulo?: string;
  midia: unknown;
  onMidiaChange: (next: unknown) => void;
};

function parseMidia(midia: unknown): { capa: string | null; fotos: string[]; trilhoThumb: string | null } {
  if (!midia || typeof midia !== 'object' || Array.isArray(midia)) {
    return { capa: null, fotos: [], trilhoThumb: null };
  }
  const o = midia as Record<string, unknown>;
  const fotosRaw = o.fotos ?? o.images ?? o.photos;
  const fotos = Array.isArray(fotosRaw)
    ? fotosRaw.filter((u): u is string => typeof u === 'string' && Boolean(u.trim()))
    : [];
  return {
    capa: typeof o.capa === 'string' ? o.capa : null,
    trilhoThumb: typeof o.trilhoThumb === 'string' ? o.trilhoThumb : null,
    fotos: Array.from(new Set(fotos)),
  };
}

export function FotosTourEditor({ unitId, titulo, midia, onMidiaChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadGaleriaFoto(unitId);
  const patch = usePatchGaleria(unitId);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const parsed = useMemo(() => parseMidia(midia), [midia]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setMsg(null);
    setErr(null);
    try {
      let lastMidia: unknown = midia;
      for (const file of Array.from(files)) {
        const res = await upload.mutateAsync(file);
        lastMidia = (res.data.unidade as { midia?: unknown })?.midia ?? lastMidia;
      }
      if (lastMidia != null) onMidiaChange(lastMidia);
      setMsg(`${files.length} foto(s) adicionada(s) à galeria.`);
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

  const busy = upload.isPending || patch.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Tour por fotos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Adicione fotos, defina a capa do anúncio e organize a ordem. A imagem do trilho fica
          separada abaixo.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-8 text-sm font-medium text-slate-800"
        >
          {upload.isPending ? 'Enviando…' : '📷 Adicionar fotos (múltiplas)'}
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-500">JPEG, PNG ou WebP · máx. 8MB cada</p>
      </div>

      {parsed.fotos.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Nenhuma foto na galeria ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {parsed.fotos.map((url, idx) => {
            const isCapa = parsed.capa === url || (!parsed.capa && idx === 0);
            return (
              <li
                key={url}
                className={`overflow-hidden rounded-2xl border bg-white ${
                  isCapa ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-200'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={compactThumbUrl(url, 480)}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="space-y-1 p-2">
                  {isCapa && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                      Capa do anúncio
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {!isCapa && (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white"
                        onClick={() => void runPatch({ setCapaUrl: url })}
                      >
                        Definir capa
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy || idx === 0}
                      className="rounded-lg border px-2 py-1 text-[10px] disabled:opacity-40"
                      onClick={() => void runPatch({ moveUrl: url, direction: 'left' })}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={busy || idx === parsed.fotos.length - 1}
                      className="rounded-lg border px-2 py-1 text-[10px] disabled:opacity-40"
                      onClick={() => void runPatch({ moveUrl: url, direction: 'right' })}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg border border-red-200 px-2 py-1 text-[10px] text-red-700"
                      onClick={() => void runPatch({ removeUrl: url })}
                    >
                      Remover
                    </button>
                  </div>
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

      <button
        type="button"
        className="text-xs text-slate-500 underline"
        onClick={() => setAdvanced((v) => !v)}
      >
        {advanced ? 'Ocultar JSON avançado' : 'Mostrar JSON avançado'}
      </button>
      {advanced && (
        <pre className="overflow-x-auto rounded-xl border bg-slate-50 p-3 text-[11px] text-slate-700">
          {JSON.stringify(midia ?? {}, null, 2)}
        </pre>
      )}
    </div>
  );
}
