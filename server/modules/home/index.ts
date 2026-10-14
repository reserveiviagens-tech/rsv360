import type { Express } from 'express';
import homeRouter from './routes/index';
import { ensureHomeSectionsUploadDir } from './home-media-optimizer';

export function registerHomeModule(app: Express) {
  try {
    ensureHomeSectionsUploadDir();
  } catch (err) {
    console.warn(
      '[MODULE] Home sections upload dir indisponível (upload falhará até corrigir permissão):',
      (err as Error).message,
    );
  }
  app.use('/api/v1/home', homeRouter);
  console.log('[MODULE] Home sections registrado ✓');
}

export default homeRouter;
module.exports = { registerHomeModule, homeRouter };
