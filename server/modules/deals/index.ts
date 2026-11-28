import type { Express } from 'express';
import dealsRouter from './routes/index';

export function registerDealsModule(app: Express) {
  app.use('/api/v1/deals', dealsRouter);
  const persistence = process.env.DEALS_PERSISTENCE ?? 'postgres';
  console.log(`[MODULE] Deals pipeline (${persistence}) registrado ✓`);
}

export default dealsRouter;
module.exports = { registerDealsModule, dealsRouter };
