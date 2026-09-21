/**
 * Typed re-exports for Turismo TypeScript consumers.
 * Implementation lives in auth-refresh-request.cjs (Node-testable).
 */
export {
  AUTH_REFRESH_PATH,
  AUTH_EXPIRED_EVENT,
  SESSION_EXPIRED_LOGIN_PATH,
  isNonEmptyRefreshToken,
  buildAuthRefreshBody,
  buildAuthRefreshFetchInit,
  notifySessionExpired,
  createAuthExpiredListener,
} from './auth-refresh-request.cjs';
