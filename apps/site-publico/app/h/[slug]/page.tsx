import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type PublicListing = {
  id: number;
  slug: string;
  titulo: string;
  hotelId: number | null;
  precoDiaria: number | null;
  capacidadeMax: number | null;
  quartos: number | null;
  amenidades: unknown;
  midia: { capa: string | null; fotos: string[] };
  descricao: string | null;
  localizacao: {
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    mostrarExata: boolean;
    endereco: string | null;
  };
  modoReserva: 'instantanea' | 'aprovar';
  localVerificado: boolean;
  mensagemPreReserva: string | null;
};

function backendUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3002'
  ).replace(/\/$/, '');
}

async function loadListing(slug: string): Promise<PublicListing | null> {
  const encoded = encodeURIComponent(slug);
  try {
    const res = await fetch(`${backendUrl()}/api/v1/acomodacoes/publico/by-slug/${encoded}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: PublicListing };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await loadListing(slug);
  if (!listing) {
    return { title: 'Anúncio | Reservei Viagens' };
  }
  return {
    title: `${listing.titulo} | Reservei Viagens`,
    description: listing.descricao?.slice(0, 160) ?? `Hospedagem em ${listing.localizacao.cidade ?? 'Caldas Novas'}`,
  };
}

export default async function PublicListingBySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await loadListing(slug);
  if (!listing) notFound();

  const hero =
    listing.midia.capa ||
    listing.midia.fotos[0] ||
    null;
  const where = [
    listing.localizacao.bairro,
    listing.localizacao.cidade,
    listing.localizacao.uf,
  ]
    .filter(Boolean)
    .join(', ');

  const cotacaoHref =
    listing.hotelId != null
      ? `/cotacao?hotel=${encodeURIComponent(String(listing.hotelId))}&acomodacaoId=${listing.id}`
      : `/cotacao?acomodacaoId=${listing.id}`;

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="relative min-h-[42vh] w-full overflow-hidden bg-stone-900">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent" />
        <div className="relative mx-auto flex max-w-5xl flex-col justify-end px-4 pb-10 pt-24 md:px-6">
          <p className="text-sm font-medium tracking-wide text-amber-200/90">Reservei Viagens</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {listing.titulo}
          </h1>
          {where ? <p className="mt-2 text-sm text-stone-200">{where}</p> : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_0.8fr] md:px-6">
        <section className="space-y-6">
          {listing.descricao ? (
            <div>
              <h2 className="text-lg font-semibold">Sobre o espaço</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {listing.descricao}
              </p>
            </div>
          ) : null}

          {listing.localizacao.endereco ? (
            <div>
              <h2 className="text-lg font-semibold">Endereço</h2>
              <p className="mt-1 text-sm text-stone-700">{listing.localizacao.endereco}</p>
            </div>
          ) : null}

          {listing.midia.fotos.length > 1 ? (
            <div>
              <h2 className="text-lg font-semibold">Fotos</h2>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {listing.midia.fotos.slice(0, 9).map((src) => (
                  <li key={src} className="aspect-[4/3] overflow-hidden rounded-lg bg-stone-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          {listing.precoDiaria != null ? (
            <p className="text-2xl font-semibold">
              R$ {listing.precoDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              <span className="text-sm font-normal text-stone-500"> / noite</span>
            </p>
          ) : (
            <p className="text-sm text-stone-600">Consulte valores na cotação</p>
          )}

          <ul className="mt-4 space-y-2 text-sm text-stone-700">
            {listing.capacidadeMax != null ? (
              <li>Até {listing.capacidadeMax} hóspedes</li>
            ) : null}
            {listing.quartos != null ? <li>{listing.quartos} quarto(s)</li> : null}
            <li>
              {listing.modoReserva === 'instantanea'
                ? 'Reserva instantânea'
                : 'Pedido sujeito à aprovação do anfitrião'}
            </li>
            {listing.localVerificado ? <li>Localização verificada</li> : null}
          </ul>

          {listing.mensagemPreReserva ? (
            <p className="mt-4 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
              {listing.mensagemPreReserva}
            </p>
          ) : null}

          <Link
            href={cotacaoHref}
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white hover:bg-stone-800"
          >
            Solicitar cotação
          </Link>
          <p className="mt-3 text-center text-xs text-stone-500">
            <Link href="/" className="underline">
              Voltar ao início
            </Link>
          </p>
        </aside>
      </div>
    </main>
  );
}
