import Link from 'next/link';
import Head from 'next/head';
import { useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import AnfitriaoRoleGuard from '../../../../components/AnfitriaoRoleGuard';
import { AnfitriaoHostNav } from '../../../../components/anfitriao/AnfitriaoHostNav';
import { AnfitriaoPropertySwitcher } from '../../../../components/anfitriao/AnfitriaoPropertySwitcher';
import { AnfitriaoListingEditor } from '../../../../components/anfitriao/editor/AnfitriaoListingEditor';
import type { ListingEditorUnidade } from '../../../../components/anfitriao/editor/editor-types';
import {
  useAnfitriaoUnidade,
  useAtualizarAnfitriaoUnidade,
  useEnviarAprovacaoUnidade,
} from '@/hooks/useAnfitriao';
import { fase1Api } from '@/lib/fase1-api';
import { parseRouteId } from '@/lib/parse-route-id';

type PageProps = { unitId: number; secao: string | null };

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const unitId = parseRouteId(ctx.params?.id);
  if (unitId == null) {
    return {
      redirect: { destination: '/anfitriao/unidades', permanent: false },
    };
  }
  const secao = typeof ctx.query.secao === 'string' ? ctx.query.secao : null;
  return { props: { unitId, secao } };
};

export default function AnfitriaoUnidadeEditorPage({ unitId, secao }: PageProps) {
  const { data, isLoading, isError, error, refetch } = useAnfitriaoUnidade(unitId);
  const atualizar = useAtualizarAnfitriaoUnidade(unitId);
  const enviar = useEnviarAprovacaoUnidade(unitId);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const unidade = data?.data as ListingEditorUnidade | undefined;

  const pricing = useMemo(() => {
    if (!unidade) return null;
    return {
      precoDiaria: unidade.precoDiaria != null ? Number(unidade.precoDiaria) : null,
      precoFimSemana: unidade.precoFimSemana != null ? Number(unidade.precoFimSemana) : null,
      minNoites: unidade.minNoites ?? undefined,
      maxNoites: unidade.maxNoites ?? undefined,
      descontoSemanalPct:
        unidade.descontoSemanalPct != null ? Number(unidade.descontoSemanalPct) : undefined,
      descontoMensalPct:
        unidade.descontoMensalPct != null ? Number(unidade.descontoMensalPct) : undefined,
      politicaCancelamentoCurta: unidade.politicaCancelamentoCurta ?? undefined,
      politicaCancelamentoLonga: unidade.politicaCancelamentoLonga ?? undefined,
      opcaoNaoReembolsavel: unidade.opcaoNaoReembolsavel ?? undefined,
      precoInteligenteAtivo: unidade.precoInteligenteAtivo ?? undefined,
    };
  }, [unidade]);

  async function onSaveUnit(body: Record<string, unknown>) {
    setMensagem(null);
    setSaving(true);
    try {
      await atualizar.mutateAsync(body);
      setMensagem('Anúncio salvo.');
      await refetch();
    } catch (e) {
      setMensagem((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function onSavePricing(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await fase1Api.anfitriaoPricingDefaults(unitId, body);
      setMensagem((m) => m ?? 'Tarifas atualizadas.');
      await refetch();
    } catch (e) {
      setMensagem((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function onEnviarAprovacao() {
    setMensagem(null);
    try {
      await enviar.mutateAsync();
      setMensagem('Enviado para aprovação do staff.');
      await refetch();
    } catch (e) {
      setMensagem((e as Error).message);
    }
  }

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Editor de anúncios | Reservei Viagens</title>
      </Head>
      <div className="min-h-screen bg-white">
        <AnfitriaoHostNav />
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 md:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <AnfitriaoPropertySwitcher
              currentId={unitId}
              hrefFor={(id) => `/anfitriao/unidades/${id}`}
            />
            <Link
              href={`/anfitriao/unidades/${unitId}/disponibilidade`}
              className="text-sm text-slate-700 underline"
              prefetch={false}
            >
              Disponibilidade
            </Link>
          </div>
        </div>

        {isLoading && <p className="p-6 text-sm text-slate-600">Carregando anúncio…</p>}
        {isError && (
          <p className="p-6 text-sm text-red-600">{(error as Error)?.message || 'Erro ao carregar'}</p>
        )}

        {unidade && (
          <AnfitriaoListingEditor
            unitId={unitId}
            unidade={unidade}
            pricing={pricing}
            saving={saving || atualizar.isPending}
            message={mensagem}
            initialSection={secao}
            onSaveUnit={onSaveUnit}
            onSavePricing={onSavePricing}
            onEnviarAprovacao={onEnviarAprovacao}
          />
        )}
      </div>
    </AnfitriaoRoleGuard>
  );
}
