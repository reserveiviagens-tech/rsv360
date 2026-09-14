/**
 * F5 — admin change-password proxy.
 * Requires admin_token cookie; binds email from JWT (anti-IDOR).
 * Upstream: POST /api/v1/auth/change-password (current + new + TOTP).
 * Never logs passwords or TOTP.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminApiRequest } from '@/lib/admin-api-auth'

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

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminApiRequest(request)
    if (!admin?.email) {
      return NextResponse.json(
        { success: false, error: 'Sessão admin inválida.' },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const currentPassword = String(body?.current_password ?? body?.currentPassword ?? '')
    const newPassword = String(body?.new_password ?? body?.newPassword ?? '')
    const passwordConfirmation = String(
      body?.password_confirmation ?? body?.passwordConfirmation ?? newPassword,
    )
    const totpCode = String(body?.totp_code ?? body?.totpCode ?? body?.code ?? '').trim()

    if (!currentPassword || !newPassword || !totpCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Senha atual, senha nova e código TOTP são obrigatórios.',
        },
        { status: 400 },
      )
    }

    const upstream = await fetch(`${backendAuthBase()}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': clientIp(request),
        'user-agent': request.headers.get('user-agent') || 'site-publico-admin',
      },
      body: JSON.stringify({
        // Email always from verified cookie — never from client body.
        email: admin.email,
        current_password: currentPassword,
        new_password: newPassword,
        password_confirmation: passwordConfirmation,
        totp_code: totpCode,
      }),
    })

    const payload = await upstream.json().catch(() => ({}))
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: payload?.error || 'Não foi possível alterar a senha.' },
        { status: upstream.status || 502 },
      )
    }

    const response = NextResponse.json({
      success: true,
      message: payload?.message || 'Senha alterada. Faça login novamente.',
    })
    // Force re-login after password change (best-effort cookie clear).
    try {
      response.cookies.set('admin_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      })
    } catch {
      // Jest / partial NextResponse: cookie API may be unavailable; client still redirected.
    }
    return response
  } catch (err) {
    console.error(
      '[admin/auth/change-password] falha:',
      err instanceof Error ? err.message : 'unknown',
    )
    return NextResponse.json(
      { success: false, error: 'Não foi possível alterar a senha agora.' },
      { status: 500 },
    )
  }
}
