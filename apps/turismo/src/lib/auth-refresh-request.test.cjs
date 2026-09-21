/**
 * FASE 0 — Auth refresh contract tests (+ REWORK session-expired bridge).
 * Run: node --test apps/turismo/src/lib/auth-refresh-request.test.cjs
 */
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const {
  AUTH_REFRESH_PATH,
  AUTH_EXPIRED_EVENT,
  SESSION_EXPIRED_LOGIN_PATH,
  buildAuthRefreshBody,
  buildAuthRefreshFetchInit,
  isNonEmptyRefreshToken,
  notifySessionExpired,
  createAuthExpiredListener,
} = require('./auth-refresh-request.cjs');

const apiTsPath = path.join(__dirname, '..', 'services', 'api.ts');
const authContextPath = path.join(__dirname, '..', 'context', 'AuthContext.tsx');

describe('auth refresh contract helpers', () => {
  it('AUTH_REFRESH_PATH is canonical v1', () => {
    assert.equal(AUTH_REFRESH_PATH, '/api/v1/auth/refresh');
    assert.notEqual(AUTH_REFRESH_PATH, '/api/core/refresh');
  });

  it('rejects non-string refresh values (prevents undefined body key)', () => {
    assert.equal(isNonEmptyRefreshToken(undefined), false);
    assert.equal(isNonEmptyRefreshToken(null), false);
    assert.equal(isNonEmptyRefreshToken(123), false);
    assert.equal(isNonEmptyRefreshToken(''), false);
    assert.equal(isNonEmptyRefreshToken('tok'), true);
  });

  it('buildAuthRefreshBody: empty object when no legacy string (cookie-first)', () => {
    assert.deepEqual(buildAuthRefreshBody(undefined), {});
    assert.deepEqual(buildAuthRefreshBody(null), {});
    assert.deepEqual(buildAuthRefreshBody(''), {});
    const serialized = JSON.stringify(buildAuthRefreshBody(undefined));
    assert.equal(serialized, '{}');
    assert.equal(serialized.includes('refresh_token'), false);
  });

  it('buildAuthRefreshBody: only string token becomes refresh_token', () => {
    assert.deepEqual(buildAuthRefreshBody('legacy-refresh-xyz'), {
      refresh_token: 'legacy-refresh-xyz',
    });
  });

  it('buildAuthRefreshFetchInit: credentials include + never undefined token', () => {
    const initEmpty = buildAuthRefreshFetchInit(undefined);
    assert.equal(initEmpty.method, 'POST');
    assert.equal(initEmpty.credentials, 'include');
    assert.equal(initEmpty.body, '{}');

    const initLegacy = buildAuthRefreshFetchInit('abc');
    assert.equal(initLegacy.credentials, 'include');
    assert.equal(initLegacy.body, JSON.stringify({ refresh_token: 'abc' }));
    assert.equal(JSON.parse(String(initLegacy.body)).refresh_token, 'abc');
  });
});

describe('turismo api.ts refresh wiring (source guard)', () => {
  it('must not call legacy /api/core/refresh', () => {
    const src = fs.readFileSync(apiTsPath, 'utf8');
    assert.equal(
      src.includes('/api/core/refresh'),
      false,
      'BUG: api.ts still references /api/core/refresh',
    );
  });

  it('must use AUTH_REFRESH_PATH / auth-refresh-request helpers', () => {
    const src = fs.readFileSync(apiTsPath, 'utf8');
    assert.ok(
      src.includes('auth-refresh-request') || src.includes('AUTH_REFRESH_PATH'),
      'api.ts must import auth refresh helpers',
    );
    assert.ok(
      src.includes("credentials: 'include'") ||
        src.includes('credentials: "include"') ||
        src.includes("credentials: options.credentials ?? 'include'") ||
        src.includes('buildAuthRefreshFetchInit'),
      'api.ts refresh must set credentials include (directly or via helper)',
    );
  });

  it('must not navigate with window.location.href = /login', () => {
    const src = fs.readFileSync(apiTsPath, 'utf8');
    assert.equal(
      /window\.location\.href\s*=\s*['"]\/login['"]/.test(src),
      false,
      'REWORK: api.ts must not set window.location.href to /login',
    );
    assert.ok(
      src.includes('notifySessionExpired'),
      'api.ts must dispatch session-expired via notifySessionExpired',
    );
  });
});

describe('auth:expired bridge', () => {
  /** @type {any} */
  let previousWindow;

  beforeEach(() => {
    previousWindow = global.window;
    const ee = new EventEmitter();
    global.window = {
      addEventListener: (type, fn) => ee.on(type, fn),
      removeEventListener: (type, fn) => ee.off(type, fn),
      dispatchEvent: (event) => {
        ee.emit(event.type, event);
        return true;
      },
    };
    global.CustomEvent = class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    };
  });

  afterEach(() => {
    global.window = previousWindow;
    delete global.CustomEvent;
  });

  it('notifySessionExpired dispatches auth:expired without detail/PII', () => {
    /** @type {any[]} */
    const seen = [];
    window.addEventListener(AUTH_EXPIRED_EVENT, (ev) => seen.push(ev));
    notifySessionExpired();
    assert.equal(seen.length, 1);
    assert.equal(seen[0].type, AUTH_EXPIRED_EVENT);
    assert.equal(seen[0].detail, undefined);
    const serialized = JSON.stringify(seen[0]);
    assert.equal(serialized.includes('refresh_token'), false);
    assert.equal(serialized.includes('access_token'), false);
    assert.equal(serialized.includes('@'), false);
  });

  it('createAuthExpiredListener runs clear+navigate callbacks and cleans up', () => {
    let calls = 0;
    const navigations = [];
    const listener = createAuthExpiredListener(() => {
      calls += 1;
      navigations.push(SESSION_EXPIRED_LOGIN_PATH);
    });
    listener.attach();
    notifySessionExpired();
    assert.equal(calls, 1);
    assert.deepEqual(navigations, ['/login?reason=session_expired']);

    listener.detach();
    notifySessionExpired();
    assert.equal(calls, 1, 'detached listener must not fire again');
  });
});

describe('AuthContext session-expired wiring (source guard)', () => {
  it('registers auth:expired listener and navigates to session_expired login', () => {
    const src = fs.readFileSync(authContextPath, 'utf8');
    assert.ok(src.includes('createAuthExpiredListener'), 'must register auth expired listener');
    assert.ok(src.includes('useRouter'), 'must use Next router');
    assert.ok(
      src.includes('SESSION_EXPIRED_LOGIN_PATH') ||
        src.includes('/login?reason=session_expired'),
      'must navigate to /login?reason=session_expired',
    );
    assert.ok(src.includes('clearAuth'), 'must clear auth on expired');
    assert.ok(src.includes('listener.detach') || src.includes('removeEventListener'), 'must cleanup');
  });
});
