import { pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { bookings } from './bookings';

// Enums
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 'processing', 'approved', 'rejected', 'cancelled',
  'refunded', 'partially_refunded', 'expired', 'in_mediation', 'charged_back'
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'credit_card', 'debit_card', 'pix', 'boleto', 'wallet', 'bank_transfer'
]);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'mercadopago', 'stripe', 'openfinance'
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'paused', 'cancelled', 'past_due', 'trialing', 'unpaid'
]);

export const subscriptionIntervalEnum = pgEnum('subscription_interval', [
  'daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'
]);

export const refundStatusEnum = pgEnum('refund_status', [
  'pending', 'approved', 'rejected', 'processing'
]);

export const disputeStatusEnum = pgEnum('dispute_status', [
  'opened', 'in_review', 'won', 'lost', 'accepted'
]);

// Tabela 1: payment_customers
export const paymentCustomers = pgTable('payment_customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  enterpriseId: uuid('enterprise_id').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  document: varchar('document', { length: 20 }),        // CPF/CNPJ
  documentType: varchar('document_type', { length: 10 }), // cpf | cnpj
  phone: varchar('phone', { length: 20 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  mpCustomerId: varchar('mp_customer_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela 2: payments
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  enterpriseId: uuid('enterprise_id').notNull(),
  customerId: uuid('customer_id').references(() => paymentCustomers.id),
  externalId: varchar('external_id', { length: 255 }),   // ID no provider
  provider: paymentProviderEnum('provider').notNull(),
  method: paymentMethodEnum('method').notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('BRL').notNull(),
  description: text('description'),
  installments: integer('installments').default(1),
  fees: numeric('fees', { precision: 10, scale: 2 }),
  netAmount: numeric('net_amount', { precision: 12, scale: 2 }),
  pixQrCode: text('pix_qr_code'),
  pixQrCodeBase64: text('pix_qr_code_base64'),
  pixExpiresAt: timestamp('pix_expires_at'),
  boletoUrl: text('boleto_url'),
  boletoBarcode: text('boleto_barcode'),
  boletoExpiresAt: timestamp('boleto_expires_at'),
  bookingId: integer('booking_id').references(() => bookings.id),
  ticketId: uuid('ticket_id'),
  metadata: jsonb('metadata'),
  paidAt: timestamp('paid_at'),
  cancelledAt: timestamp('cancelled_at'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela 3: payment_methods (cartões salvos, etc.)
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => paymentCustomers.id).notNull(),
  provider: paymentProviderEnum('provider').notNull(),
  externalId: varchar('external_id', { length: 255 }),
  type: paymentMethodEnum('type').notNull(),
  last4: varchar('last_4', { length: 4 }),
  brand: varchar('brand', { length: 50 }),
  expiryMonth: integer('expiry_month'),
  expiryYear: integer('expiry_year'),
  isDefault: boolean('is_default').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabela 4: subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  enterpriseId: uuid('enterprise_id').notNull(),
  customerId: uuid('customer_id').references(() => paymentCustomers.id).notNull(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  provider: paymentProviderEnum('provider').notNull(),
  externalId: varchar('external_id', { length: 255 }),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  trialEnd: timestamp('trial_end'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela 5: subscription_plans
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  enterpriseId: uuid('enterprise_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('BRL').notNull(),
  interval: subscriptionIntervalEnum('interval').notNull(),
  intervalCount: integer('interval_count').default(1),
  trialDays: integer('trial_days').default(0),
  features: jsonb('features'),
  isActive: boolean('is_active').default(true),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  mpPlanId: varchar('mp_plan_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela 6: refunds
export const refunds = pgTable('refunds', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id').references(() => payments.id).notNull(),
  provider: paymentProviderEnum('provider').notNull(),
  externalId: varchar('external_id', { length: 255 }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason'),
  status: refundStatusEnum('status').default('pending').notNull(),
  metadata: jsonb('metadata'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabela 7: disputes (chargebacks)
export const disputes = pgTable('disputes', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id').references(() => payments.id).notNull(),
  provider: paymentProviderEnum('provider').notNull(),
  externalId: varchar('external_id', { length: 255 }),
  reason: text('reason'),
  status: disputeStatusEnum('status').default('opened').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  evidence: jsonb('evidence'),
  deadline: timestamp('deadline'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela 8: webhook_events (idempotência)
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: paymentProviderEnum('provider').notNull(),
  externalEventId: varchar('external_event_id', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  error: text('error'),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

