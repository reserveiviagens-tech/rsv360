/**
 * PR-06a/06c — admin login: timing-safe password + account protection + MFA proxy.
 *
 * Surfaces identity (account key): ADMIN_LOGIN_EMAIL (or body.email when MFA enforce).
 * When AUTH_MFA_ENFORCE=true → proxies to backend /api/v1/auth/login (+ 2fa/*) for identical MFA.
 * When AUTH_LOGIN_PROTECTION_ENABLED=true → Turnstile after 3 fails + progressive lockout 15/30/60.
 * Both flags OFF by default (owner activation — never merge side-effect).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminTokenMaxAgeSeconds, signAdminToken } from '@/lib/admin-token'
import { safeEqualPassword } from '@/lib/safe-equal-password'
import {
  evaluateAdminLoginProtection,
  isLoginProtectionEnabled,
  isMfaEnforceEnabled,
  recordAdminAccountFailure,
  resetAdminAccountProtection,
  verifyAdminLoginTurnstile,
  clearAdminLoginProtectionStoreForTests,
} from '@/lib/admin-login-protection'

const isDev = process.env.NODE_ENV === 'development'

const LOGIN_LIMIT = isDev
  ? { maxAttempts: 50, windowMs: 15 * 60 * 1000, blockDurationMs: 60 * 1000 }
  : { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 }

type Bucket = { count: number; windowStart: number; blockedUntil: number | null }

const buckets = new Map<string, Bucket>()

/** Test helper */
export function clearAdminLoginRateLimitStoreForTests() {
  buckets.clear()
  clearAdminLoginProtectionStoreForTests()
}

export { safeEqualPassword }

function clientIp(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}

function enforceAdminLoginRateLimit(ip: string): {
  allowed: boolean
  blockedUntil?: Date
} {
  const key = `admin-login:${ip}`
  const now = Date.now()
  let entry = buckets.get(key)

  if (!entry) {
    buckets.set(key, { count: 1, windowStart: now, blockedUntil: null })
    return { allowed: true }
  }

  if (entry.blockedUntil && entry.blockedUntil > now) {
    return { allowed: false, blockedUntil: new Date(entry.blockedUntil) }
  }

  if (entry.blockedUntil && entry.blockedUntil <= now) {
    entry = { count: 1, windowStart: now, blockedUntil: null }
    buckets.set(key, entry)
    return { allowed: true }
  }

  if (now - entry.windowStart > LOGIN_LIMIT.windowMs) {
    entry = { count: 1, windowStart: now, blockedUntil: null }
    buckets.set(key, entry)
    return { allowed: true }
  }

  if (entry.count >= LOGIN_LIMIT.maxAttempts) {
    entry.blockedUntil = now + LOGIN_LIMIT.blockDurationMs
    buckets.set(key, entry)
    return { allowed: false, blockedUntil: new Date(entry.blockedUntil) }
  }

  entry.count += 1
  buckets.set(key, entry)
  return { allowed: true }
}

function resetAdminLoginRateLimit(ip: string) {
  buckets.delete(`admin-login:${ip}`)
}

function backendAuthBase(): string {
  // Prefer in-network URL inside Docker (localhost from the container is wrong).
  return (
    process.env.AUTH_V1_BASE_URL ||
    process.env.BACKEND_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:3002'
  ).replace(/\/$/, '')
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
    const ip = clientIp(request)
    const limit = enforceAdminLoginRateLimit(ip)
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Muitas tentativas. Tente novamente mais tarde.',
          blocked_until: limit.blockedUntil?.toISOString(),
        },
        { status: 429 },
      )
    }

    const body = await request.json()
    const password = String(body?.password ?? '')
    const turnstileToken =
      typeof body?.turnstileToken === 'string'
        ? body.turnstileToken
        : typeof body?.turnstile_token === 'string'
          ? body.turnstile_token
          : undefined

    const accountKey = String(
      body?.email || process.env.ADMIN_LOGIN_EMAIL || 'admin@local',
    )
      .trim()
      .toLowerCase()

    // PR-06c account protection (identical to staff/pilot when flag on).
    if (isLoginProtectionEnabled()) {
      const gate = evaluateAdminLoginProtection(accountKey)
      if (!gate.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Conta temporariamente bloqueada. Tente novamente mais tarde.',
            blocked_until: gate.blockedUntil?.toISOString(),
          },
          { status: 423 },
        )
      }
      if (gate.turnstileRequired) {
        const ts = await verifyAdminLoginTurnstile(turnstileToken, ip)
        if (!ts.ok) {
          recordAdminAccountFailure(accountKey)
          return NextResponse.json(
            {
              success: false,
              error: 'Verificação Turnstile obrigatória ou inválida',
              turnstile_required: true,
            },
            { status: 403 },
          )
        }
      }
    }

    // MFA enforce → proxy to backend staff login for identical TOTP/enrollment.
    if (isMfaEnforceEnabled()) {
      const email = String(body?.email || process.env.ADMIN_LOGIN_EMAIL || '').trim()
      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'E-mail e senha são obrigatórios com MFA enforce' },
          { status: 400 },
        )
      }

      const upstream = await fetch(`${backendAuthBase()}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': ip,
          'user-agent': request.headers.get('user-agent') || 'site-publico-admin',
        },
        body: JSON.stringify({
          email,
          password,
          turnstileToken,
          turnstile_token: turnstileToken,
        }),
      })

      const payload = await upstream.json().catch(() => ({}))
      if (!upstream.ok) {
        if (upstream.status === 401) {
          const failure = recordAdminAccountFailure(accountKey)
          return NextResponse.json(
            {
              success: false,
              error: payload?.error || 'Credenciais invalidas.',
              turnstile_required: failure.turnstileRequired || undefined,
              blocked_until: failure.blockedUntil?.toISOString(),
            },
            { status: 401 },
          )
        }
        return NextResponse.json(
          { success: false, error: payload?.error || 'Falha no login admin.' },
          { status: upstream.status || 502 },
        )
      }

      const data = payload?.data || payload
      if (data?.requires_2fa || data?.requires_mfa_enrollment) {
        return NextResponse.json({ success: true, data })
      }

      resetAdminLoginRateLimit(ip)
      resetAdminAccountProtection(accountKey)
      const response = NextResponse.json({ success: true, data })
      if (data?.user) {
        await mintAdminCookie(response, data.user)
      }
      return response
    }

    const configuredPassword = String(process.env.ADMIN_LOGIN_PASSWORD ?? '').trim()
    if (!configuredPassword) {
      return NextResponse.json(
        { success: false, error: 'ADMIN_LOGIN_PASSWORD nao configurado no servidor.' },
        { status: 503 },
      )
    }

    if (!password || !safeEqualPassword(password, configuredPassword)) {
      const failure = recordAdminAccountFailure(accountKey)
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciais invalidas.',
          turnstile_required: failure.turnstileRequired || undefined,
          blocked_until: failure.blockedUntil?.toISOString(),
        },
        { status: 401 },
      )
    }

    resetAdminLoginRateLimit(ip)
    resetAdminAccountProtection(accountKey)

    const response = NextResponse.json({ success: true })
    await mintAdminCookie(response, {
      id: 'admin',
      role: 'admin',
      email: process.env.ADMIN_LOGIN_EMAIL || 'admin@local',
    })
    return response
  } catch {
    return NextResponse.json({ success: false, error: 'Erro ao realizar login admin.' }, { status: 500 })
  }
}
