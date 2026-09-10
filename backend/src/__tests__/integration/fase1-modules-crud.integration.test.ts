import request from 'supertest';
const { createApp } = require('../../../app');
import { applyTestMigrations, hasDatabase } from '../../test/fase1-db-setup';
import { authHeader } from '../../test/fase1-test-helpers';

const describeDb = hasDatabase() ? describe : describe.skip;

describeDb('Fase 1 — CRUD integrado (7 módulos)', () => {
  let app: any;
  let orcamentoId: number;
  let propostaId: number;
  let passageiroId: number;

  beforeAll(async () => {
    applyTestMigrations();
    app = await createApp();
  });

  it('cria orçamento + item + converte em proposta', async () => {
    const createOrc = await request(app)
      .post('/api/v1/orcamentos')
      .set(authHeader())
      .send({
        titulo: 'Orçamento Jest',
        clienteNome: 'Cliente Test',
        tipo: 'personalizado',
        status: 'draft',
      });
    expect(createOrc.status).toBe(201);
    orcamentoId = createOrc.body.data.id;

    const addItem = await request(app)
      .post(`/api/v1/orcamentos/${orcamentoId}/itens`)
      .set(authHeader())
      .send({
        nome: 'Hotel 3 noites',
        quantidade: 1,
        precoUnitario: '1200.00',
      });
    expect(addItem.status).toBe(201);

    const convert = await request(app)
      .post(`/api/v1/orcamentos/${orcamentoId}/converter-proposta`)
      .set(authHeader())
      .send({});
    expect(convert.status).toBe(201);
    propostaId = convert.body.data.id;
    expect(propostaId).toBeTruthy();
  });

  it('CRUD proposta — leitura e atualização', async () => {
    const getRes = await request(app)
      .get(`/api/v1/propostas/${propostaId}`)
      .set(authHeader());
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.titulo).toBeTruthy();

    const update = await request(app)
      .put(`/api/v1/propostas/${propostaId}`)
      .set(authHeader())
      .send({ titulo: 'Proposta Jest Atualizada', isPublica: true, status: 'sent' });
    expect(update.status).toBe(200);
    expect(update.body.data.titulo).toBe('Proposta Jest Atualizada');
  });

  it('passageiro + documento + FNRH', async () => {
    const create = await request(app)
      .post('/api/v1/passageiros')
      .set(authHeader())
      .send({ nome: 'Passageiro Jest', cpf: '12345678901', email: 'pass@test.local' });
    expect(create.status).toBe(201);
    passageiroId = create.body.data.id;

    const doc = await request(app)
      .post(`/api/v1/passageiros/${passageiroId}/documentos`)
      .set(authHeader())
      .send({ tipo: 'rg', numero: 'MG123456' });
    expect(doc.status).toBe(201);

    const fnrh = await request(app)
      .post(`/api/v1/passageiros/${passageiroId}/fnrh`)
      .set(authHeader())
      .send({ hotelNome: 'Hotel Test', dataEntrada: '2026-07-01', dataSaida: '2026-07-04' });
    expect(fnrh.status).toBe(201);
  });

  it('financeiro — dashboard e transação', async () => {
    const dash = await request(app).get('/api/v1/financeiro/dashboard').set(authHeader());
    expect(dash.status).toBe(200);
    expect(dash.body.success).toBe(true);

    const tx = await request(app)
      .post('/api/v1/financeiro/transacoes')
      .set(authHeader())
      .send({ tipo: 'receita', descricao: 'Teste Jest', valor: '500.00', status: 'pago' });
    expect(tx.status).toBe(201);
  });

  it('campanhas — campanha + cupom + métricas', async () => {
    const camp = await request(app)
      .post('/api/v1/campanhas')
      .set(authHeader())
      .send({ nome: 'Campanha Jest', tipo: 'desconto', status: 'ativa' });
    expect(camp.status).toBe(201);
    const campanhaId = camp.body.data.id;

    const cupom = await request(app)
      .post('/api/v1/campanhas/cupons')
      .set(authHeader())
      .send({ codigo: `JEST${Date.now()}`, tipoDesconto: 'percentage', valorDesconto: '10.00' });
    expect(cupom.status).toBe(201);

    const metricas = await request(app).get('/api/v1/campanhas/metricas').set(authHeader());
    expect(metricas.status).toBe(200);
  });

  it('logística — fornecedor + voucher', async () => {
    const forn = await request(app)
      .post('/api/v1/logistica/fornecedores')
      .set(authHeader())
      .send({ nome: 'Fornecedor Jest', categoria: 'hotel', status: 'ativo' });
    expect(forn.status).toBe(201);

    const voucher = await request(app)
      .post('/api/v1/logistica/vouchers')
      .set(authHeader())
      .send({ codigo: `VCH-${Date.now()}`, titulo: 'Voucher Jest Test' });
    expect(voucher.status).toBe(201);
  });

  it('relatórios — dashboard + export CSV', async () => {
    const dash = await request(app).get('/api/v1/relatorios/dashboard').set(authHeader());
    expect(dash.status).toBe(200);
    expect(dash.body.data).toBeDefined();

    const csv = await request(app).get('/api/v1/relatorios/export/csv?tipo=propostas').set(authHeader());
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
  });
});
