import {
  __resetGuiasCacheForTests,
  loadGuiasInstrutor,
} from '../../../../server/modules/agentes/instrutor/guias-loader';
import { triagemT0 } from '../../../../server/modules/agentes/instrutor/triagem';
import { solicitaValorConcreto } from '../../../../server/modules/agentes/instrutor/instrutor-t1';
import { papelFromRole, resolvePapel } from '../../../../server/modules/agentes/instrutor/papel';

describe('Instrutor — triagem T0', () => {
  beforeAll(() => {
    __resetGuiasCacheForTests();
    loadGuiasInstrutor(true);
  });

  it('saudação → resposta fixa T0', () => {
    const r = triagemT0('Olá!', 'staff');
    expect(r.destino).toBe('t0');
    if (r.destino === 't0') {
      expect(r.resposta).toMatch(/Instrutor/i);
      expect(r.resposta).toMatch(/Onde clicar:/i);
    }
  });

  it('agradecimento → resposta fixa T0', () => {
    const r = triagemT0('Obrigado!', 'staff');
    expect(r.destino).toBe('t0');
  });

  it('match forte de guia (orçamento) → T0 com onde clicar', () => {
    const r = triagemT0('Como criar um orçamento com itens no módulo orçamentos?', 'staff');
    expect(r.destino).toBe('t0');
    if (r.destino === 't0') {
      expect(r.resposta).toMatch(/Onde clicar:/i);
      expect(r.motivo).toMatch(/guia:/);
    }
  });

  it('pergunta genérica sem match → T1', () => {
    const r = triagemT0('xyzzy plugh foobar aleatório 999', 'staff');
    expect(r.destino).toBe('t1');
  });
});

describe('Instrutor — papel e bloqueio de valores', () => {
  it('deriva anfitriao/corretor vs staff; body hint validado (OD-GD-07)', () => {
    expect(papelFromRole('anfitriao')).toBe('anfitriao');
    expect(papelFromRole('corretor')).toBe('anfitriao');
    expect(papelFromRole('admin')).toBe('staff');
    // G-D.8: body não prevalece — divergência = DENY
    expect(resolvePapel('user', 'anfitriao')).toEqual({
      ok: false,
      status: 403,
      reason: 'papel_mismatch',
    });
    expect(resolvePapel('anfitriao', 'anfitriao')).toEqual({
      ok: true,
      papel: 'anfitriao',
    });
    expect(resolvePapel('admin', 'staff')).toEqual({ ok: true, papel: 'staff' });
    expect(resolvePapel('admin', undefined)).toEqual({ ok: true, papel: 'staff' });
    expect(resolvePapel('user', 'ambos')).toEqual({ ok: true, papel: 'staff' });
  });

  it('detecta pedido de valor concreto', () => {
    expect(solicitaValorConcreto('quanto custa a diária?')).toBe(true);
    expect(solicitaValorConcreto('como bloquear datas no calendário?')).toBe(false);
  });
});
