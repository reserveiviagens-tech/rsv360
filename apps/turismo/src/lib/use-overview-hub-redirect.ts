'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import type { OverviewHubTab } from './overview-hub-links';

/**
 * Redireciona rotas standalone (/deals, /leads, /contacts) para o hub unificado no Overview.
 */
export function useOverviewHubRedirect(tab: Exclude<OverviewHubTab, 'overview' | 'sales' | 'rentals'>) {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    if (router.pathname === '/overview') return;

    const query: Record<string, string> = { tab };
    for (const [key, value] of Object.entries(router.query)) {
      if (typeof value === 'string') query[key] = value;
    }

    void router.replace({ pathname: '/overview', query }, undefined, { shallow: false });
  }, [router.isReady, router.pathname, router.query, tab]);

  return !router.isReady || (router.pathname !== '/overview' && router.isReady);
}