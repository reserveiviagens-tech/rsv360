const notificationsRouter = require('./routes');
const managementRouter = require('./management-routes');
const settingsRouter = require('./settings-routes');
const repo = require('./notification.repository');

async function registerNotificationsModule(app) {
  await repo.init();
  const retentionDays = parseInt(process.env.NOTIFICATION_DELIVERY_RETENTION_DAYS || '90', 10);
  void repo.purgeOldDeliveries(retentionDays).catch(() => {});
  app.use('/api/v1/notifications', managementRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/settings', settingsRouter);
  console.log('[MODULE] Notifications hub (CNU) registrado em /api/v1/notifications ✓');
  console.log('[MODULE] Settings API (notificações) em /api/v1/settings ✓');
}

module.exports = {
  registerNotificationsModule,
  notificationsRouter,
};
