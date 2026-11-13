import { maskEmail, maskPhone } from '../pii-mask';

describe('pii-mask', () => {
  it('masks email local part', () => {
    expect(maskEmail('user@example.com')).toBe('us***@example.com');
  });

  it('masks phone tail digits', () => {
    expect(maskPhone('+55 11 98765-4321')).toBe('***4321');
  });
});
