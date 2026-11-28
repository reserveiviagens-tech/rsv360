'use client';

import { useCrmLocale } from './crm-locale-provider';

export function CrmBrandMark({ className = '' }: { className?: string }) {
  const { copy } = useCrmLocale();
  return (
    <span className={`text-sm font-black tracking-tight text-slate-900 dark:text-white ${className}`}>
      {copy.brand}
    </span>
  );
}
