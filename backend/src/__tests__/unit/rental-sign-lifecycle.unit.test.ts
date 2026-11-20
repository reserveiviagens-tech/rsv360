import {
  effectiveSignStatus,
  maskSignerCpf,
} from '../../../../server/modules/rental-contracts/services/rental-sign-lifecycle.util';

describe('rental-sign-lifecycle.util', () => {
  it('maskSignerCpf hides digits except last two', () => {
    expect(maskSignerCpf('123.456.789-01')).toBe('***.***.***-01');
    expect(maskSignerCpf('invalid')).toBe('***');
  });

  it('effectiveSignStatus marks pending as expired when past expiresAt', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(effectiveSignStatus('pending', past)).toBe('expired');
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(effectiveSignStatus('pending', future)).toBe('pending');
    expect(effectiveSignStatus('signed', past)).toBe('signed');
  });
});