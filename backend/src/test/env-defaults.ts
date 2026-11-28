/** Defaults locais para Jest — rodam em setupFiles, antes dos imports dos testes. */
process.env.DATABASE_URL ??=
  'postgresql://rsv360:REDACTED_PG_DEV_PASSWORD@127.0.0.1:5433/rsv_360_ecosystem';
process.env.REDIS_URL ??= 'redis://127.0.0.1:6379';
process.env.FORNECEDORES_ENCRYPTION_KEY ??=
  'integration-test-key-32-chars-min!!';
/** PR-04a: unit/integration tests must set a real env secret (no code fallback). */
process.env.JWT_SECRET ??= 'ci_jwt_secret_minimum_32_chars_pr04a';
process.env.JWT_REFRESH_SECRET ??= process.env.JWT_SECRET;
/** Deals CRM tests use in-memory store; postgres covered via repository unit tests / manual smoke. */
process.env.DEALS_PERSISTENCE ??= 'memory';
process.env.RENTAL_SIGN_PERSISTENCE ??= 'memory';
