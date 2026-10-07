/**
 * G-D.8 — Agentes AI auth (OD-GD-07 / OD-GD-08).
 * CODE GO — G-D.8 only.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  papelFromRole,
  resolvePapel,
} from '../../../../server/modules/agentes/instrutor/papel';

const repoRoot = join(__dirname, '../../../..');

function readRepo(...parts: string[]): string {
  return readFileSync(join(repoRoot, ...parts), 'utf8');
}

describe('G-D.8 — resolvePapel OD-GD-07', () => {
  it('body diverge do claim → DENY', () => {
    expect(resolvePapel('admin', 'anfitriao')).toEqual({
      ok: false,
      status: 403,
      reason: 'papel_mismatch',
    });
    expect(resolvePapel('anfitriao', 'staff')).toEqual({
      ok: false,
      status: 403,
      reason: 'papel_mismatch',
    });
  });

  it('body match ou ausente → claim', () => {
    expect(resolvePapel('corretor', 'anfitriao')).toEqual({
      ok: true,
      papel: 'anfitriao',
    });
    expect(resolvePapel('manager', undefined)).toEqual({ ok: true, papel: 'staff' });
    expect(papelFromRole('host')).toBe('anfitriao');
  });

  it('body nunca prevalece sozinho (contrato anti body-as-authority)', () => {
    const src = readRepo('server/modules/agentes/instrutor/papel.ts');
    expect(src).toMatch(/OD-GD-07/);
    expect(src).toMatch(/body nunca é autoridade/i);
    expect(src).not.toMatch(/if \(bodyPapel === 'staff' \|\| bodyPapel === 'anfitriao'\) return bodyPapel;/);
  });
});

describe('G-D.8 — GET /config JWT OD-GD-08', () => {
  it('static: /config exige authenticateJwt após flag gate', () => {
    const routes = readRepo('server/modules/agentes/routes/index.ts');
    expect(routes).toMatch(/OD-GD-08/);
    expect(routes).toMatch(/router\.get\('\/config',\s*authenticateJwt/);
    expect(routes).toMatch(/!resolved\.ok/);
    expect(routes).not.toMatch(/parceiroAuth/);
    expect(routes).not.toMatch(/requireEnterpriseRole/);
  });
});
