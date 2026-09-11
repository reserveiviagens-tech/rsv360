'use client';

import type { EditorMeta } from './editor-types';

export type GuiaChegadaValue = NonNullable<EditorMeta['guiaChegada']>;

export function summarizeWifiClient(guia: GuiaChegadaValue): string {
  const rede = typeof guia.wifiRede === 'string' ? guia.wifiRede.trim() : '';
  if (!rede) return 'Adicionar informações';
  return `Rede: ${rede}`;
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

type WifiEditorProps = {
  guia: GuiaChegadaValue;
  setGuia: (v: GuiaChegadaValue) => void;
};

export function WifiEditor({ guia, setGuia }: WifiEditorProps) {
  return (
    <div>
      <PanelTitle
        title="Informações do Wi-Fi"
        hint="Compartilhado 24 a 48 horas antes do check-in."
      />
      <label className="block text-sm">
        Nome da rede
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={guia.wifiRede ?? ''}
          onChange={(e) => setGuia({ ...guia, wifiRede: e.target.value })}
        />
      </label>
      <label className="mt-3 block text-sm">
        Senha
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          type="password"
          value={guia.wifiSenha ?? ''}
          onChange={(e) => setGuia({ ...guia, wifiSenha: e.target.value })}
          autoComplete="off"
        />
      </label>
    </div>
  );
}
