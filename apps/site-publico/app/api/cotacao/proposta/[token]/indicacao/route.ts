import { NextRequest, NextResponse } from 'next/server';
import { getFase1BackendBaseUrl } from '@/lib/fase1-bff';
import { jsonInternalError } from '@/lib/api-error';

type Params = { params: Promise<{ token: string }> };

/**
 * BFF — tracking MGM público.
 * Encaminha o token da URL (capability) sem converter em propostaId.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    if (!token?.trim()) {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      indicadorId?: unknown;
      canal?: unknown;
    };

    const payload: { indicadorId: unknown; canal?: string } = {
      indicadorId: body.indicadorId,
    };
    if (typeof body.canal === 'string' && body.canal.trim()) {
      payload.canal = body.canal.trim().slice(0, 64);
    }

    const backend = getFase1BackendBaseUrl();
    const upstream = await fetch(
      `${backend}/api/v1/cotacao-publica/proposta/${encodeURIComponent(token)}/indicacao`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    const json = (await upstream.json().catch(() => ({}))) as {
      success?: boolean;
      error?: unknown;
    };

    if (!upstream.ok) {
      const error =
        typeof json.error === 'string' ? json.error : 'Falha ao registrar indicação';
      return NextResponse.json({ success: false, error }, { status: upstream.status });
    }

    return NextResponse.json({ success: true }, { status: upstream.status || 201 });
  } catch (error) {
    return jsonInternalError(error, 'cotacao_proposta_indicacao');
  }
}
