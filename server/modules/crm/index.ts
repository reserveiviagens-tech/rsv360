const crmRouter = require('./routes/index');
export * from './routes/index';
export * from './services/index';
export * from './db/schema/index';
export * from './db/crm.repository';

const { crmRepository } = require('./db/crm.repository');

/**
 * Aruanda B6 — canonical mount is `/api/crm` (NOT `/api/v1/crm`).
 * Do not silently alias under `/api/v1`; migration requires explicit owner GO.
 */
export async function registerCrmModule(app: any) {
  await crmRepository.init();
  app.use('/api/crm', crmRouter);
  console.log('[CRM] Módulo CRM & Loyalty registrado em /api/crm (exceção canônica fora de /api/v1) ✓');
  return { repo: crmRepository };
}

export default crmRouter;

module.exports = {
  registerCrmModule,
  crmRouter,
};
