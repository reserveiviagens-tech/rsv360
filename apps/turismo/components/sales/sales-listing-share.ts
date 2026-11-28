import type { SalesListing } from './sales-data';

export function salesListingShareUrl(slug: string): string {
  if (typeof window === 'undefined') {
    return `/overview?tab=sales&property=${encodeURIComponent(slug)}`;
  }
  const path = `/overview?tab=sales&property=${encodeURIComponent(slug)}`;
  return `${window.location.origin}${path}`;
}

export function salesListingShareMessage(item: SalesListing): string {
  return `${item.name} · ${item.price} · ${item.address}, ${item.area}`;
}

export type SalesShareChannel = 'facebook' | 'whatsapp' | 'instagram' | 'tiktok' | 'email';

export function openSalesListingShare(
  channel: SalesShareChannel,
  item: SalesListing,
  labels: { emailSubject: string; copyPrompt: string },
): 'opened' | 'copied' {
  const url = salesListingShareUrl(item.slug);
  const line = salesListingShareMessage(item);
  const body = `${line}\n${url}`;

  switch (channel) {
    case 'facebook': {
      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=640,height=480');
      return 'opened';
    }
    case 'whatsapp': {
      const shareUrl = `https://wa.me/?text=${encodeURIComponent(body)}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
      return 'opened';
    }
    case 'email': {
      const mail = `mailto:?subject=${encodeURIComponent(labels.emailSubject.replace('{name}', item.name))}&body=${encodeURIComponent(body)}`;
      window.location.assign(mail);
      return 'opened';
    }
    case 'instagram':
    case 'tiktok': {
      const payload = `${labels.copyPrompt}\n\n${body}`;
      void navigator.clipboard?.writeText(payload);
      return 'copied';
    }
    default:
      return 'opened';
  }
}
