import { isLabUiPath } from '../../lib/app-mode';

describe('isLabUiPath', () => {
  it('keeps public listing slug routes on marketing-lab host', () => {
    expect(isLabUiPath('/h')).toBe(true);
    expect(isLabUiPath('/h/editor-rsv-443')).toBe(true);
  });

  it('still recognizes cotacao/proposta prefixes', () => {
    expect(isLabUiPath('/cotacao')).toBe(true);
    expect(isLabUiPath('/proposta/abc')).toBe(true);
  });

  it('does not treat unrelated B2C paths as lab UI', () => {
    expect(isLabUiPath('/hoteis')).toBe(false);
    expect(isLabUiPath('/buscar')).toBe(false);
  });
});
