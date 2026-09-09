'use client';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PrecoInteligenteHelpModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-help-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Como · Anfitrião de acomodação
            </p>
            <h2 id="smart-help-title" className="mt-1 text-xl font-bold text-slate-900">
              Use o Preço Inteligente para ajustar seus preços automaticamente com base na demanda
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className="text-sm leading-relaxed text-slate-600">
          Ative o Preço Inteligente se quiser que seu anúncio tenha preços competitivos automaticamente
          para sua região, sem a necessidade de monitorá-lo constantemente.
        </p>

        <nav className="mt-4 space-y-1 rounded-2xl bg-slate-50 p-3 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Neste artigo</p>
          {[
            'Como o Preço Inteligente determina os preços por noite',
            'Como ativar ou desativar o Preço Inteligente',
            'Como substituir o Preço Inteligente no calendário',
            'Como os descontos e promoções afetam o Preço Inteligente',
            'O Preço Inteligente substitui os conjuntos de regras',
          ].map((t) => (
            <a key={t} href={`#${slug(t)}`} className="block text-sky-700 underline-offset-2 hover:underline">
              {t}
            </a>
          ))}
        </nav>

        <section id={slug('Como o Preço Inteligente determina os preços por noite')} className="mt-6">
          <h3 className="text-base font-bold text-slate-900">
            Como o Preço Inteligente determina os preços por noite
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            O Preço Inteligente usa centenas de fatores sobre seu anúncio e sua região para ajustar o
            preço por noite com base na demanda. Você define a faixa de preço e pode alterar o valor
            quando quiser.
          </p>
        </section>

        <section id={slug('Como ativar ou desativar o Preço Inteligente')} className="mt-6">
          <h3 className="text-base font-bold text-slate-900">
            Como ativar ou desativar o Preço Inteligente
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-800">Como editar pelo computador</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Abra o Calendário de tarifas da unidade</li>
            <li>Em Configurações de preço / Preço básico, abra Preço Inteligente</li>
            <li>Insira um preço mínimo e máximo</li>
            <li>Clique em Salvar</li>
          </ol>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Para desativar, use o botão para alternar o Preço Inteligente para desativado. As alterações
            de preços não afetam as reservas pendentes ou confirmadas.
          </p>
        </section>

        <section id={slug('Como substituir o Preço Inteligente no calendário')} className="mt-6">
          <h3 className="text-base font-bold text-slate-900">
            Como substituir o Preço Inteligente no calendário
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Você pode substituir o Preço Inteligente para uma ou várias noites no calendário sem
            desativá-lo. Defina o preço personalizado para essas noites — ele será o preço nas datas
            em questão. Noites com preço personalizado mantêm o override mesmo com Preço Inteligente
            ativo.
          </p>
        </section>

        <section id={slug('Como os descontos e promoções afetam o Preço Inteligente')} className="mt-6">
          <h3 className="text-base font-bold text-slate-900">
            Como os descontos e promoções afetam o Preço Inteligente
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Se você adicionar um desconto para algumas noites (por exemplo, reservas antecipadas), o
            preço que os hóspedes pagarão pode ficar abaixo do Preço Inteligente mínimo definido para
            essas noites. Descontos semanais, para estadias longas e por duração de viagem podem
            reduzir o valor efetivo abaixo do mínimo. Prefira desativar o Preço Inteligente se quiser
            priorizar um preço de fim de semana fixo sem ajustes automáticos.
          </p>
        </section>

        <section id={slug('O Preço Inteligente substitui os conjuntos de regras')} className="mt-6">
          <h3 className="text-base font-bold text-slate-900">
            O Preço Inteligente substitui os conjuntos de regras
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Se você usar ferramentas avançadas de hospedagem com regras personalizadas de preços e
            disponibilidade, desative o Preço Inteligente antes de aplicar um conjunto de regras — o
            Preço Inteligente tem prioridade sobre esses conjuntos. A Reservei Viagens pode desativar
            temporariamente o Preço Inteligente em eventos excepcionais (desastres, emergências ou
            crises) para evitar alterações drásticas e cumprir regras locais.
          </p>
        </section>

        <button
          type="button"
          className="mt-6 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white"
          onClick={onClose}
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
