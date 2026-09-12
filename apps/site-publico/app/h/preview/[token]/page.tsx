import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  PublicListingView,
  type PublicListingData,
} from '@/components/listing/PublicListingView';

function backendUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3002'
  ).replace(/\/$/, '');
}

async function loadPreviewListing(token: string): Promise<PublicListingData | null> {
  const encoded = encodeURIComponent(String(token ?? '').trim());
  if (!encoded) return null;
  try {
    const res = await fetch(`${backendUrl()}/api/v1/acomodacoes/publico/preview/${encoded}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: PublicListingData };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const listing = await loadPreviewListing(token);
  return {
    title: listing ? `Pré-visualização: ${listing.titulo}` : 'Pré-visualização | Reservei Viagens',
    robots: { index: false, follow: false },
  };
}

export default async function PublicListingPreviewPage({ params }: PageProps) {
  const { token } = await params;
  const listing = await loadPreviewListing(token);
  if (!listing) notFound();

  return <PublicListingView listing={{ ...listing, isPreview: true }} showCotacaoLink={false} />;
}
