import { Pool } from 'pg';
import type { Property, PropertyUser } from './schema';

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

function nowIso() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function slugify(value: string) {
  return String(value || 'propriedade')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toNumber(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class PropertyRepository {
  private useFallback = false;
  private properties = new Map<number, Property>();
  private propertyUsers = new Map<number, PropertyUser>();
  private nextId = { properties: 1, propertyUsers: 1 };

  async init() {
    try {
      if (!pool || process.env.NODE_ENV === 'test' || process.env.MULTI_PROPERTY_USE_DB !== 'true') {
        this.useFallback = true;
        this.seedDefaultPropertyInMemory();
        return { fallback: true };
      }

      await pool.query(`
        create table if not exists properties (
          id serial primary key,
          owner_id integer not null,
          name varchar(200) not null,
          slug varchar(100),
          type varchar(50) default 'hotel',
          description text,
          address_street varchar(255),
          address_city varchar(100),
          address_state varchar(50),
          address_zip varchar(20),
          address_country varchar(50) default 'Brasil',
          phone varchar(50),
          email varchar(255),
          website varchar(255),
          logo_url text,
          timezone varchar(50) default 'America/Sao_Paulo',
          currency varchar(3) default 'BRL',
          check_in_time time default '14:00',
          check_out_time time default '12:00',
          total_rooms integer default 0,
          star_rating integer,
          amenities text default '[]',
          settings text default '{}',
          is_active boolean default true,
          created_at timestamp default now(),
          updated_at timestamp default now()
        )
      `);
      await pool.query(`
        create table if not exists property_users (
          id serial primary key,
          property_id integer references properties(id) on delete cascade,
          user_id integer not null,
          role varchar(30) default 'staff',
          permissions text default '[]',
          invited_by integer,
          invited_at timestamp,
          accepted_at timestamp,
          is_active boolean default true,
          created_at timestamp default now(),
          updated_at timestamp default now(),
          unique(property_id, user_id)
        )
      `);
      for (const column of [
        'slug varchar(100)',
        "type varchar(50) default 'hotel'",
        'description text',
        'address_street varchar(255)',
        'address_city varchar(100)',
        'address_state varchar(50)',
        'address_zip varchar(20)',
        "address_country varchar(50) default 'Brasil'",
        'phone varchar(50)',
        'email varchar(255)',
        'website varchar(255)',
        'logo_url text',
        "timezone varchar(50) default 'America/Sao_Paulo'",
        "currency varchar(3) default 'BRL'",
        "check_in_time time default '14:00'",
        "check_out_time time default '12:00'",
        'total_rooms integer default 0',
        'star_rating integer',
        "amenities text default '[]'",
        "settings text default '{}'",
        'is_active boolean default true',
        'created_at timestamp default now()',
        'updated_at timestamp default now()',
      ]) {
        await pool.query(`alter table if exists properties add column if not exists ${column}`);
      }
      for (const column of [
        'property_id integer',
        "role varchar(30) default 'staff'",
        "permissions text default '[]'",
        'invited_by integer',
        'invited_at timestamp',
        'accepted_at timestamp',
        'is_active boolean default true',
        'created_at timestamp default now()',
        'updated_at timestamp default now()',
      ]) {
        await pool.query(`alter table if exists property_users add column if not exists ${column}`);
      }

      const countResult = await pool.query(`select count(*)::int as count from properties`);
      if (toNumber(countResult.rows[0]?.count) === 0) {
        await this.seedDefaultProperty();
      }

      return { fallback: false };
    } catch {
      this.useFallback = true;
      this.seedDefaultPropertyInMemory();
      return { fallback: true };
    }
  }

  private propertyFromRow(row: any): Property {
    return {
      id: toNumber(row.id),
      owner_id: toNumber(row.owner_id),
      name: String(row.name || 'Propriedade'),
      slug: row.slug || undefined,
      type: row.type || 'hotel',
      description: row.description || undefined,
      address_street: row.address_street || undefined,
      address_city: row.address_city || undefined,
      address_state: row.address_state || undefined,
      address_zip: row.address_zip || undefined,
      address_country: row.address_country || 'Brasil',
      phone: row.phone || undefined,
      email: row.email || undefined,
      website: row.website || undefined,
      logo_url: row.logo_url || undefined,
      timezone: row.timezone || 'America/Sao_Paulo',
      currency: row.currency || 'BRL',
      check_in_time: row.check_in_time || undefined,
      check_out_time: row.check_out_time || undefined,
      total_rooms: toNumber(row.total_rooms),
      star_rating: row.star_rating !== null && row.star_rating !== undefined ? toNumber(row.star_rating) : undefined,
      amenities: Array.isArray(row.amenities) ? row.amenities : JSON.parse(row.amenities || '[]'),
      settings: typeof row.settings === 'object' ? row.settings : JSON.parse(row.settings || '{}'),
      is_active: row.is_active !== false,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : nowIso(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : nowIso(),
    };
  }

  private propertyUserFromRow(row: any): PropertyUser {
    return {
      id: toNumber(row.id),
      property_id: toNumber(row.property_id),
      user_id: toNumber(row.user_id),
      role: row.role || 'staff',
      permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]'),
      invited_by: row.invited_by !== null && row.invited_by !== undefined ? toNumber(row.invited_by) : undefined,
      invited_at: row.invited_at || undefined,
      accepted_at: row.accepted_at || undefined,
      is_active: row.is_active !== false,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : nowIso(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : nowIso(),
    };
  }

  async createProperty(data: Partial<Property>): Promise<Property> {
    const property: Property = {
      id: this.nextId.properties++,
      owner_id: toNumber(data.owner_id, 1),
      name: String(data.name || 'Propriedade'),
      slug: data.slug || slugify(String(data.name || 'Propriedade')),
      type: (data.type || 'hotel') as Property['type'],
      description: data.description,
      address_street: data.address_street,
      address_city: data.address_city,
      address_state: data.address_state,
      address_zip: data.address_zip,
      address_country: data.address_country || 'Brasil',
      phone: data.phone,
      email: data.email,
      website: data.website,
      logo_url: data.logo_url,
      timezone: data.timezone || 'America/Sao_Paulo',
      currency: data.currency || 'BRL',
      check_in_time: data.check_in_time || '14:00',
      check_out_time: data.check_out_time || '12:00',
      total_rooms: toNumber(data.total_rooms, 0),
      star_rating: data.star_rating,
      amenities: data.amenities || [],
      settings: data.settings || {},
      is_active: data.is_active ?? true,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.properties.set(property.id, property);
    return clone(property);
  }

  async getProperty(id: number): Promise<Property | null> {
    const property = this.properties.get(Number(id));
    return property ? clone(property) : null;
  }

  async updateProperty(id: number, data: Partial<Property>): Promise<Property | null> {
    const existing = this.properties.get(Number(id));
    if (!existing) return null;
    const updated = { ...existing, ...data, updated_at: nowIso() } as Property;
    this.properties.set(Number(id), updated);
    return clone(updated);
  }

  async deleteProperty(id: number): Promise<boolean> {
    const existing = this.properties.get(Number(id));
    if (!existing) return false;
    this.properties.set(Number(id), { ...existing, is_active: false, updated_at: nowIso() });
    return true;
  }

  /**
   * C36-ID-06 (D1) — a property is returned ONLY when an ACTIVE `property_users`
   * link ties it to this user.
   *
   * The previous fallback returned the first active property in the whole
   * repository with a fabricated `role: 'owner'` whenever the user had no link.
   * That manufactured an association the user never had, and it silently
   * defeated the C36-ID-05 nullable contract downstream:
   *
   *   no link → first global property → getDefaultPropertyForUser() !== null
   *
   * K1: never select a global "first" property as a fallback.
   * K2: only genuine active links qualify.
   * K3: `role` always comes from the link record, never fabricated.
   * K4: absence of association yields `[]` (and therefore `null` downstream).
   */
  async listPropertiesByUser(userId: number): Promise<Array<Property & { role: string }>> {
    const result: Array<Property & { role: string }> = [];
    for (const link of this.propertyUsers.values()) {
      if (link.user_id === Number(userId) && link.is_active) {
        const property = this.properties.get(link.property_id);
        if (property && property.is_active) result.push({ ...clone(property), role: link.role } as Property & { role: string });
      }
    }
    return result;
  }

  async getPropertyBySlug(slug: string): Promise<Property | null> {
    const found = Array.from(this.properties.values()).find((property) => property.slug === slug);
    return found ? clone(found) : null;
  }

  async addUserToProperty(propertyId: number, userId: number, role: string): Promise<PropertyUser> {
    const existing = Array.from(this.propertyUsers.values()).find((item) => item.property_id === Number(propertyId) && item.user_id === Number(userId));
    const record: PropertyUser = existing || {
      id: this.nextId.propertyUsers++,
      property_id: Number(propertyId),
      user_id: Number(userId),
      role: role as PropertyUser['role'],
      permissions: [],
      invited_at: nowIso(),
      accepted_at: nowIso(),
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    record.role = role as PropertyUser['role'];
    record.is_active = true;
    record.accepted_at = record.accepted_at || nowIso();
    record.updated_at = nowIso();
    this.propertyUsers.set(record.id, record);
    return clone(record);
  }

  async removeUserFromProperty(propertyId: number, userId: number): Promise<boolean> {
    const found = Array.from(this.propertyUsers.values()).find((item) => item.property_id === Number(propertyId) && item.user_id === Number(userId));
    if (!found) return false;
    this.propertyUsers.set(found.id, { ...found, is_active: false, updated_at: nowIso() });
    return true;
  }

  async updateUserRole(propertyId: number, userId: number, role: string): Promise<PropertyUser | null> {
    const found = Array.from(this.propertyUsers.values()).find((item) => item.property_id === Number(propertyId) && item.user_id === Number(userId));
    if (!found) return null;
    const updated = { ...found, role: role as PropertyUser['role'], updated_at: nowIso() };
    this.propertyUsers.set(found.id, updated);
    return clone(updated);
  }

  async listPropertyUsers(propertyId: number): Promise<PropertyUser[]> {
    return Array.from(this.propertyUsers.values())
      .filter((item) => item.property_id === Number(propertyId) && item.is_active)
      .map((item) => clone(item));
  }

  async getUserAccess(propertyId: number, userId: number): Promise<PropertyUser | null> {
    const found = Array.from(this.propertyUsers.values()).find((item) => item.property_id === Number(propertyId) && item.user_id === Number(userId) && item.is_active);
    return found ? clone(found) : null;
  }

  async getUserProperties(userId: number): Promise<Array<Property & { role: string }>> {
    return this.listPropertiesByUser(userId);
  }

  /**
   * C36-ID-05 (D3) — nullable contract. A user with no property has NO default
   * property. Returning a fabricated `1` would silently grant tenant scope, which
   * is the exact fail-open class removed in C36-ID-04.
   */
  async getDefaultPropertyForUser(userId: number): Promise<number | null> {
    const properties = await this.listPropertiesByUser(userId);
    return properties[0]?.id ?? null;
  }

  async validateUserAccess(propertyId: number, userId: number): Promise<boolean> {
    return Boolean(await this.getUserAccess(propertyId, userId));
  }

  async getPropertyStats(propertyId: number): Promise<any> {
    const property = await this.getProperty(propertyId);
    const users = await this.listPropertyUsers(propertyId);
    return {
      property,
      total_users: users.length,
      active_users: users.filter((user) => user.is_active).length,
      total_rooms: property?.total_rooms || 0,
    };
  }

  async getConsolidatedStats(userId: number): Promise<any> {
    const properties = await this.listPropertiesByUser(userId);
    return {
      total_properties: properties.length,
      active_properties: properties.filter((property) => property.is_active).length,
      total_rooms: properties.reduce((sum, property) => sum + Number(property.total_rooms || 0), 0),
    };
  }

  private async seedDefaultProperty() {
    if (!pool) return this.seedDefaultPropertyInMemory();
    const result = await pool.query(
      `insert into properties (owner_id, name, slug, type, address_city, address_state, address_country, timezone, currency, total_rooms, is_active)
       values (1, 'Propriedade Principal', 'propriedade-principal', 'hotel', 'São Paulo', 'SP', 'Brasil', 'America/Sao_Paulo', 'BRL', 50, true)
       returning *`
    );
    const property = this.propertyFromRow(result.rows[0]);
    await pool.query(
      `insert into property_users (property_id, user_id, role, accepted_at, is_active)
       values ($1, 1, 'owner', now(), true)`,
      [property.id]
    );
  }

  private seedDefaultPropertyInMemory() {
    if (this.properties.size) return;
    const property: Property = {
      id: 1,
      owner_id: 1,
      name: 'Propriedade Principal',
      slug: 'propriedade-principal',
      type: 'hotel',
      address_country: 'Brasil',
      address_city: 'São Paulo',
      address_state: 'SP',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      total_rooms: 50,
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.properties.set(1, property);
    this.nextId.properties = 2;
    const link: PropertyUser = {
      id: 1,
      property_id: 1,
      user_id: 1,
      role: 'owner',
      permissions: [],
      accepted_at: nowIso(),
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.propertyUsers.set(1, link);
    this.nextId.propertyUsers = 2;
  }
}

export const propertyRepository = new PropertyRepository();
