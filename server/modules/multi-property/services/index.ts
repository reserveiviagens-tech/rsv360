import { propertyRepository } from '../db/property.repository';
import { PropertyService } from './property.service';

// C36-ID-05 (D2): TenantService / tenant.service was removed as dead fail-open
// code. These three references were its only remaining consumers.
export const propertyService = new PropertyService(propertyRepository);

export * from './property.service';
