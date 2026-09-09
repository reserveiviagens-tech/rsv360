import { NextRequest, NextResponse } from 'next/server';
import { jsonInternalError } from '@/lib/api-error';

function backendUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3002'
  ).replace(/\/$/, '');
}

type RouteCtx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { slug } = await ctx.params;
    const encoded = encodeURIComponent(String(slug ?? '').trim());
    if (!encoded) {
      return NextResponse.json({ success: false, error: 'Slug obrigatório' }, { status: 400 });
    }
    const upstream = await fetch(`${backendUrl()}/api/v1/acomodacoes/publico/by-slug/${encoded}`, {
      cache: 'no-store',
    });
    const json = await upstream.json();
    return NextResponse.json(json, { status: upstream.status });
  } catch (error) {
    return jsonInternalError(error);
  }
}
