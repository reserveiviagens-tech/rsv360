/**
 * PR-06c — admin 2FA challenge: verifies TOTP (temp_token + code) against backend
 * /api/v1/auth/2fa/verify and mints the admin session cookie on success.
 * Never logs code/temp_token; no secrets in responses.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminTokenMaxAgeSeconds, signAdminToken } from '@/lib/admin-token'

function backendAuthBase(): string {
  return (
    process.env.AUTH_V1_BASE_URL ||
    process.env.BACKEND_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:3002'
  ).replace(/\/$/, '')
}

function clientIp(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}

async function mintAdminCookie(
  response: NextResponse,
  user: { id?: string | number; email?: string; role?: string },
) {
  const role = user.role === 'manager' ? 'manager' : 'admin'
  const token = await signAdminToken({
    sub: String(user.id ?? 'admin'),
    role,
    email: user.email || process.env.ADMIN_LOGIN_EMAIL || 'admin@local',
  })
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: getAdminTokenMaxAgeSeconds(),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tempToken = String(body?.temp_token ?? '').trim()
    const code = String(body?.code ?? '').trim()
    if (!tempToken || !code) {
      return NextResponse.json(
        { success: false, error: 'Código e sessão temporária são obrigatórios.' },
        { status: 400 },
      )
    }

    const upstream = await fetch(`${backendAuthBase()}/api/v1/auth/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': clientIp(request),
        'user-agent': request.headers.get('user-agent') || 'site-publico-admin',
      },
      body: JSON.stringify({ temp_token: tempToken, code }),
    })

    const payload = await upstream.json().catch(() => ({}))
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Código inválido.' },
        { status: upstream.status || 401 },
      )
    }

    const data = payload?.data || payload
    if (!data?.user) {
      return NextResponse.json(
        { success: false, error: 'Resposta de autenticação incompleta.' },
        { status: 502 },
      )
    }

    const response = NextResponse.json({ success: true })
    try {
      await mintAdminCookie(response, data.user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('ADMIN_JWT_SECRET')) {
        console.error('[admin/auth/2fa] ADMIN_JWT_SECRET ausente no site-publico')
        return NextResponse.json(
          { success: false, error: 'Sessão admin indisponível (configuração).' },
          { status: 503 },
        )
      }
      throw err
    }
    return response
  } catch (err) {
    console.error('[admin/auth/2fa] falha ao validar TOTP:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json(
      { success: false, error: 'Não foi possível validar o TOTP agora.' },
      { status: 500 },
    )
  }
}
