import { buildRentalContractPdf } from '../../../../server/modules/rental-contracts/services/rental-contract.service';

describe('rental contract PDF', () => {
  it('emits a valid PDF header and unit name', () => {
    const pdf = buildRentalContractPdf({
      unitId: 'r1',
      unitName: 'Loft Jardins',
      address: 'Rua Exemplo, 100',
      tenantName: 'Maria Silva',
      monthlyRent: 4500,
      termMonths: 12,
      startDate: '2026-11-17',
    });

    const head = pdf.subarray(0, 8).toString('utf8');
    expect(head.startsWith('%PDF-1.')).toBe(true);
    const raw = pdf.toString('utf8');
    expect(raw).toContain('Loft Jardins');
  });
});