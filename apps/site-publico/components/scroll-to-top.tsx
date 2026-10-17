'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Em SPAs/App Router o scroll do window costuma ser preservado entre rotas.
 * Sem este reset, Home → Hotéis (e qualquer outra troca) abre no mesmo Y da página anterior.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Âncoras (#secao) devem manter o salto natural do browser
    if (typeof window !== 'undefined' && window.location.hash) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
