/** Endpoints e helpers canônicos para /api/v1/auth/* (T1.7). */

export const AUTH_V1 = {
  LOGIN: '/api/v1/auth/login',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH: '/api/v1/auth/refresh',
  SESSION: '/api/v1/auth/session',
  REGISTER: '/api/v1/auth/register',
  FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
  RESET_PASSWORD: '/api/v1/auth/reset-password',
  CHANGE_PASSWORD: '/api/v1/auth/change-password',
  TWO_FA_SETUP: '/api/v1/auth/2fa/setup',
  TWO_FA_VERIFY_SETUP: '/api/v1/auth/2fa/verify-setup',
  TWO_FA_VERIFY: '/api/v1/auth/2fa/verify',
  TWO_FA_DISABLE: '/api/v1/auth/2fa/disable',
  TWO_FA_BACKUP_CODES: '/api/v1/auth/2fa/backup-codes',
} as const;

export const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface AuthV1UserPayload {
  id: string | number;
  email?: string;
  name?: string;
  full_name?: string;
  phone?: string | null;
  role?: string;
  roles?: string[];
  permissions?: string[];
  status?: string;
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
}

export interface AuthV1SessionResponse {
  authenticated: boolean;
  user?: AuthV1UserPayload;
  session?: Record<string, unknown>;
  error?: string;
}

export interface AuthV1LoginPayload {
  user?: AuthV1UserPayload;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  requires_2fa?: boolean;
  temp_token?: string;
}

export interface MappedAuthUser {
  id: number | string;
  email: string;
  full_name: string;
  name: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role?: string;
  is_active: boolean;
  permissions: string[];
  token?: string;
  created_at: string;
  last_login?: string;
}

export function mapAuthV1User(
  u: AuthV1UserPayload,
  token?: string
): MappedAuthUser {
  const name = u.name || u.full_name || '';
  const roles = Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : [];
  const parsedId =
    typeof u.id === 'string' ? parseInt(u.id, 10) : (u.id as number);

  const phone =
    typeof u.phone === 'string' && u.phone.trim() ? u.phone.trim() : null;

  return {
    id: Number.isNaN(parsedId) ? u.id : parsedId,
    email: u.email || '',
    full_name: name,
    name,
    firstName: name.split(' ')[0],
    lastName: name.split(' ').slice(1).join(' ') || '',
    phone,
    role: u.role || roles[0],
    is_active: u.status !== 'inactive' && u.is_active !== false,
    permissions:
      Array.isArray(u.permissions) && u.permissions.length
        ? u.permissions
        : roles,
    token,
    created_at: u.created_at || new Date().toISOString(),
    last_login: u.last_login,
  };
}

export function parseAuthV1LoginResponse(
  json: Record<string, unknown>
): AuthV1LoginPayload | null {
  const payload = (json.data ?? json) as Record<string, unknown>;

  if (payload.requires_2fa === true) {
    return {
      requires_2fa: true,
      temp_token: String(payload.temp_token ?? ''),
      expires_in: payload.expires_in as number | undefined,
    };
  }

  const access = payload.access_token ?? json.access_token;
  const refresh = payload.refresh_token ?? json.refresh_token;

  if (!access || !refresh) {
    return null;
  }

  return {
    user: payload.user as AuthV1UserPayload | undefined,
    access_token: String(access),
    refresh_token: String(refresh),
    expires_in: payload.expires_in as number | undefined,
  };
}

export interface AuthV1RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: 'user' | 'manager';
}

export function mapRegisterV1User(u: AuthV1UserPayload): MappedAuthUser {
  return mapAuthV1User(u);
}

export function parseAuthV1RegisterResponse(
  json: Record<string, unknown>
): AuthV1UserPayload | null {
  if (json.success === false) {
    return null;
  }
  const payload = (json.data ?? json) as AuthV1UserPayload;
  if (!payload?.email) {
    return null;
  }
  return payload;
}

export function parseAuthV1RefreshResponse(
  json: Record<string, unknown>
): Pick<AuthV1LoginPayload, 'access_token' | 'refresh_token'> | null {
  const payload = (json.data ?? json) as Record<string, unknown>;
  const access = payload.access_token ?? json.access_token;
  const refresh = payload.refresh_token ?? json.refresh_token;

  if (!access) {
    return null;
  }

  return {
    access_token: String(access),
    refresh_token: refresh ? String(refresh) : undefined,
  } as Pick<AuthV1LoginPayload, 'access_token' | 'refresh_token'>;
}
