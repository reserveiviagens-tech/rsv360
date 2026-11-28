import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../../../../backend/src/db/drizzle';
import { crmDealEvents, crmDeals, crmLeads } from '../../../../backend/src/db/schema/crm-lintel';
import type { CreateDealInput, DealRecord, DealStage } from '../schema';
import { SEED_DEALS } from './deals-memory.store';

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

function eventId(): string {
  return `cev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function rowToDeal(row: typeof crmDeals.$inferSelect): DealRecord {
  return {
    id: row.id,
    agentId: row.agentId,
    agentName: row.agentName,
    propertyId: row.propertyId,
    propertyName: row.propertyName,
    location: row.location,
    propertyType: row.propertyType,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft,
    price: Number(row.price),
    commission: Number(row.commission),
    stage: row.stage as DealStage,
    nextStep: row.nextStep ?? undefined,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
    listingSource: (row.listingSource as DealRecord['listingSource']) ?? undefined,
    status: row.status as DealRecord['status'],
    notes: row.notes ?? undefined,
  };
}

let demoSeedPromise: Promise<void> | null = null;

async function ensureDemoSeedIfEmpty(): Promise<void> {
  if (process.env.CRM_DEALS_DEMO_SEED === '0') return;
  if (process.env.NODE_ENV === 'production') return;
  if (demoSeedPromise) return demoSeedPromise;

  demoSeedPromise = (async () => {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmDeals);
    if (count > 0) return;

    for (const seed of SEED_DEALS) {
      await db.insert(crmDeals).values({
        id: seed.id,
        agentId: seed.agentId,
        agentName: seed.agentName,
        propertyId: seed.propertyId,
        propertyName: seed.propertyName,
        location: seed.location,
        propertyType: seed.propertyType,
        beds: seed.beds,
        baths: seed.baths,
        sqft: seed.sqft,
        price: String(seed.price),
        commission: String(seed.commission),
        stage: seed.stage,
        nextStep: seed.nextStep ?? null,
        listingSource: seed.listingSource ?? null,
        status: seed.status,
        notes: seed.notes ?? null,
        createdAt: new Date(`${seed.createdAt}T12:00:00.000Z`),
        updatedAt: new Date(`${seed.updatedAt}T12:00:00.000Z`),
      });
    }
  })();

  return demoSeedPromise;
}

async function upsertLeadFromInput(
  input: CreateDealInput,
  userId: number,
): Promise<string | null> {
  const leadId = input.leadId?.trim();
  if (!leadId && !input.clientName && !input.clientEmail && !input.clientPhone) {
    return null;
  }
  const id = leadId || `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const [existing] = await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.id, id)).limit(1);
  if (existing) {
    await db
      .update(crmLeads)
      .set({
        clientName: input.clientName ?? null,
        clientEmail: input.clientEmail ?? null,
        clientPhone: input.clientPhone ?? null,
        status: 'convertido',
        updatedAt: new Date(),
      })
      .where(eq(crmLeads.id, id));
  } else {
    await db.insert(crmLeads).values({
      id,
      clientName: input.clientName ?? null,
      clientEmail: input.clientEmail ?? null,
      clientPhone: input.clientPhone ?? null,
      source: input.listingSource ?? 'direct',
      status: 'convertido',
      assignedUserId: userId,
      notes: input.notes ?? null,
    });
  }

  return id;
}

export async function postgresListDeals(): Promise<DealRecord[]> {
  await ensureDemoSeedIfEmpty();
  const rows = await db.select().from(crmDeals).orderBy(asc(crmDeals.createdAt));
  return rows.map(rowToDeal);
}

export async function postgresGetDeal(id: string): Promise<DealRecord | undefined> {
  const [row] = await db.select().from(crmDeals).where(eq(crmDeals.id, id)).limit(1);
  return row ? rowToDeal(row) : undefined;
}

export async function postgresCreateDeal(
  userId: number,
  input: CreateDealInput,
): Promise<DealRecord> {
  const id = `deal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const leadId = await upsertLeadFromInput(input, userId);
  const propertyId = leadId ? `prop_${leadId}` : `prop_${Date.now()}`;
  const price = input.price || 1_000_000;
  const commission = input.commission ?? Math.round(price * 0.015);
  const stage = input.stage || 'viewing';
  const now = new Date();

  const record: DealRecord = {
    id,
    agentId: input.agentId || `agent_${userId || 1}`,
    agentName: input.agentName || 'Imani Brooks',
    propertyId,
    propertyName: input.propertyName,
    location: input.location || 'São Paulo / Jardins',
    propertyType: input.propertyType || 'House',
    beds: input.beds || 3,
    baths: input.baths || 2,
    sqft: input.sqft || 2000,
    price,
    commission,
    stage,
    nextStep: input.nextStep || 'Agendar visita inicial',
    createdAt: todayIsoDate(),
    updatedAt: todayIsoDate(),
    listingSource: input.listingSource || 'direct',
    status: 'active',
    notes: input.notes,
  };

  await db.transaction(async (tx) => {
    await tx.insert(crmDeals).values({
      id: record.id,
      leadId,
      agentId: record.agentId,
      agentName: record.agentName,
      propertyId: record.propertyId,
      propertyName: record.propertyName,
      location: record.location,
      propertyType: record.propertyType,
      beds: record.beds,
      baths: record.baths,
      sqft: record.sqft,
      price: String(record.price),
      commission: String(record.commission),
      stage: record.stage,
      nextStep: record.nextStep ?? null,
      listingSource: record.listingSource ?? null,
      status: record.status,
      notes: record.notes ?? null,
      ownerUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(crmDealEvents).values({
      id: eventId(),
      dealId: record.id,
      eventType: 'created',
      toStage: record.stage,
      actorUserId: userId,
      metadata: leadId ? { leadId } : {},
    });
  });

  return record;
}

export async function postgresUpdateDealStage(
  userId: number,
  dealId: string,
  stage: DealStage,
): Promise<DealRecord> {
  const existing = await postgresGetDeal(dealId);
  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  const status =
    stage === 'closed' ? 'won' : existing.status === 'won' ? 'active' : existing.status;
  const updatedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(crmDeals)
      .set({
        stage,
        status,
        updatedAt,
      })
      .where(eq(crmDeals.id, dealId));
    await tx.insert(crmDealEvents).values({
      id: eventId(),
      dealId,
      eventType: 'stage_change',
      fromStage: existing.stage,
      toStage: stage,
      actorUserId: userId,
    });
  });

  return {
    ...existing,
    stage,
    status: status as DealRecord['status'],
    updatedAt: todayIsoDate(),
  };
}