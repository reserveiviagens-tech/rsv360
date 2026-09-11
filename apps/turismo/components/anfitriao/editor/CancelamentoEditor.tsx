'use client';

export type PoliticaCancelamentoCurta = 'flexivel' | 'moderada' | 'limitada' | 'restrita';
export type PoliticaCancelamentoLonga = 'restrita_longa' | 'flexivel_longa';

const LABEL_CURTA: Record<PoliticaCancelamentoCurta, string> = {
  flexivel: 'Flexível',
  moderada: 'Moderada',
  limitada: 'Limitada',
  restrita: 'Restrita',
};

const LABEL_LONGA: Record<PoliticaCancelamentoLonga, string> = {
  restrita_longa: 'Restrita (longa duração)',
  flexivel_longa: 'Flexível (longa duração)',
};

/** Card preview — mirrors server summarizeCancelamento. */
export function summarizeCancelamentoClient(input: {
  politicaCancelamentoCurta: string;
  politicaCancelamentoLonga: string;
  opcaoNaoReembolsavel?: boolean;
}): string {
  const curta = LABEL_CURTA[input.politicaCancelamentoCurta as PoliticaCancelamentoCurta] ??
    input.politicaCancelamentoCurta;
  const longa = LABEL_LONGA[input.politicaCancelamentoLonga as PoliticaCancelamentoLonga] ??
    input.politicaCancelamentoLonga;
  const base = `${curta} · ${longa}`;
  return input.opcaoNaoReembolsavel ? `${base} · Não reembolsável` : base;
}

type Props = {
  polCurta: string;
  setPolCurta: (v: string) => void;
  polLonga: string;
  setPolLonga: (v: string) => void;
  naoReemb: boolean;
  setNaoReemb: (v: boolean) => void;
};

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}

export function CancelamentoEditor({
  polCurta,
  setPolCurta,
  polLonga,
  setPolLonga,
  naoReemb,
  setNaoReemb,
}: Props) {
  return (
    <div>
      <PanelTitle title="Política de cancelamento" />
      <label className="block text-sm">
        Estadias de curta duração (menos de 28 noites)
        <select
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={polCurta}
          onChange={(e) => setPolCurta(e.target.value)}
        >
          <option value="flexivel">Flexível</option>
          <option value="moderada">Moderada</option>
          <option value="limitada">Limitada</option>
          <option value="restrita">Restrita</option>
        </select>
      </label>
      <label className="mt-4 block text-sm">
        Estadias de longa duração (28+ noites)
        <select
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={polLonga}
          onChange={(e) => setPolLonga(e.target.value)}
        >
          <option value="restrita_longa">Restrita para estadias de longa duração</option>
          <option value="flexivel_longa">Flexível longa duração</option>
        </select>
      </label>
      <label className="mt-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
        <span>Opção não reembolsável (~10% desconto)</span>
        <input
          type="checkbox"
          checked={naoReemb}
          onChange={(e) => setNaoReemb(e.target.checked)}
        />
      </label>
    </div>
  );
}
