import type { Express } from 'express';
import dealsRouter from './routes/index';

export function registerDealsModule(app: Express) {
  app.use('/api/v1/deals', dealsRouter);
  console.log('[MODULE] Deals pipeline (demo store) registrado ✓');
}

export default dealsRouter;
module.exports = { registerDealsModule, dealsRouter };
