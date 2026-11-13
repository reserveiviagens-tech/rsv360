'use client';

import { useMemo } from 'react';
import { useCrmLocale } from '../components/lintel/crm-locale-provider';
import { getCrmCopy } from '../components/lintel/crm-copy';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AnfitriaoRoleGuard from '../components/AnfitriaoRoleGuard';
import { useAuth } from '@/context/AuthContext';
import {
  useAnfitriaoDashboard,
  useAnfitriaoMinhasComissoes,
  useOverviewCarteiraVinculos,
  useOverviewPortfolioUnits,
} from '@/hooks/useAnfitriao';
import RSV360ExecutiveDashboard, {
  type OverviewListingKpis,
} from '../components/RSV360ExecutiveDashboard';
import {
  aggregatePaidComissoesByMonth,
  shouldUseLintelCommissionDemo,
} from '../components/lintel/commission-chart';
import { carteiraToOverviewContacts } from '@/lib/overview-contacts';
import {
  portfolioPinSummary,
  unidadesToHeroListings,
  unidadesToPortfolioPins,
} from '@/lib/overview-portfolio';
import { RsvCrmShell } from '../components/lintel/rsv-crm-shell';
import { lintelDisplayFirstName } from '../components/lintel/overview-primitives';

const ROLE_TITLES: Record<string, string> = {
  corretor: 'Captador & gestor de carteira',
  anfitriao: 'Proprietário de acomodação',
  admin: 'Staff · visão parceiro',
  manager: 'Staff · visão parceiro',
};

function OverviewContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: comissoesData, isLoading: commissionQueryLoading } = useAnfitriaoMinhasComissoes();
  const { data: dashboardData, isLoading: dashboardLoading } = useAnfitriaoDashboard();
  const { data: unidadesData } = useOverviewPortfolioUnits();
  const { data: carteiraData, isLoading: carteiraLoading } = useOverviewCarteiraVinculos();
  const { copy } = useCrmLocale();
  const role = String(user?.role ?? '');
  const displayName = lintelDisplayFirstName(
    user?.name || user?.email || 'Parceiro',
  );
  const roleTitle = ROLE_TITLES[role] ?? 'Parceiro · captação & vendas';

  const commissionSeriesRaw = useMemo(() => {
    const items = comissoesData?.data?.items ?? [];
    return aggregatePaidComissoesByMonth(items);
  }, [comissoesData]);

  const useCommissionDemo = shouldUseLintelCommissionDemo(commissionSeriesRaw);
  /** P0: demo USD não espera API lenta — evita gráfico vazio no comparativo Lintel. */
  const commissionLoading = useCommissionDemo
    ? false
    : commissionQueryLoading && comissoesData == null;
  const commissionSeries12M = useCommissionDemo ? null : commissionSeriesRaw;
  const commissionCurrency = useCommissionDemo ? ('USD' as const) : ('BRL' as const);

  /** Paridade visual Lintel (vídeo Overview): KPIs demo quando comissão está em demo. */
  const listingKpis: OverviewListingKpis = useCommissionDemo
    ? {
        publicadas: 10,
        emAprovacao: 3,
        incompletas: 0,
        isLoading: false,
      }
    : {
        publicadas: dashboardData?.data?.publicadas ?? 0,
        emAprovacao: dashboardData?.data?.emAprovacao ?? 0,
        incompletas: dashboardData?.data?.incompletas ?? 0,
        isLoading: dashboardLoading,
      };

  const unidades = unidadesData?.data?.items ?? [];

  const portfolioPins = useMemo(() => unidadesToPortfolioPins(unidades), [unidades]);
  const featuredHeroListings = useMemo(() => unidadesToHeroListings(unidades), [unidades]);
  const portfolioMapSummary = useMemo(() => portfolioPinSummary(unidades), [unidades]);

  const carteiraContacts = useMemo(() => {
    const items = carteiraData?.data?.items ?? [];
    return carteiraToOverviewContacts(items, role);
  }, [carteiraData, role]);

  return (
    <>
      <Head>
        <title>{copy.nav.overview} | {copy.brand}</title>
        <meta
          name="description"
          content="Cockpit parceiro — captação, carteira, leads e comissões RSV360°"
        />
      </Head>
      <RSV360ExecutiveDashboard
        userName={displayName}
        roleTitle={roleTitle}
        commissionSeries12M={commissionSeries12M}
        commissionCurrency={commissionCurrency}
        commissionLoading={commissionLoading}
        listingKpis={listingKpis}
        portfolioPins={
          useCommissionDemo ? null : portfolioPins.length > 0 ? portfolioPins : null
        }
        portfolioMapSummary={
          useCommissionDemo ? copy.overview.portfolioMapSubtitle : portfolioMapSummary
        }
        featuredHeroListings={
          useCommissionDemo ? null : featuredHeroListings.length > 0 ? featuredHeroListings : null
        }
        lintelVisualDemo={useCommissionDemo}
        carteiraContacts={carteiraContacts}
        carteiraContactsLoading={carteiraLoading}
        onOpenComissoes={() => void router.push('/anfitriao/comissoes')}
      />
    </>
  );
}

export default function OverviewPage() {
  return (
    <AnfitriaoRoleGuard>
      <RsvCrmShell>
        <OverviewContent />
      </RsvCrmShell>
    </AnfitriaoRoleGuard>
  );
}
