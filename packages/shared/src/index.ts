// Barrel exports for @rsv360/shared

// Types
export * from './types/index.js';
export * from './types/tenant.js';
export * from './auth/session.js';
export * from './auth/jwt-secrets.js';
export * from './auth/dpop.js';
export * from './http/cors-origins.js';
export * from './http/metrics-auth.js';
export * from './tenant/routing.js';

// Validators
export * from './validators/checkout.validator.js';
export * from './validators/booking.validator.js';

// Constants
export * from './constants/index.js';

// Utils
export * from './utils/index.js';

// Payments — Mercado Pago webhook HMAC (PR-02 / PR-02b)
export * from './payments/mp-webhook-signature.js';

// PR-13b — LLM prompt sanitization / field allowlist
export * from './llm/prompt-sanitize.js';

// PR-13e — shared LLM chat gateway
export * from './llm/chat-gateway.js';

// Drizzle schemas (Fase 1 migração)
export * from './schema.js';

// Fase 1 API types & paths
export * from './fase1-api.js';

// Cotação interativa v2 — contrato Hub / comparativo_cache
export * from './cotacao/oferta-normalizada.js';
export * from './cotacao/kit-capacidade.js';
export * from './cotacao/buscar-por-relevancia.js';
export * from './cotacao/intencao-acomodacao.js';
export * from './cotacao/etapa-a-mapeamento.js';
export * from './cotacao/acomodacao-config-label.js';
export * from './cotacao/wizard-estadia.js';
export * from './cotacao/entrada-contextual.js';
export * from './cotacao/upgrade-varanda.js';
export * from './cotacao/taxa-hospede.js';
export * from './cotacao/roteiro-atracao.types.js';
export * from './cotacao/montar-roteiro-dia.js';
export * from './cotacao/roteiro-slots.js';
export * from './cotacao/roteiro-narrativa.js';
export * from './cotacao/roteiro-inteligente.mapper.js';