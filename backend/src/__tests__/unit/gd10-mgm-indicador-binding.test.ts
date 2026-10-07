/**
 * G-D.10 / OD-GD-10 — MGM indicadorId server-side binding.
 * BODY ≠ AUTHORITY.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveIndicadorIdFromAuth } from '../../../../server/modules/propostas/mgm';

const repoRoot = join(__dirname, '../../../..');

function readRepo(...parts: string[]): string {
  return readFileSync(join(repoRoot, ...parts), 'utf8');
}

describe('G-D.10 — resolveIndicadorIdFromAuth', () => {
  it('Caso 1 — JWT user A → indicador autorizado = A (ALLOW)', () => {
    expect(
      resolveIndicadorIdFromAuth({
        authenticatedUserId: 10,
        bodyIndicadorId: undefined,
      }),
    ).toEqual({ ok: true, indicadorId: 10 });
    expect(
      resolveIndicadorIdFromAuth({
        authenticatedUserId: 10,
        bodyIndicadorId: 10,
      }),
    ).toEqual({ ok: true, indicadorId: 10 });
  });

  it('Caso 2 — JWT A + body B → DENY (mismatch)', () => {
    expect(
      resolveIndicadorIdFromAuth({
        authenticatedUserId: 10,
        bodyIndicadorId: 99,
      }),
    ).toEqual({
      ok: false,
      status: 403,
      reason: 'indicador_mismatch',
    });
  });

  it('Caso 3 — sem contexto autenticado válido → DENY', () => {
    expect(
      resolveIndicadorIdFromAuth({
        authenticatedUserId: undefined,
        bodyIndicadorId: 10,
      }),
    ).toEqual({ ok: false, status: 401, reason: 'unauthenticated' });
    expect(
      resolveIndicadorIdFromAuth({
        authenticatedUserId: 0,
        bodyIndicadorId: 1,
      }),
    ).toEqual({ ok: false, status: 401, reason: 'unauthenticated' });
  });

  it('Caso 4 — body não promove autoridade (identidade efetiva = auth)', () => {
    const denied = resolveIndicadorIdFromAuth({
      authenticatedUserId: 7,
      bodyIndicadorId: 42,
    });
    expect(denied.ok).toBe(false);
    const allowed = resolveIndicadorIdFromAuth({
      authenticatedUserId: 7,
      bodyIndicadorId: '7',
    });
    expect(allowed).toEqual({ ok: true, indicadorId: 7 });
    // body sozinho nunca autoriza
    expect(
      resolveIndicadorIdFromAuth({
        authenticatedUserId: null,
        bodyIndicadorId: 999,
      }).ok,
    ).toBe(false);
  });

  it('static wiring: rota usa resolveIndicadorIdFromAuth; não Number(body.indicadorId) cru', () => {
    const routes = readRepo('server/modules/propostas/routes/index.ts');
    expect(routes).toMatch(/resolveIndicadorIdFromAuth/);
    expect(routes).toMatch(/OD-GD-10/);
    expect(routes).not.toMatch(
      /registrarIndicacao\(\{\s*indicadorId:\s*Number\(req\.body\.indicadorId\)/,
    );
    const mgm = readRepo('server/modules/propostas/mgm.ts');
    expect(mgm).toMatch(/BODY|body\.indicadorId[\s\S]*NÃO é autoridade|NÃO é autoridade/i);
  });
});
