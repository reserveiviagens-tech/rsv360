-- Central Geral de Notificações (CNU) — hub :3002
-- Rollback: DROP TABLE IF EXISTS notification_device_tokens, notification_deliveries,
--   notification_ops_feed, notification_inbox, notification_preferences,
--   notification_tenant_config, notification_templates CASCADE;

CREATE TABLE IF NOT EXISTS notification_tenant_config (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL DEFAULT 1,
  enterprise_id INTEGER,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  ops_whatsapp VARCHAR(32),
  ops_email VARCHAR(255),
  push_webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (property_id)
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  event_key VARCHAR(80) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  locale VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
  subject VARCHAR(255),
  body TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_key, channel, locale, version)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, category, channel)
);

CREATE TABLE IF NOT EXISTS notification_inbox (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  event_key VARCHAR(80),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_inbox_user ON notification_inbox (user_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_ops_feed (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL DEFAULT 1,
  domain VARCHAR(40) NOT NULL DEFAULT 'general',
  event_key VARCHAR(80),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'alerta',
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_ops_feed ON notification_ops_feed (property_id, acknowledged, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id SERIAL PRIMARY KEY,
  event_key VARCHAR(80) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  recipient_hash VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_code VARCHAR(64),
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created ON notification_deliveries (created_at DESC);

CREATE TABLE IF NOT EXISTS notification_device_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, token_hash)
);

CREATE TABLE IF NOT EXISTS notification_config_audit (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL DEFAULT 1,
  actor_user_id VARCHAR(64),
  action VARCHAR(40) NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
