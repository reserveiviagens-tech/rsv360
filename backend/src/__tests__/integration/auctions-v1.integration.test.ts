import request from 'supertest';
import express from 'express';
import { auctionsRouter } from '../../api/v1/auctions/routes';

function buildAuctionsApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auctions', auctionsRouter);
  return app;
}

describe('auctions v1', () => {
  const app = buildAuctionsApp();
  const originalDbUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDbUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDbUrl;
    }
  });

  it('returns 501 when DATABASE_URL is not configured', async () => {
    delete process.env.DATABASE_URL;
    const response = await request(app).get('/api/v1/auctions');
    expect(response.status).toBe(501);
    expect(response.body.success).toBe(false);
  });

  it('returns 401 for bid without token when DB enabled', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const response = await request(app).post('/api/v1/auctions/1/bids').send({ amount: 100 });
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid auction id on detail', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const response = await request(app).get('/api/v1/auctions/not-a-number');
    expect(response.status).toBe(400);
  });

  it('returns 401 for update without token when DB enabled', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const response = await request(app)
      .put('/api/v1/auctions/1')
      .send({ title: 'Atualizado', status: 'active' });
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid auction id on update', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const response = await request(app)
      .put('/api/v1/auctions/not-a-number')
      .send({ title: 'Atualizado' });
    expect(response.status).toBe(400);
  });

  it('returns 401 for finalize without token when DB enabled', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const response = await request(app).post('/api/v1/auctions/1/finalize');
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid auction id on finalize', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const response = await request(app).post('/api/v1/auctions/abc/finalize');
    expect(response.status).toBe(400);
  });
});
