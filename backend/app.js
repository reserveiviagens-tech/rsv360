const express = require('express');
const cors = require('cors');
const qs = require('qs');
require('tsx/cjs');
const { SecurityConfig } = require('./src/middleware/security-config');
const { portalRouter, adminRouter } = require('../server/modules/guest-portal/routes');
const { brandingHeaders } = require('./src/middleware/security-headers');
const { canonicalRedirect } = require('./src/middleware/canonical-redirect');
const { infoRouter } = require('./src/routes/info.route');
const { cloneAlertRouter } = require('./src/routes/clone-alert.route');
const { trackingRouter } = require('./src/routes/tracking.route');
const { metricsRouter, metricsMiddleware } = require('./src/routes/metrics.route');
const { docsRouter, openApiSpec } = require('./src/routes/docs.route');

function trustedProxyAllowlist(env = process.env) {
  const configured = String(env.TRUST_PROXY || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : ['loopback'];
}

async function createApp() {
  const app = express();

  // Trust only explicit edge CIDRs/names. Never trust arbitrary client-forwarded headers.
  app.set('trust proxy', trustedProxyAllowlist());

  // PR-07b C4 — limit nested query objects (default Express extended/qs is unbounded depth)
  app.set('query parser', (str) =>
    qs.parse(str, { depth: 0, parameterLimit: 100, allowPrototypes: false }),
  );

  await SecurityConfig.initialize(app);

  app.use(cors(SecurityConfig.getCorsOptions()));
  app.use(brandingHeaders);
  app.use(canonicalRedirect);
  app.use(metricsMiddleware);
  app.use('/api/v1/payments/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  let tenantMiddleware = (req, _res, next) => {
    req.propertyId = 1;
    next();
  };

  try {
    const multiPropertyModule = require('../server/modules/multi-property');
    const loaded = await multiPropertyModule.registerMultiPropertyModule(app);
    tenantMiddleware = loaded.tenantMiddleware || tenantMiddleware;
    console.log('[BOOT] Multi-property module loaded');
  } catch (err) {
    console.warn('[BOOT] Multi-property module failed:', err.message);
  }

  app.use('/api', tenantMiddleware);
  const { enterpriseContextMiddleware } = require('./src/middleware/enterprise-context');
  app.use('/api/v1', enterpriseContextMiddleware);

  const paymentsRoutes = require('./server/modules/payments/routes');

  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'RSV360 Backend API',
      message: 'RSV360 Backend API Server',
      security: 'SecurityShield360 Phase 2 Active',
      author: 'Douglas P. Figueiredo',
      copyright: '© 2024-2026 Reservei Viagens LTDA',
      website: 'https://www.reserveiviagens.com.br',
    });
  });

  SecurityConfig.setupHealthCheck(app);
  app.use('/api/info', infoRouter);
  app.use('/api/docs', docsRouter);
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });
  app.use('/metrics', metricsRouter);
  app.use('/api/clone-alert', cloneAlertRouter);
  app.use('/api/tracking', trackingRouter);
  app.use('/api/v1/payments', paymentsRoutes);
  const { authRouter } = require('./src/api/v1/auth/routes');
  app.use('/api/v1/auth', authRouter);
  const { auctionsRouter } = require('./src/api/v1/auctions/routes');
  app.use('/api/v1/auctions', auctionsRouter);
  const { tenantRouter } = require('./src/api/v1/tenant/routes');
  app.use('/api/v1/tenant', tenantRouter);
  app.use('/api/portal', portalRouter);
  app.use('/api/admin/portal', adminRouter);

  // Aruanda B1: explicit 410 for archived modules (never mount pricing/cloud/comm/mkt).
  const { registerDeadModuleStubs } = require('./src/routes/dead-modules.route');
  registerDeadModuleStubs(app);

  try {
    const housekeepingModule = require('../server/modules/housekeeping');
    housekeepingModule.registerHousekeepingModule(app);
    console.log('[MODULE] Housekeeping carregado ✓');
  } catch (err) {
    console.warn('[MODULE] Housekeeping não disponível:', err.message);
  }

  try {
    const revenueModule = require('../server/modules/revenue');
    revenueModule.registerRevenueModule(app);
    console.log('[MODULE] Revenue Engine carregado ✓');
  } catch (err) {
    console.warn('[MODULE] Revenue Engine não disponível:', err.message);
  }

  try {
    const crmModule = require('../server/modules/crm');
    await crmModule.registerCrmModule(app);
    console.log('[BOOT] CRM & Loyalty module loaded');
  } catch (err) {
    console.warn('[BOOT] CRM module failed:', err.message);
  }

  try {
    const { registerNotificationsModule } = require('../server/modules/notifications');
    await registerNotificationsModule(app);
  } catch (err) {
    console.warn('[BOOT] Notifications hub failed:', err.message);
  }

  // PR-06a: publicLimiter boot is fail-closed (model getJwtSecret) — never warn+continue.
  const { initPublicLimiter } = require('../server/middleware/public-limiter');
  await initPublicLimiter();
  console.log('[BOOT] publicLimiter Redis/memória inicializado ✓');

  // PR-06b: MP webhook anti-flood (high ceiling) — fail-closed if init fails.
  const { initMpWebhookIpLimiter } = require('../server/middleware/mp-webhook-ip-limiter');
  await initMpWebhookIpLimiter();
  console.log('[BOOT] mpWebhookIpLimiter Redis/memória inicializado ✓');

  // PR-13e-followup-e: optional Redis for shared LLM gateway budget (fallback = memory).
  try {
    const { setLlmGatewayRedis } = require('@rsv360/shared');
    const {
      isRedisRequiredForLocks,
      getRedisConnection,
    } = require('../server/modules/fornecedores-hub/redis-connection');
    if (isRedisRequiredForLocks()) {
      const client = await getRedisConnection();
      setLlmGatewayRedis(client);
      console.log('[BOOT] LLM gateway Redis budget ✓');
    } else {
      setLlmGatewayRedis(null);
      console.log('[BOOT] LLM gateway budget: in-memory (REDIS_URL ausente)');
    }
  } catch (err) {
    try {
      const { setLlmGatewayRedis } = require('@rsv360/shared');
      setLlmGatewayRedis(null);
    } catch {
      /* shared unavailable — ignore */
    }
    console.warn(
      '[BOOT] LLM gateway Redis skip (memory budget):',
      err && err.message ? err.message : err,
    );
  }

  try {
    const { registerMigracaoFase1Modules } = require('../server/app');
    registerMigracaoFase1Modules(app);
  } catch (err) {
    console.warn('[BOOT] Módulos Fase 1 falharam:', err.message);
  }

  app.use((err, req, res, next) => {
    console.error('[SERVER] Error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  return app;
}

module.exports = { createApp, trustedProxyAllowlist };
