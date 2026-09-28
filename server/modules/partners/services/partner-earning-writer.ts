/**
 * C36-CL — factory for production wiring (CM will call from payment confirmed).
 */

import { PartnerEarningWriterService } from './partner-earning-writer.service';
import { createDrizzlePartnerEarningWriterPorts } from './partner-earning-writer.ports';

export function createPartnerEarningWriterService(): PartnerEarningWriterService {
  return new PartnerEarningWriterService(createDrizzlePartnerEarningWriterPorts());
}

export { PartnerEarningWriterService } from './partner-earning-writer.service';
export { createDrizzlePartnerEarningWriterPorts } from './partner-earning-writer.ports';
export * from './partner-earning-writer.types';
