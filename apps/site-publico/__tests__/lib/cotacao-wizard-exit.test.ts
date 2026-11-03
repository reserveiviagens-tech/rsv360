/**
 * Destino do botão Voltar no wizard de cotação.
 */
import { describe, it, expect } from '@jest/globals';
import { resolveWizardExitHref } from '@/lib/cotacao-wizard-exit';

describe('resolveWizardExitHref', () => {
  const buildPrimary = (pathname: string, search: string) =>
    `http://localhost:5000${pathname}${search}`;

  it('envia s1-hoteis / ref=hoteis para o site primário /hoteis', () => {
    expect(
      resolveWizardExitHref(
        { canal: 's1-hoteis', ref: 'hoteis' },
        { buildPrimary, isMarketingLab: true },
      ),
    ).toBe('http://localhost:5000/hoteis');

    expect(
      resolveWizardExitHref(
        { canal: 's1-hoteis', ref: null },
        { buildPrimary, isMarketingLab: true },
      ),
    ).toBe('http://localhost:5000/hoteis');

    expect(
      resolveWizardExitHref(
        { canal: null, ref: 'hoteis' },
        { buildPrimary, isMarketingLab: true },
      ),
    ).toBe('http://localhost:5000/hoteis');
  });

  it('em marketing-lab sem canal S1 aponta para /lab', () => {
    expect(
      resolveWizardExitHref(
        { canal: null, ref: null },
        { buildPrimary, isMarketingLab: true },
      ),
    ).toBe('/lab');
  });

  it('em modo public sem canal S1 aponta para /', () => {
    expect(
      resolveWizardExitHref(
        { canal: null, ref: null },
        { buildPrimary, isMarketingLab: false },
      ),
    ).toBe('/');
  });

  it('não aceita href relativo para saída S1 (evita /hoteis no host do Lab)', () => {
    expect(
      resolveWizardExitHref(
        { canal: 's1-hoteis', ref: 'hoteis' },
        {
          buildPrimary: (pathname) => pathname,
          isMarketingLab: true,
        },
      ),
    ).toBe('https://www.reserveiviagens.com.br/hoteis');
  });

  it('não usa canal/ref como URL (anti open-redirect)', () => {
    expect(
      resolveWizardExitHref(
        { canal: 'https://evil.example', ref: null },
        { buildPrimary, isMarketingLab: true },
      ),
    ).toBe('/lab');

    expect(
      resolveWizardExitHref(
        { canal: '//evil.example', ref: 'https://evil.example/x' },
        { buildPrimary, isMarketingLab: true },
      ),
    ).toBe('/lab');

    expect(
      resolveWizardExitHref(
        { canal: 's1-hoteis-extra', ref: 'hoteis-evil' },
        { buildPrimary, isMarketingLab: false },
      ),
    ).toBe('/');
  });
});
