/**
 * Auth refresh request helpers (Turismo FASE 0 + REWORK).
 * Cookie-first: empty body when no legacy string; never serialize undefined.
 * Session-expired: dispatch CustomEvent — AuthContext navigates via Next Router.
 * CommonJS so Node can unit-test without Jest in the turismo workspace.
 */
'use strict';

/** Canonical backend path (same as AUTH_V1.REFRESH). */
const AUTH_REFRESH_PATH = '/api/v1/auth/refresh';

/** Global event — no detail/payload (no token/PII). */
const AUTH_EXPIRED_EVENT = 'auth:expired';

const SESSION_EXPIRED_LOGIN_PATH = '/login?reason=session_expired';

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isNonEmptyRefreshToken(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Build JSON body for POST /api/v1/auth/refresh.
 * Cookie-first: return {} when legacy LS token is absent/invalid.
 * @param {unknown} legacyRefresh
 * @returns {{ refresh_token: string } | Record<string, never>}
 */
function buildAuthRefreshBody(legacyRefresh) {
  if (isNonEmptyRefreshToken(legacyRefresh)) {
    return { refresh_token: legacyRefresh };
  }
  return {};
}

/**
 * @param {unknown} legacyRefresh
 * @returns {RequestInit}
 */
function buildAuthRefreshFetchInit(legacyRefresh) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(buildAuthRefreshBody(legacyRefresh)),
  };
}

/**
 * Notify AuthContext that the session expired after failed refresh.
 * Event carries no detail (no tokens, cookies, headers, or PII).
 */
function notifySessionExpired() {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

/**
 * @param {() => void} onExpired
 */
function createAuthExpiredListener(onExpired) {
  const handler = () => {
    onExpired();
  };
  return {
    attach() {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
        return;
      }
      window.addEventListener(AUTH_EXPIRED_EVENT, handler);
    },
    detach() {
      if (typeof window === 'undefined' || typeof window.removeEventListener !== 'function') {
        return;
      }
      window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
    },
    handler,
  };
}

module.exports = {
  AUTH_REFRESH_PATH,
  AUTH_EXPIRED_EVENT,
  SESSION_EXPIRED_LOGIN_PATH,
  isNonEmptyRefreshToken,
  buildAuthRefreshBody,
  buildAuthRefreshFetchInit,
  notifySessionExpired,
  createAuthExpiredListener,
};
