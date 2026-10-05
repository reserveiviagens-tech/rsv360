import { PropertyRepository } from '../db/property.repository';

export class PropertyService {
  constructor(private repo: PropertyRepository) {}

  async create(ownerId: number, data: any) {
    const slug = data.slug || this.generateSlug(data.name);
    const property = await this.repo.createProperty({
      owner_id: ownerId,
      slug,
      ...data,
    });
    await this.repo.addUserToProperty(property.id, ownerId, 'owner');
    return property;
  }

  async get(id: number) {
    return this.repo.getProperty(id);
  }

  async update(id: number, data: any) {
    return this.repo.updateProperty(id, data);
  }

  async delete(id: number) {
    return this.repo.deleteProperty(id);
  }

  async listMyProperties(userId: number) {
    return this.repo.getUserProperties(userId);
  }

  async addUser(propertyId: number, userId: number, role: string) {
    return this.repo.addUserToProperty(propertyId, userId, role);
  }

  async removeUser(propertyId: number, userId: number) {
    return this.repo.removeUserFromProperty(propertyId, userId);
  }

  async updateUserRole(propertyId: number, userId: number, role: string) {
    return this.repo.updateUserRole(propertyId, userId, role);
  }

  async listUsers(propertyId: number) {
    return this.repo.listPropertyUsers(propertyId);
  }

  async getStats(propertyId: number) {
    return this.repo.getPropertyStats(propertyId);
  }

  async getConsolidated(userId: number) {
    return this.repo.getConsolidatedStats(userId);
  }

  /** C36-ID-05 (D3) — nullable: no property for this user means `null`. */
  async getDefaultPropertyForUser(userId: number): Promise<number | null> {
    return this.repo.getDefaultPropertyForUser(userId);
  }

  async validateUserAccess(propertyId: number, userId: number) {
    return this.repo.validateUserAccess(propertyId, userId);
  }

  private generateSlug(name: string): string {
    return String(name || 'propriedade')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
