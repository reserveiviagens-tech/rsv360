'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AnfitriaoRoleGuard from '../components/AnfitriaoRoleGuard';
import { RsvCrmShell } from '../components/lintel/rsv-crm-shell';

/** Rota legada — mesma experiência que Overview › Locações (referência Pagina Rentals 2.mp4). */
export default function RentalsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    void router.replace({ pathname: '/overview', query: { tab: 'rentals' } });
  }, [router, router.isReady]);

  return (
    <AnfitriaoRoleGuard>
      <RsvCrmShell>
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-gray-500">
          …
        </div>
      </RsvCrmShell>
    </AnfitriaoRoleGuard>
  );
}
