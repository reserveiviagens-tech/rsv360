'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { lintelNavTab, LintelNavTabBadge } from './overview-primitives';
import { useCrmLocale } from './crm-locale-provider';

export const LintelShellNav = React.memo(function LintelShellNav() {
  const router = useRouter();
  const { copy } = useCrmLocale();
  const path = router.pathname;

  const TABS = [
    { href: '/overview', label: copy.nav.overview },
    { href: '/overview?tab=rentals', label: copy.nav.rentals },
    { href: '/deals', label: copy.nav.deals },
    { href: '/leads', label: copy.nav.leads, badge: 4 as const },
    { href: '/contacts', label: copy.nav.contacts },
  ] as const;

  const isActive = (href: string) => {
    if (href === '/overview') return path === '/overview' && !router.query.tab;
    if (href.includes('tab=rentals'))
      return path === '/rentals' || (path === '/overview' && router.query.tab === 'rentals');
    if (href === '/contacts') return path === '/contacts' || (path === '/overview' && router.query.tab === 'contacts');
    return path === href;
  };

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label={copy.brand}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={lintelNavTab(isActive(tab.href))}
        >
          {tab.label}
          {'badge' in tab && tab.badge ? <LintelNavTabBadge value={tab.badge} /> : null}
        </Link>
      ))}
    </nav>
  );
});
