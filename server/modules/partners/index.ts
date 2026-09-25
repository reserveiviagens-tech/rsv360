import type { Express } from 'express';
import partnersRouter from './routes/index';

export function registerPartnersModule(app: Express) {
  app.use('/api/v1/partners', partnersRouter);
  console.log('[MODULE] Partners (Fatia A) registrado ✓');
}

export default partnersRouter;
module.exports = { registerPartnersModule, partnersRouter };
