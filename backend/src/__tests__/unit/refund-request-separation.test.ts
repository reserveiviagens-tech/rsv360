/**
 * C36-DD — source-level invariant: refund-request service never calls createRefund.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SERVICE = join(
  __dirname,
  '../../../server/modules/payments/services/refund-request.service.ts',
);
const ROUTES = join(
  __dirname,
  '../../../server/modules/payments/routes/refund-request.routes.ts',
);

describe('C36-DD request/execution separation (static)', () => {
  it('refund-request.service does not import RefundService or financial writers', () => {
    const src = readFileSync(SERVICE, 'utf8');
    expect(src).not.toMatch(/RefundService/);
    expect(src).not.toMatch(/from ['"].*refund\.service/);
    expect(src).not.toMatch(/reverseEarningForPaymentRefund/);
    expect(src).not.toMatch(/applyEarningReversalOnPaymentRefund/);
    expect(src).not.toMatch(/getPaymentProvider/);
  });

  it('refund-request routes expose only request + decision endpoints (no execute)', () => {
    const src = readFileSync(ROUTES, 'utf8');
    expect(src).toMatch(/router\.post\('\/'/);
    expect(src).toMatch(/router\.get\('\/:id'/);
    // C36-DE-05 authorises approve / reject: decisions only, no money movement.
    expect(src).toMatch(/router\.post\('\/:id\/approve'/);
    expect(src).toMatch(/router\.post\('\/:id\/reject'/);
    // Provider execution belongs to a later gate and must never appear here.
    expect(src).not.toMatch(/\/execute/);
    expect(src).not.toMatch(/RefundService/);
    expect(src).not.toMatch(/from ['"].*refund\.service/);
  });
});
