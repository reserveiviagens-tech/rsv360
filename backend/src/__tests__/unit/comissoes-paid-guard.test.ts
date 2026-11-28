import { avaliarComissaoPropostaStatus } from '../../../../server/modules/comissoes/services/comissoes-paid-guard';

describe('comissoes-paid-guard', () => {
  it('allows paid', () => {
    expect(avaliarComissaoPropostaStatus('paid').allowed).toBe(true);
    expect(avaliarComissaoPropostaStatus('PAID').allowed).toBe(true);
  });

  it.each(['pending', 'draft', 'cancelled', 'rejected'])('blocks %s', (status) => {
    const gate = avaliarComissaoPropostaStatus(status);
    expect(gate.allowed).toBe(false);
    if (gate.allowed) return;
    expect(gate.code).toBe('proposta_status_blocked');
    expect(gate.status).toBe(status);
  });
});