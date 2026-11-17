import type { Express } from 'express';
import rentalContractsRouter from './routes/index';

export function registerRentalContractsModule(app: Express) {
  app.use('/api/v1/rental-contracts', rentalContractsRouter);
  console.log('[MODULE] Rental contracts (PDF + e-sign stub) registrado ✓');
}

export default rentalContractsRouter;
module.exports = { registerRentalContractsModule, rentalContractsRouter };