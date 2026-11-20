import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../../../../backend/src/db/drizzle';
import { crmDeals, crmLeads } from '../../../../backend/src/db/schema/crm-lintel';
import { apiStatusToDb, rowToLeadApiRow } from '../crm-leads-mapper';
import type { CreateLeadInput, LeadApiRow, LeadApiStatus } from '../schema';
import { SEED_LEADS } from './crm-leads-memory.store';

let demoSeedPromise: Promise<void> | null = null;

async function ensureDemoSeedIfEmpty(): Promise<void> {
  if (process.env.CRM_LEADS_DEMO_SEED === '0') return;
  if (process.env.NODE_ENV === 'production') return;
  if (demoSeedPromise) return demoSeedPromise;

  demoSeedPromise = (async () => {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmLeads);
    if (count > 0) return;

    for (const seed of SEED_LEADS) {
      await db.insert(crmLeads).values({
        id: seed.id,
        clientName: seed.clientName,
        clientEmail: seed.clientEmail,
        clientPhone: seed.clientPhone,
        source: seed.source,
        status: seed.status,
        notes: seed.notes,
        createdAt: new Date(seed.createdAt),
        updatedAt: new Date(seed.updatedAt),
      });
    }
  })();

  return demoSeedPromise;
}

export async function postgresListLeads(): Promise<LeadApiRow[]> {
  await ensureDemoSeedIfEmpty();
  const rows = await db
    .select({
      lead: crmLeads,
      dealId: crmDeals.id,
    })
    .from(crmLeads)
    .leftJoin(crmDeals, eq(crmDeals.leadId, crmLeads.id))
    .orderBy(asc(crmLeads.createdAt));

  return rows.map(({ lead, dealId }) => rowToLeadApiRow(lead, dealId));
}

export async function postgresCreateLead(userId: number, input: CreateLeadInput): Promise<LeadApiRow> {
  const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();

  await db.insert(crmLeads).values({
    id,
    clientName: input.clientName,
    clientEmail: input.clientEmail ?? null,
    clientPhone: input.clientPhone ?? null,
    source: input.source ?? 'manual',
    status: 'novo',
    notes: input.notes ?? null,
    assignedUserId: userId,
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db.select().from(crmLeads).where(eq(crmLeads.id, id)).limit(1);
  return rowToLeadApiRow(row);
}

export async function postgresUpdateLeadStatus(
  id: string,
  status: LeadApiStatus,
): Promise<LeadApiRow | undefined> {
  const dbStatus = apiStatusToDb(status);
  const [existing] = await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.id, id)).limit(1);
  if (!existing) return undefined;

  await db
    .update(crmLeads)
    .set({ status: dbStatus, updatedAt: new Date() })
    .where(eq(crmLeads.id, id));

  const [row] = await db
    .select({
      lead: crmLeads,
      dealId: crmDeals.id,
    })
    .from(crmLeads)
    .leftJoin(crmDeals, eq(crmDeals.leadId, crmLeads.id))
    .where(eq(crmLeads.id, id))
    .limit(1);

  return row ? rowToLeadApiRow(row.lead, row.dealId) : undefined;
}