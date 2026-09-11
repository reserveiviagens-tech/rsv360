'use client';

/** Client mirror of server listing-slug.util limits. */
export const LISTING_SLUG_MAX = 116;

/** Client mirror of server normalizeListingSlug. */
export function normalizeListingSlugClient(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, LISTING_SLUG_MAX);
}

/** Card preview — mirrors server summarizeListingSlug. */
export function summarizeLinkPersonalizadoClient(slug: string): string {
  return normalizeListingSlugClient(slug) || 'Adicionar informações';
}

function publicListingHref(slug: string): string {
  const base =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      : 'http://localhost:3000';
  return `${base}/h/${slug}`;
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

type Props = {
  slug: string;
  setSlug: (v: string) => void;
};

export function LinkPersonalizadoEditor({ slug, setSlug }: Props) {
  function applySlug(raw: string) {
    setSlug(normalizeListingSlugClient(raw));
  }

  return (
    <div>
      <PanelTitle title="Link personalizado" hint="Slug único para compartilhar o anúncio." />
      <p className="text-sm text-slate-500">{slug.length}/{LISTING_SLUG_MAX} disponíveis</p>
      <div className="mt-2 flex items-center gap-1 text-lg font-semibold">
        <span className="text-slate-400">reserveiviagens.com.br/h/</span>
        <input
          className="min-w-0 flex-1 border-b border-slate-300 bg-transparent outline-none"
          value={slug}
          onChange={(e) => applySlug(e.target.value)}
          onBlur={(e) => applySlug(e.target.value)}
        />
      </div>
      {slug ? (
        <a
          className="mt-3 inline-block text-sm text-teal-800 underline"
          href={publicListingHref(slug)}
          target="_blank"
          rel="noreferrer"
        >
          Abrir anúncio público
        </a>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Defina um slug único e salve para publicar o link.</p>
      )}
    </div>
  );
}
