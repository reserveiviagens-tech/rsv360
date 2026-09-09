'use client';

import { useMemo, useRef, useState } from 'react';
import {
  useDefinirTrilhoCapa,
  useUploadTrilhoThumb,
} from '@/hooks/useAnfitriao';
import { compactThumbUrl, resolveUnitThumbUrl, unitThumbPlaceholder } from './unit-thumb';

type Props = {
  unitId: number;
  midia: unknown;
  titulo?: string;
  onMidiaChange?: (midia: unknown) => void;
};

function listFotoUrls(midia: unknown): string[] {
  const urls: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'string' && (v.startsWith('http') || v.startsWith('/'))) urls.push(v);
  };
  if (Array.isArray(midia)) {
    midia.forEach((item) => {
      if (typeof item === 'string') push(item);
      else if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        push(o.url);
        push(o.src);
      }
    });
    return Array.from(new Set(urls));
  }
  if (midia && typeof midia === 'object') {
    const o = midia as Record<string, unknown>;
    push(o.capa);
    push(o.trilhoThumb);
    const fotos = o.fotos ?? o.images ?? o.photos;
    if (Array.isArray(fotos)) fotos.forEach(push);
  }
  return Array.from(new Set(urls));
}

export function AnfitriaoTrilhoThumbField({ unitId, midia, titulo, onMidiaChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadTrilhoThumb(unitId);
  const definirCapa = useDefinirTrilhoCapa(unitId);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const current = useMemo(() => resolveUnitThumbUrl(midia), [midia]);
  const gallery = useMemo(() => listFotoUrls(midia), [midia]);
  const preview = current
    ? compactThumbUrl(current, 256)
    : unitThumbPlaceholder(unitId, titulo || String(unitId));

  async function onFileChange(file: File | null) {
    if (!file) return;
    setMsg(null);
    setErr(null);
    try {
      const res = await upload.mutateAsync(file);
      const unidade = res.data.unidade as { midia?: unknown } | undefined;
      if (unidade?.midia != null) onMidiaChange?.(unidade.midia);
      setMsg('Imagem do trilho salva (WebP leve). Já aparece no seletor de acomodações.');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function usarComoTrilho(url: string) {
    setMsg(null);
    setErr(null);
    try {
      const res = await definirCapa.mutateAsync(url);
      onMidiaChange?.((res.data as { midia?: unknown })?.midia);
      setMsg('Capa do trilho atualizada.');
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const busy = upload.isPending || definirCapa.isPending;

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Imagem do trilho</h3>
      <p className="mt-1 text-xs text-slate-600">
        Escolha a foto que aparece no menu lateral de acomodações. O sistema converte para WebP
        leve (256×256) e aplica automaticamente.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Prévia do trilho"
          width={96}
          height={96}
          className="h-24 w-24 rounded-xl object-cover ring-1 ring-slate-200"
        />
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full max-w-xs text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            disabled={busy}
            onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
          />
          <p className="text-[11px] text-slate-500">JPEG, PNG ou WebP · máx. 8MB</p>
        </div>
      </div>

      {gallery.length > 1 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-slate-700">Ou escolher da galeria</p>
          <ul className="flex flex-wrap gap-2">
            {gallery.map((url) => (
              <li key={url}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void usarComoTrilho(url)}
                  className={`overflow-hidden rounded-lg ring-2 transition ${
                    url === current ? 'ring-slate-900' : 'ring-transparent hover:ring-slate-300'
                  }`}
                  title="Usar no trilho"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={compactThumbUrl(url, 96)}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {msg ? <p className="mt-3 text-sm text-emerald-700">{msg}</p> : null}
      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
    </section>
  );
}
