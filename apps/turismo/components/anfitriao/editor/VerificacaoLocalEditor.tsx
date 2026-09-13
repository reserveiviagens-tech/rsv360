'use client';

import { useRef, useState } from 'react';
import { useUploadAcessibilidadeFoto } from '@/hooks/useAnfitriao';

export type VerificacaoLocalGeoEvidence = {
  lat: number;
  lng: number;
  accuracy?: number;
  capturedAt: string;
};

export type VerificacaoLocalMeta = {
  metodo?: 'app' | 'terceiro' | 'videos' | 'web_gps' | null;
  status?: 'pendente' | 'enviado' | 'aprovado' | 'rejeitado';
  codigo?: string;
  evidencias?: Array<{ url: string; tipo: 'foto' | 'video'; enviadoEm?: string }>;
  evidenciaGeo?: VerificacaoLocalGeoEvidence;
  distanciaMetros?: number;
  notas?: string;
  enviadoEm?: string;
  revisadoEm?: string;
};

type Props = {
  unitId: number;
  value: VerificacaoLocalMeta;
  onChange: (next: VerificacaoLocalMeta) => void;
};

type MetodoId = NonNullable<VerificacaoLocalMeta['metodo']>;

const METODOS: Array<{
  id: MetodoId;
  label: string;
  hint: string;
  disabled?: boolean;
  secondary?: boolean;
}> = [
  {
    id: 'web_gps',
    label: 'Confirmar localização no navegador',
    hint: 'Recomendado agora — use o GPS do dispositivo no endereço do anúncio (até 500 m de tolerância).',
  },
  {
    id: 'app',
    label: 'Verificar pelo app Reservei',
    hint: 'App nativo em breve — deep-link disponível; se o app não abrir, use a verificação pelo navegador (web_gps).',
    secondary: true,
  },
  {
    id: 'terceiro',
    label: 'Pedir a outra pessoa',
    hint: 'Envie um código para alguém no endereço confirmar.',
  },
  {
    id: 'videos',
    label: 'Enviar 3 vídeos/fotos',
    hint: 'Interno, fachada e placa/identificação do local.',
  },
];

function geoErrorMessage(code: number): string {
  if (code === 1) return 'Permita o acesso à localização no navegador.';
  if (code === 2) return 'Não foi possível obter sua posição. Tente novamente.';
  if (code === 3) return 'Tempo esgotado ao obter GPS. Tente novamente.';
  return 'Falha ao obter localização.';
}

export function VerificacaoLocalEditor({ unitId, value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAcessibilidadeFoto(unitId);
  const [err, setErr] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoOk, setGeoOk] = useState<string | null>(null);
  const [appFallbackMsg, setAppFallbackMsg] = useState<string | null>(null);
  const evidencias = value.evidencias ?? [];
  const status = value.status ?? 'pendente';
  const metodo = value.metodo ?? 'web_gps';

  async function onFile(file: File | null) {
    if (!file) return;
    setErr(null);
    try {
      const res = await upload.mutateAsync(file);
      const url = res.data?.url;
      if (!url) throw new Error('Upload sem URL');
      const tipo: 'foto' | 'video' = file.type.startsWith('video/') ? 'video' : 'foto';
      onChange({
        ...value,
        metodo: value.metodo ?? 'videos',
        evidencias: [
          ...evidencias,
          { url, tipo, enviadoEm: new Date().toISOString() },
        ].slice(0, 6),
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function confirmarLocalizacaoNavegador() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErr('Seu navegador não suporta geolocalização.');
      setGeoOk(null);
      return;
    }
    setErr(null);
    setGeoOk(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const evidenciaGeo: VerificacaoLocalGeoEvidence = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ...(Number.isFinite(pos.coords.accuracy)
            ? { accuracy: Math.round(pos.coords.accuracy) }
            : {}),
          capturedAt: new Date().toISOString(),
        };
        onChange({
          ...value,
          metodo: 'web_gps',
          evidenciaGeo,
          evidencias: undefined,
          codigo: undefined,
        });
        setGeoOk('Localização capturada. Envie para revisão e salve o anúncio.');
      },
      (geoErr) => {
        setGeoLoading(false);
        setErr(geoErrorMessage(geoErr.code));
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  function abrirAppReservei() {
    setErr(null);
    setAppFallbackMsg(null);
    setGeoOk(null);
    onChange({
      ...value,
      metodo: 'app',
      evidenciaGeo: undefined,
      distanciaMetros: undefined,
    });
    if (typeof window === 'undefined') return;
    window.location.href = `reservei://verificacao-local?unitId=${encodeURIComponent(String(unitId))}`;
    window.setTimeout(() => {
      setAppFallbackMsg(
        'App nativo ainda não disponível neste dispositivo. Use “Confirmar localização no navegador” (web_gps) — funciona agora.',
      );
    }, 1500);
  }

  function enviarRevisao() {
    if (metodo === 'web_gps') {
      if (!value.evidenciaGeo) {
        setErr('Confirme a localização no navegador antes de enviar.');
        return;
      }
    } else if (metodo === 'app') {
      setErr(
        'App nativo ainda não conclui a verificação aqui. Use a confirmação pelo navegador (web_gps).',
      );
      return;
    } else if ((metodo === 'videos' || !metodo) && evidencias.length < 1) {
      setErr('Adicione ao menos uma evidência (foto ou vídeo).');
      return;
    } else if (metodo === 'terceiro' && !String(value.codigo ?? '').trim()) {
      setErr('Informe o código enviado à outra pessoa.');
      return;
    }
    setErr(null);
    onChange({
      ...value,
      metodo,
      status: 'enviado',
      enviadoEm: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Verificar localização</h2>
        <p className="mt-1 text-sm text-slate-500">
          Confirme que o anúncio corresponde ao endereço. Status:{' '}
          <span className="font-medium text-slate-800">{status}</span>
        </p>
      </div>

      {status === 'aprovado' && (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          Localização verificada. O selo pode aparecer no anúncio público.
        </p>
      )}

      <div className="space-y-2">
        {METODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={m.disabled || status === 'enviado' || status === 'aprovado'}
            onClick={() => {
              if (m.disabled) return;
              setErr(null);
              setGeoOk(null);
              setAppFallbackMsg(null);
              onChange({
                ...value,
                metodo: m.id,
                ...(m.id === 'web_gps'
                  ? { evidencias: undefined, codigo: undefined }
                  : {}),
                ...(m.id !== 'web_gps' ? { evidenciaGeo: undefined, distanciaMetros: undefined } : {}),
              });
            }}
            className={`w-full rounded-2xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
              metodo === m.id ? 'border-slate-900' : 'border-slate-200'
            } ${m.secondary ? 'opacity-90' : ''}`}
          >
            <p className="text-sm font-semibold">
              {m.label}
              {m.secondary ? (
                <span className="ml-2 text-xs font-normal text-slate-500">(secundário)</span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-slate-500">{m.hint}</p>
          </button>
        ))}
      </div>

      {metodo === 'app' && (
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-medium">App Reservei</p>
          <p className="text-xs text-slate-500">
            O app nativo está a caminho. Enquanto isso, o deep-link tenta abrir o app; se falhar,
            use web_gps no navegador.
          </p>
          <button
            type="button"
            className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
            disabled={status === 'enviado' || status === 'aprovado'}
            onClick={abrirAppReservei}
          >
            Abrir no app Reservei
          </button>
          {appFallbackMsg ? <p className="mt-2 text-sm text-amber-800">{appFallbackMsg}</p> : null}
        </div>
      )}

      {metodo === 'web_gps' && (
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-medium">GPS do navegador</p>
          <p className="text-xs text-slate-500">
            Você precisa estar no endereço cadastrado (com pin na seção Localização).
          </p>
          {value.evidenciaGeo ? (
            <p className="mt-2 text-xs text-teal-800">
              Captura registrada
              {value.evidenciaGeo.accuracy != null
                ? ` · precisão ~${value.evidenciaGeo.accuracy} m`
                : ''}
              {value.distanciaMetros != null ? ` · ${value.distanciaMetros} m do pin` : ''}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            disabled={
              geoLoading || status === 'enviado' || status === 'aprovado'
            }
            onClick={confirmarLocalizacaoNavegador}
          >
            {geoLoading ? 'Obtendo localização…' : 'Confirmar localização no navegador'}
          </button>
          {geoOk ? <p className="mt-2 text-sm text-teal-700">{geoOk}</p> : null}
        </div>
      )}

      {metodo === 'terceiro' && (
        <label className="block text-sm">
          Código de verificação
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            maxLength={32}
            value={value.codigo ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                codigo: e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32),
              })
            }
            placeholder="Ex.: RSV8K2"
          />
        </label>
      )}

      {(metodo === 'videos' || metodo == null) && (
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-medium">Evidências</p>
          <p className="text-xs text-slate-500">Fotos ou vídeos curtos (máx. 6).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {evidencias.map((e) => (
              <div key={e.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.url} alt="" className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />
                <button
                  type="button"
                  className="absolute -right-1 -top-1 rounded-full bg-white px-1 text-xs ring-1"
                  onClick={() =>
                    onChange({
                      ...value,
                      evidencias: evidencias.filter((x) => x.url !== e.url),
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="mt-3 rounded-xl border border-dashed px-4 py-3 text-sm"
            disabled={upload.isPending || evidencias.length >= 6}
            onClick={() => fileRef.current?.click()}
          >
            {upload.isPending ? 'Enviando…' : 'Adicionar evidência'}
          </button>
        </div>
      )}

      <label className="block text-sm">
        Notas (opcional)
        <textarea
          className="mt-1 h-20 w-full rounded-xl border px-3 py-2"
          maxLength={400}
          value={value.notas ?? ''}
          onChange={(e) => onChange({ ...value, notas: e.target.value })}
        />
      </label>

      {status !== 'aprovado' && (
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          disabled={status === 'enviado'}
          onClick={enviarRevisao}
        >
          {status === 'enviado' ? 'Aguardando revisão' : 'Enviar para revisão'}
        </button>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}
      <p className="text-xs text-slate-500">Salve o anúncio para persistir as evidências.</p>
    </div>
  );
}
