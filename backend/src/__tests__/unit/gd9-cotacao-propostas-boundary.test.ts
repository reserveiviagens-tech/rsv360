/**
 * G-D.9 — Boundary cotacao-publica × propostas (contrato estático).
 * Não reabre economic / MGM staff / RANK / AI / staffAuth / WS.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '../../../..');

function readRepo(...parts: string[]): string {
  return readFileSync(join(repoRoot, ...parts), 'utf8');
}

describe('G-D.9 — boundary cotacao-publica × propostas', () => {
  const propostasRoutes = readRepo('server/modules/propostas/routes/index.ts');
  const cotacaoRoutes = readRepo('server/modules/cotacao-publica/routes/index.ts');
  const contract = readRepo('.agents/shared/GD9_BOUNDARY_CONTRACT.md');
  const authMw = readRepo('server/middleware/auth.middleware.ts');

  it('C1 — accept público só em cotacao-publica; :id accept = staff/owner', () => {
    expect(cotacaoRoutes).toMatch(
      /router\.post\('\/proposta\/:token\/aceitar',\s*publicLimiter/,
    );
    expect(cotacaoRoutes).toMatch(/G-D\.9 C1/);
    expect(propostasRoutes).toMatch(/G-D\.9 C1/);
    expect(propostasRoutes).toContain("router.post('/:id/responder'");
    expect(propostasRoutes).toMatch(/action === 'accept'/);
    expect(propostasRoutes).toMatch(/isPropostaStaff\(req\.user\) && !ownsProposta/);
  });

  it('C3/C4 — dependência de serviço permitida; sem staffAuth em cotacao pública', () => {
    expect(cotacaoRoutes).not.toMatch(/staffAuth|agentAuth|parceiroAuth/);
    expect(cotacaoRoutes).not.toMatch(/requireEnterpriseRole|authorizedEnterpriseContext/);
    expect(propostasRoutes).toMatch(/cotacaoPublicaService/);
    const cotacaoService = readRepo(
      'server/modules/cotacao-publica/services/cotacao-publica.service.ts',
    );
    expect(cotacaoService).toMatch(/propostasService|from ['"].*propostas/);
  });

  it('C5 — não reabre economic / RANK / AI / MGM staff resolver nas rotas cotação', () => {
    expect(cotacaoRoutes).not.toMatch(/canMutatePropostaEconomicFields|normalizeValorTotalCap/);
    expect(cotacaoRoutes).not.toMatch(/resolveIndicadorIdFromAuth/);
    expect(cotacaoRoutes).not.toMatch(/PROPOSTAS_LOCAL_ROLE_RANK|isPropostasAprovador/);
    expect(cotacaoRoutes).not.toMatch(/resolvePapel|requireAgentesAtivo/);
  });

  it('C6 — dual indicação documentada; staff path mantém G-D.10', () => {
    expect(cotacaoRoutes).toMatch(/G-D\.9 C6/);
    expect(cotacaoRoutes).toMatch(/router\.post\('\/proposta\/:token\/indicacao'/);
    expect(propostasRoutes).toMatch(/resolveIndicadorIdFromAuth/);
    expect(contract).toMatch(/Indicação dual/);
    expect(contract).toMatch(/G-D\.10/);
    expect(contract).toMatch(/JWT binding/);
  });

  it('staffAuth export global intocado; contrato G-D.9 presente', () => {
    expect(authMw).toMatch(
      /export const staffAuth = \[authenticateJwt, requireRole\('admin', 'manager', 'user'\)\]/,
    );
    expect(contract).toMatch(/G-D\.9 Boundary Contract/);
    expect(contract).toMatch(/NÃO merge de routers/);
  });
});
