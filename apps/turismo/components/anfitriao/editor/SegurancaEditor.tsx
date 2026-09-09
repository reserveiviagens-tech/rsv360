'use client';

export type SegurancaMeta = {
  consideracoes?: Record<string, boolean>;
  dispositivos?: Record<string, { ativo: boolean; detalhes?: string }>;
  infoPropriedade?: Record<string, boolean>;
  recomendacoesEspeciais?: string;
};

type Props = {
  value: SegurancaMeta;
  onChange: (next: SegurancaMeta) => void;
};

const CONSIDERACOES: Array<{ id: string; label: string }> = [
  { id: 'nao-adequado-criancas', label: 'Não é um espaço seguro ou adequado para crianças' },
  { id: 'escadas-perigosas', label: 'Escadas íngremes ou sem corrimão' },
  { id: 'altura', label: 'Possíveis riscos relacionados à altura' },
  { id: 'agua', label: 'Piscina, lago ou outro corpo d\'água sem cerca' },
  { id: 'animais', label: 'Animais potencialmente perigosos na propriedade' },
];

const DISPOSITIVOS: Array<{ id: string; label: string; needsDetail?: boolean }> = [
  { id: 'camera-externa', label: 'Câmera de segurança externa', needsDetail: true },
  { id: 'camera-interna', label: 'Câmera de segurança interna', needsDetail: true },
  { id: 'ruido', label: 'Monitor de ruído', needsDetail: true },
  { id: 'armas', label: 'Armas na propriedade' },
  { id: 'co', label: 'Detector de monóxido de carbono' },
  { id: 'fumaca', label: 'Detector de fumaça' },
];

const INFO: Array<{ id: string; label: string }> = [
  { id: 'espaco-compartilhado', label: 'Espaço compartilhado' },
  { id: 'amenidades-limitadas', label: 'Amenidades limitadas' },
  { id: 'aparelhos', label: 'Aparelhos ou equipamentos' },
  { id: 'vigilancia', label: 'Dispositivos de vigilância' },
  { id: 'animais-estimacao', label: 'Animais de estimação que vivem na propriedade' },
];

export function SegurancaEditor({ value, onChange }: Props) {
  const consideracoes = value.consideracoes ?? {};
  const dispositivos = value.dispositivos ?? {};
  const info = value.infoPropriedade ?? {};

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Segurança do hóspede</h2>
        <p className="mt-1 text-sm text-slate-500">
          Informe riscos e dispositivos. Isso aparece de forma transparente para os hóspedes.
        </p>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Considerações de segurança</h3>
        <ul className="mt-3 space-y-2">
          {CONSIDERACOES.map((c) => (
            <li key={c.id}>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={Boolean(consideracoes[c.id])}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      consideracoes: { ...consideracoes, [c.id]: e.target.checked },
                    })
                  }
                />
                <span>{c.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Dispositivos de segurança</h3>
        <ul className="mt-3 space-y-3">
          {DISPOSITIVOS.map((d) => {
            const cur = dispositivos[d.id] ?? { ativo: false, detalhes: '' };
            return (
              <li key={d.id} className="rounded-xl border border-slate-200 p-3">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(cur.ativo)}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        dispositivos: {
                          ...dispositivos,
                          [d.id]: { ...cur, ativo: e.target.checked },
                        },
                      })
                    }
                  />
                  <span className="font-medium">{d.label}</span>
                </label>
                {d.needsDetail && cur.ativo && (
                  <input
                    className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Detalhes (ex.: localização da câmera)"
                    value={cur.detalhes ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        dispositivos: {
                          ...dispositivos,
                          [d.id]: { ...cur, detalhes: e.target.value.slice(0, 200) },
                        },
                      })
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Informações da propriedade</h3>
        <ul className="mt-3 space-y-2">
          {INFO.map((i) => (
            <li key={i.id}>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={Boolean(info[i.id])}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      infoPropriedade: { ...info, [i.id]: e.target.checked },
                    })
                  }
                />
                <span>{i.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <label className="block text-sm">
        <span className="font-medium">Recomendações especiais</span>
        <textarea
          className="mt-1 h-28 w-full rounded-xl border px-3 py-2"
          maxLength={500}
          value={value.recomendacoesEspeciais ?? ''}
          onChange={(e) => onChange({ ...value, recomendacoesEspeciais: e.target.value })}
          placeholder="Avisos extras para o hóspede"
        />
        <span className="text-xs text-slate-500">
          {(value.recomendacoesEspeciais ?? '').length}/500
        </span>
      </label>
    </div>
  );
}
