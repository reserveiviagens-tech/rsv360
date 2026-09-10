'use client';

export const CONFIG_RESERVA_MSG_MAX = 400;

type Props = {
  modoReserva: 'instantanea' | 'aprovar';
  setModoReserva: (v: 'instantanea' | 'aprovar') => void;
  exigirHistorico: boolean;
  setExigirHistorico: (v: boolean) => void;
  msgPre: string;
  setMsgPre: (v: string) => void;
};

export function summarizeConfigReservaClient(
  modoReserva: 'instantanea' | 'aprovar',
): 'Reserva Instantânea' | 'Pedidos a serem aprovados' {
  return modoReserva === 'instantanea' ? 'Reserva Instantânea' : 'Pedidos a serem aprovados';
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}

export function ConfigReservaEditor({
  modoReserva,
  setModoReserva,
  exigirHistorico,
  setExigirHistorico,
  msgPre,
  setMsgPre,
}: Props) {
  return (
    <div>
      <PanelTitle title="Configurações de reserva" />
      <div className="space-y-3">
        {(
          [
            ['instantanea', 'Usar Reserva Instantânea', 'Hóspedes reservam automaticamente.'],
            ['aprovar', 'Aprovar todas as reservas', 'Analise todos os pedidos de reserva.'],
          ] as const
        ).map(([id, title, desc]) => (
          <button
            key={id}
            type="button"
            onClick={() => setModoReserva(id)}
            className={`w-full rounded-2xl border p-4 text-left ${
              modoReserva === id ? 'border-slate-900' : 'border-slate-200'
            }`}
          >
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
          </button>
        ))}
      </div>
      {modoReserva === 'instantanea' && (
        <>
          <label className="mt-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
            <span>Exigir bom histórico</span>
            <input
              type="checkbox"
              checked={exigirHistorico}
              onChange={(e) => setExigirHistorico(e.target.checked)}
            />
          </label>
          <label className="mt-4 block text-sm">
            Mensagem pré-reserva
            <textarea
              className="mt-1 h-28 w-full rounded-xl border px-3 py-2"
              value={msgPre}
              maxLength={CONFIG_RESERVA_MSG_MAX}
              onChange={(e) => setMsgPre(e.target.value)}
              placeholder="Ex.: Olá! Conte um pouco sobre sua viagem…"
            />
            <span className="text-xs text-slate-500">
              {msgPre.length}/{CONFIG_RESERVA_MSG_MAX}
            </span>
          </label>
        </>
      )}
    </div>
  );
}
