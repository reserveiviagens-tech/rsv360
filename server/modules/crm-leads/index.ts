import type { Express } from 'express';
import crmLeadsRouter from './routes/index';
import { crmLeadsUsePostgres } from './services/crm-leads.service';

export function registerCrmLeadsModule(app: Express) {
  app.use('/api/v1/leads', crmLeadsRouter);
  const persistence = crmLeadsUsePostgres() ? 'postgres' : 'memory';
  console.log(`[MODULE] CRM leads (${persistence}) registrado ✓`);
}

export default crmLeadsRouter;
module.exports = { registerCrmLeadsModule, crmLeadsRouter };