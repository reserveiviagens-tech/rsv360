import type { Deal } from './deal-card';
import { DEAL_PROPERTY_IMAGES, inferListingKind } from './deal-card';
import type { CrmChatPropertyPayload } from '../lintel/crm-live-chat-data';

export function dealPropertySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function dealToChatPropertyPayload(deal: Deal): CrmChatPropertyPayload {
  const kind = inferListingKind(deal);
  return {
    id: deal.propertyId,
    name: deal.propertyName,
    subtitle: deal.location,
    thumb: deal.imageUrl ?? DEAL_PROPERTY_IMAGES[deal.propertyId] ?? DEAL_PROPERTY_IMAGES.prop_106,
    kind: kind === 'rent' ? 'rental' : 'sale',
  };
}
