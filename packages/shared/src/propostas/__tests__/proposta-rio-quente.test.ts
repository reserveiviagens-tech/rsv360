import {
  buildPdfHtmlLintel,
  calcularPagamentoRioQuente,
  formatarMensagemWhatsApp,
  montarPropostaRioQuente,
  roundMoneyBrl,
} from '../proposta-rio-quente.service';

describe('calcularPagamentoRioQuente', () => {
  it('splits PIX entrada + 10x cartão', () => {
    const p = calcularPagamentoRioQuente(1200, 200, 10);
    expect(p.entradaPix).toBe(200);
    expect(p.saldoCartao).toBe(1000);
    expect(p.parcelas).toBe(10);
    expect(p.valorParcela).toBe(100);
  });

  it('caps parcelas at 10', () => {
    expect(calcularPagamentoRioQuente(500, 200, 24).parcelas).toBe(10);
  });
});

describe('montarPropostaRioQuente', () => {
  it('builds Luupi draft', () => {
    const d = montarPropostaRioQuente({
      hotelId: 'luupi',
      checkIn: '2026-12-10',
      checkOut: '2026-12-13',
      adultos: 2,
      entradaPix: 400,
    });
    expect('error' in d).toBe(false);
    if ('error' in d) return;
    expect(d.hotel.nome).toBe('Luupi');
    expect(d.noites).toBe(3);
    expect(d.pagamento.entradaPix).toBe(400);
  });

  it('builds Giardino with Aviva rules', () => {
    const d = montarPropostaRioQuente({
      hotelId: 'giardino',
      checkIn: '2026-01-15',
      checkOut: '2026-01-17',
      adultos: 2,
    });
    expect('error' in d).toBe(false);
    if ('error' in d) return;
    expect(d.regrasAviva.some((r) => r.includes('Hot Park'))).toBe(true);
  });
});

describe('WhatsApp e PDF', () => {
  it('formats WhatsApp message', () => {
    const d = montarPropostaRioQuente({
      hotelId: 'luupi',
      checkIn: '2026-12-10',
      checkOut: '2026-12-12',
      adultos: 2,
    });
    if ('error' in d) throw new Error('expected draft');
    const msg = formatarMensagemWhatsApp(d, { nomeCliente: 'Ana' });
    expect(msg).toContain('Ana');
    expect(msg).toContain('PIX');
  });

  it('builds PDF HTML with Lintel header', () => {
    const d = montarPropostaRioQuente({
      hotelId: 'giardino',
      checkIn: '2026-03-01',
      checkOut: '2026-03-04',
      adultos: 2,
    });
    if ('error' in d) throw new Error('expected draft');
    const html = buildPdfHtmlLintel(d);
    expect(html).toContain('#0B2239');
    expect(html).toContain('Giardino');
  });
});

describe('roundMoneyBrl', () => {
  it('rounds to cent', () => {
    expect(roundMoneyBrl(10.005)).toBe(10.01);
  });
});