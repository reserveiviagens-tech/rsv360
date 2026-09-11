'use client';

import type { EditorMeta } from './editor-types';

export type CheckinCheckoutValue = NonNullable<EditorMeta['regrasCasa']>;

export function summarizeCheckinCheckoutClient(regras: CheckinCheckoutValue): string {
  const checkInDe =
    typeof regras.checkInDe === 'string' && regras.checkInDe.trim()
      ? regras.checkInDe.trim()
      : '14:00';
  const checkOutAte =
    typeof regras.checkOutAte === 'string' && regras.checkOutAte.trim()
      ? regras.checkOutAte.trim()
      : '11:00';
  return `Check-in ${checkInDe} · Checkout ${checkOutAte}`;
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}

type CheckinCheckoutEditorProps = {
  regras: CheckinCheckoutValue;
  setRegras: (v: CheckinCheckoutValue) => void;
};

export function CheckinCheckoutEditor({ regras, setRegras }: CheckinCheckoutEditorProps) {
  return (
    <div>
      <PanelTitle title="Check-in e checkout" />
      <label className="block text-sm">
        Início do check-in
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={regras.checkInDe ?? '14:00'}
          onChange={(e) => setRegras({ ...regras, checkInDe: e.target.value })}
        />
      </label>
      <label className="mt-3 block text-sm">
        Término do check-in
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={regras.checkInAte ?? 'Flexível'}
          onChange={(e) => setRegras({ ...regras, checkInAte: e.target.value })}
        />
      </label>
      <label className="mt-3 block text-sm">
        Checkout
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={regras.checkOutAte ?? '11:00'}
          onChange={(e) => setRegras({ ...regras, checkOutAte: e.target.value })}
        />
      </label>
    </div>
  );
}
