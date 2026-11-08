import React, { useMemo } from 'react';
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
import { aggregatePaidComissoesByMonth } from '../components/lintel/commission-chart';
import { carteiraToOverviewContacts } from '@/lib/overview-contacts';
import {
  portfolioPinSummary,
  unidadesToHeroListings,
  unidadesToPortfolioPins,
} from '@/lib/overview-portfolio';

const ROLE_TITLES: Record<string, string> = {
  corretor: 'Captador & gestor de carteira',
  anfitriao: 'Proprietário de acomodação',
  admin: 'Staff · visão parceiro',
  manager: 'Staff · visão parceiro',
};

export default function OverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: comissoesData } = useAnfitriaoMinhasComissoes();
  const { data: dashboardData, isLoading: dashboardLoading } = useAnfitriaoDashboard();
  const { data: unidadesData } = useOverviewPortfolioUnits();
  const { data: carteiraData, isLoading: carteiraLoading } = useOverviewCarteiraVinculos();
  const role = String(user?.role ?? '');
  const displayName = user?.name || user?.email?.split('@')[0] || 'Parceiro RSV360°';
  const roleTitle = ROLE_TITLES[role] ?? 'Parceiro · captação & vendas';

  const commissionSeries12M = useMemo(() => {
    const items = comissoesData?.data?.items ?? [];
    return aggregatePaidComissoesByMonth(items);
  }, [comissoesData]);

  const commissionCurrency = commissionSeries12M ? ('BRL' as const) : ('USD' as const);

  const listingKpis: OverviewListingKpis = {
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
    <AnfitriaoRoleGuard>
      <Head>
        <title>Overview · Parceiros RSV360°</title>
        <meta
          name="description"
          content="Cockpit parceiro — captação, carteira, leads e comissões RSV360°"
        />
      </Head>
      <RSV360ExecutiveDashboard
        userName={displayName}
        roleTitle={roleTitle}
        onNewListing={() => void router.push('/anfitriao/unidades')}
        commissionSeries12M={commissionSeries12M}
        commissionCurrency={commissionCurrency}
        listingKpis={listingKpis}
        portfolioPins={portfolioPins.length > 0 ? portfolioPins : null}
        portfolioMapSummary={portfolioMapSummary}
        featuredHeroListings={featuredHeroListings.length > 0 ? featuredHeroListings : null}
        carteiraContacts={carteiraContacts}
        carteiraContactsLoading={carteiraLoading}
        onOpenComissoes={() => void router.push('/anfitriao/comissoes')}
      />
    </AnfitriaoRoleGuard>
  );
}
