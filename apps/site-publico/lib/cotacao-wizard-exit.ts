import {
  buildPrimarySiteUrl,
  isMarketingLabMode,
} from '@/lib/app-mode';

export type WizardExitContext = {
  canal?: string | null;
  ref?: string | null;
};

/**
 * Allowlist fixa: canal/ref são apenas chaves → destino hardcoded.
 * NUNCA montar URL a partir do valor da query (open redirect).
 * Ex.: canal=https://evil.example NÃO deve virar href externo.
 * Novos canais (s1-parques, s1-atracoes…) entram só expandindo esta tabela.
 */
const EXIT_BY_CANAL: Record<string, string> = {
  's1-hoteis': '/hoteis',
};

const EXIT_BY_REF: Record<string, string> = {
  hoteis: '/hoteis',
};

/**
 * Destino do botão "Voltar" no wizard de cotação (sair do fluxo).
 * Cascata: allowlist canal/ref → /lab (marketing-lab) → / (public).
 */
export function resolveWizardExitHref(
  ctx: WizardExitContext,
  options?: {
    isMarketingLab?: boolean;
    buildPrimary?: (pathname: string, search: string) => string;
  },
): string {
  // Match exato após trim — sem substring e sem usar o valor como URL.
  const canal = ctx.canal?.trim() ?? '';
  const ref = ctx.ref?.trim() ?? '';

  const pathFromAllowlist = EXIT_BY_CANAL[canal] ?? EXIT_BY_REF[ref] ?? null;
  if (pathFromAllowlist) {
    const build = options?.buildPrimary ?? buildPrimarySiteUrl;
    const href = build(pathFromAllowlist, '');
    // Garantir absoluto: href relativo (/hoteis) fica no host do Lab (sslip), não no www.
    if (/^https?:\/\//i.test(href)) return href;
    const primary = buildPrimarySiteUrl(pathFromAllowlist, '');
    if (/^https?:\/\//i.test(primary)) return primary;
    return `https://www.reserveiviagens.com.br${pathFromAllowlist}`;
  }

  const lab = options?.isMarketingLab ?? isMarketingLabMode();
  return lab ? '/lab' : '/';
}
