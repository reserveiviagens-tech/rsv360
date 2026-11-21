import {
  mapRawEventToExportRow,
  signAuditRowsToCsv,
} from '../../../../server/modules/rental-contracts/services/rental-sign-audit-export.util';

describe('rental-sign-audit-export.util', () => {
  it('sanitizes metadata in export rows', () => {
    const row = mapRawEventToExportRow('sr1', 'u1', {
      id: 'ev1',
      eventType: 'signed',
      occurredAt: '2026-11-20T12:00:00.000Z',
      metadata: { actor: 'locatario', clientIp: '1.2.*.*', token: 'must-drop' },
    });
    expect(row.label).toBe('Assinatura concluída');
    expect(row.metadata).not.toHaveProperty('token');
  });

  it('renders CSV with BOM', () => {
    const csv = signAuditRowsToCsv([
      {
        eventId: 'ev1',
        signRequestId: 'sr1',
        unitId: 'u1',
        eventType: 'created',
        label: 'Pedido criado',
        occurredAt: '2026-11-20T12:00:00.000Z',
      },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('event_id');
  });
});