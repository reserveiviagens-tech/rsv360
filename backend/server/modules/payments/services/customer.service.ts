import { eq, and } from 'drizzle-orm';
import { db } from '../../../../src/db/drizzle';
import { paymentCustomers } from '../../../../src/db/schema';
import { CustomerDTO, CustomerResult, PaymentProviderInterface } from '../interfaces';
import { getPaymentProvider } from '../factory';
import { resolveEnterpriseId, resolvePaymentProvider } from '../config';
import { assertPaymentProviderConfigured } from './payment.service';

export class CustomerService {
  constructor(private readonly provider: PaymentProviderInterface = getPaymentProvider()) {}

  async createCustomer(enterpriseId: string, data: CustomerDTO): Promise<CustomerResult> {
    assertPaymentProviderConfigured();
    const tenantId = resolveEnterpriseId(enterpriseId);
    const providerName = resolvePaymentProvider();

    const providerCustomer = await this.provider.createProviderCustomer({
      email: data.email,
      name: data.name,
      document: data.document,
      phone: data.phone,
      metadata: data.metadata,
    });

    const [row] = await db
      .insert(paymentCustomers)
      .values({
        enterpriseId: tenantId,
        email: data.email,
        name: data.name,
        document: data.document,
        documentType: data.documentType,
        phone: data.phone,
        stripeCustomerId: providerName === 'stripe' ? providerCustomer.externalId : null,
        mpCustomerId: providerName === 'mercadopago' ? providerCustomer.externalId : null,
        metadata: data.metadata || {},
      })
      .returning();

    return this.toCustomerResult(row, providerCustomer.externalId);
  }

  async getCustomer(id: string): Promise<CustomerResult | null> {
    const [row] = await db
      .select()
      .from(paymentCustomers)
      .where(eq(paymentCustomers.id, id))
      .limit(1);

    if (!row) return null;
    return this.toCustomerResult(row);
  }

  async listCustomers(enterpriseId: string, filters?: { limit?: number; offset?: number }) {
    const tenantId = resolveEnterpriseId(enterpriseId);
    const limit = filters?.limit ?? 10;
    const offset = filters?.offset ?? 0;

    const rows = await db
      .select()
      .from(paymentCustomers)
      .where(eq(paymentCustomers.enterpriseId, tenantId))
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map((row) => this.toCustomerResult(row)),
      total: rows.length,
      limit,
      offset,
    };
  }

  async updateCustomer(id: string, data: Partial<CustomerDTO>): Promise<CustomerResult> {
    const [existing] = await db
      .select()
      .from(paymentCustomers)
      .where(eq(paymentCustomers.id, id))
      .limit(1);

    if (!existing) {
      throw new Error('Customer not found');
    }

    const [row] = await db
      .update(paymentCustomers)
      .set({
        email: data.email ?? existing.email,
        name: data.name ?? existing.name,
        document: data.document ?? existing.document,
        documentType: data.documentType ?? existing.documentType,
        phone: data.phone ?? existing.phone,
        metadata: data.metadata ?? existing.metadata,
        updatedAt: new Date(),
      })
      .where(eq(paymentCustomers.id, id))
      .returning();

    return this.toCustomerResult(row);
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(paymentCustomers).where(eq(paymentCustomers.id, id));
  }

  async findByEmail(email: string, enterpriseId?: string): Promise<CustomerResult | null> {
    const tenantId = enterpriseId ? resolveEnterpriseId(enterpriseId) : undefined;
    const whereClause = tenantId
      ? and(eq(paymentCustomers.email, email), eq(paymentCustomers.enterpriseId, tenantId))
      : eq(paymentCustomers.email, email);

    const [row] = await db.select().from(paymentCustomers).where(whereClause).limit(1);
    if (!row) return null;
    return this.toCustomerResult(row);
  }

  async syncWithProvider(customerId: string): Promise<CustomerResult> {
    assertPaymentProviderConfigured();
    const [existing] = await db
      .select()
      .from(paymentCustomers)
      .where(eq(paymentCustomers.id, customerId))
      .limit(1);

    if (!existing) {
      throw new Error('Customer not found');
    }

    const providerName = resolvePaymentProvider();
    const hasExternal =
      providerName === 'stripe'
        ? Boolean(existing.stripeCustomerId)
        : Boolean(existing.mpCustomerId);

    if (hasExternal) {
      return this.toCustomerResult(existing);
    }

    const providerCustomer = await this.provider.createProviderCustomer({
      email: existing.email,
      name: existing.name,
      document: existing.document || undefined,
      phone: existing.phone || undefined,
      metadata: (existing.metadata as Record<string, unknown> | null) || undefined,
    });

    const [row] = await db
      .update(paymentCustomers)
      .set({
        stripeCustomerId:
          providerName === 'stripe' ? providerCustomer.externalId : existing.stripeCustomerId,
        mpCustomerId:
          providerName === 'mercadopago' ? providerCustomer.externalId : existing.mpCustomerId,
        updatedAt: new Date(),
      })
      .where(eq(paymentCustomers.id, customerId))
      .returning();

    return this.toCustomerResult(row, providerCustomer.externalId);
  }

  private toCustomerResult(
    row: typeof paymentCustomers.$inferSelect,
    externalOverride?: string,
  ): CustomerResult {
    const externalId =
      externalOverride || row.stripeCustomerId || row.mpCustomerId || undefined;

    return {
      id: row.id,
      externalId,
      email: row.email,
      name: row.name,
      metadata: (row.metadata as Record<string, unknown> | null) || {},
    };
  }
}
