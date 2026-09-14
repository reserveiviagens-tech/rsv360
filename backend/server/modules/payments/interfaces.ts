export interface CheckoutLineItem {
  name: string;
  description?: string;
  amount: number;
  quantity: number;
}

export interface CreateCheckoutSessionDTO {
  amount: number;
  currency: string;
  description?: string;
  customerEmail: string;
  customerName?: string;
  successUrl: string;
  cancelUrl: string;
  paymentMethod?: string;
  items?: CheckoutLineItem[];
  metadata?: Record<string, unknown>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  provider: string;
}

export interface ProviderCustomerInput {
  email: string;
  name: string;
  document?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderCustomerResult {
  externalId: string;
}

// PaymentProviderInterface
export interface PaymentProviderInterface {
  name: string;
  createPayment(data: CreatePaymentDTO): Promise<PaymentResult>;
  getPayment(externalId: string): Promise<PaymentResult>;
  cancelPayment(externalId: string): Promise<PaymentResult>;
  createRefund(data: CreateRefundDTO): Promise<RefundResult>;
  listPayments(filters: PaymentFilters): Promise<PaginatedResult<PaymentResult>>;
  createCheckoutSession(data: CreateCheckoutSessionDTO): Promise<CheckoutSessionResult>;
  createProviderCustomer(data: ProviderCustomerInput): Promise<ProviderCustomerResult>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
}

// SubscriptionProviderInterface
export interface SubscriptionProviderInterface {
  name: string;
  createPlan(data: CreatePlanDTO): Promise<PlanResult>;
  updatePlan(externalId: string, data: UpdatePlanDTO): Promise<PlanResult>;
  deletePlan(externalId: string): Promise<void>;
  createSubscription(data: CreateSubscriptionDTO): Promise<SubscriptionResult>;
  cancelSubscription(externalId: string, atPeriodEnd?: boolean): Promise<SubscriptionResult>;
  pauseSubscription(externalId: string): Promise<SubscriptionResult>;
  resumeSubscription(externalId: string): Promise<SubscriptionResult>;
  getSubscription(externalId: string): Promise<SubscriptionResult>;
}

// PIXProviderInterface
export interface PIXProviderInterface {
  name: string;
  createPIXCharge(data: CreatePIXDTO): Promise<PIXResult>;
  getPIXCharge(externalId: string): Promise<PIXResult>;
  cancelPIXCharge(externalId: string): Promise<PIXResult>;
  generateQRCode(pixCode: string): Promise<string>;  // base64
}

// DTOs and Types
export interface CreatePaymentDTO {
  amount: number;
  currency: string;
  description?: string;
  customerId: string;
  paymentMethod: string;
  installments?: number;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  id: string;
  externalId: string;
  status: string;
  amount: number;
  currency: string;
  qrCode?: string;
  qrCodeBase64?: string;
  boletoUrl?: string;
  boletoBarcode?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface CreateRefundDTO {
  paymentId: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  id: string;
  externalId: string;
  status: string;
  amount: number;
  processedAt?: Date;
  metadata?: Record<string, any>;
}

export interface PaymentFilters {
  customerId?: string;
  status?: string;
  provider?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatePlanDTO {
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount?: number;
  trialDays?: number;
  features?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PlanResult {
  id: string;
  externalId: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  metadata?: Record<string, any>;
}

export interface UpdatePlanDTO {
  name?: string;
  description?: string;
  amount?: number;
  features?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionDTO {
  customerId: string;
  planId: string;
  trialEnd?: Date;
  metadata?: Record<string, any>;
}

export interface SubscriptionResult {
  id: string;
  externalId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  metadata?: Record<string, any>;
}

export interface CreatePIXDTO {
  amount: number;
  description?: string;
  customerId: string;
  expiresIn?: number; // minutes
  metadata?: Record<string, any>;
}

export interface PIXResult {
  id: string;
  externalId: string;
  qrCode: string;
  qrCodeBase64: string;
  amount?: number;
  description?: string;
  expiresAt: Date;
  status: string;
  metadata?: Record<string, any>;
}

// Additional types for completeness
export interface CustomerDTO {
  email: string;
  name: string;
  document?: string;
  documentType?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface CustomerResult {
  id: string;
  externalId?: string;
  email: string;
  name: string;
  metadata?: Record<string, any>;
}

export interface WebhookEvent {
  provider: string;
  externalEventId: string;
  eventType: string;
  payload: Record<string, any>;
  processed: boolean;
  error?: string;
}
