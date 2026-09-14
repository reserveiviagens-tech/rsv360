/**
 * Aruanda B1 — DEAD modules fail-closed contract.
 * pricing / cloud / communication / marketing are NOT mounted on boot.
 * Explicit 410 Gone so clients do not treat 404 as "typo" or silent mock.
 */

const DEAD_NOTICE =
  'Module archived (Aruanda B1). Not mounted on boot. Do not call this API.';

const DEAD_PREFIXES = [
  '/api/pricing',
  '/api/cloud',
  '/api/v1/comm',
  '/api/v1/mkt',
];

function gone(_req, res) {
  res.status(410).json({
    success: false,
    error: 'Gone',
    code: 'MODULE_DEAD',
    message: DEAD_NOTICE,
  });
}

function registerDeadModuleStubs(app) {
  for (const prefix of DEAD_PREFIXES) {
    app.use(prefix, gone);
  }
  console.log('[BOOT] DEAD module stubs (410):', DEAD_PREFIXES.join(', '));
}

module.exports = {
  registerDeadModuleStubs,
  DEAD_PREFIXES,
  DEAD_NOTICE,
};
