const { queryDatabase, isDbRefreshEnabled } = require('./refresh-token.service');
const {
  enforceMemoryRateLimit,
  resetMemoryRateLimit,
} = require('./memory-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const RATE_LIMIT_CONFIGS = {
  login: isDev
    ? { maxAttempts: 50, windowMs: 15 * 60 * 1000, blockDurationMs: 60 * 1000 }
    : { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 },
  refresh: { maxAttempts: 10, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 },
  'forgot-password': isDev
    ? { maxAttempts: 50, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 1000 }
    : { maxAttempts: 5, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 },
  'reset-password': isDev
    ? { maxAttempts: 50, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 1000 }
    : { maxAttempts: 10, windowMs: 60 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 },
  '2fa-verify': isDev
    ? { maxAttempts: 50, windowMs: 15 * 60 * 1000, blockDurationMs: 60 * 1000 }
    : { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 },
  'change-password': isDev
    ? { maxAttempts: 50, windowMs: 15 * 60 * 1000, blockDurationMs: 60 * 1000 }
    : { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 },
  // HIG-02 — SSO code exchange (token endpoint sibling of refresh)
  'sso-exchange': { maxAttempts: 10, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 },
};

function isRateLimitEnabled() {
  return isDbRefreshEnabled();
}

function storeUnavailableResult() {
  return {
    allowed: false,
    remainingAttempts: 0,
    storeUnavailable: true,
  };
}

async function checkRateLimit(identifier, identifierType, action) {
  // PR-06a: never fail-open when store is off/down.
  if (!isRateLimitEnabled()) {
    return storeUnavailableResult();
  }

  const config = RATE_LIMIT_CONFIGS[action] || {
    maxAttempts: 10,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  };

  let rateLimits;
  try {
    rateLimits = await queryDatabase(
      `SELECT * FROM auth_rate_limits
       WHERE identifier = $1 AND identifier_type = $2 AND action = $3`,
      [identifier, identifierType, action]
    );
  } catch (error) {
    console.error('[AUTH] rate-limit store error:', error.message);
    return storeUnavailableResult();
  }

  // queryDatabase returns null when pool missing — treat as store down (fail-closed).
  if (rateLimits == null) {
    return storeUnavailableResult();
  }

  const now = new Date();

  if (rateLimits.length === 0) {
    try {
      await queryDatabase(
        `INSERT INTO auth_rate_limits (identifier, identifier_type, action, attempt_count, last_attempt_at)
         VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)`,
        [identifier, identifierType, action]
      );
    } catch (error) {
      console.error('[AUTH] rate-limit insert error:', error.message);
      return storeUnavailableResult();
    }
    return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
  }

  const rateLimit = rateLimits[0];
  const lastAttempt = new Date(rateLimit.last_attempt_at);
  const windowStart = new Date(now.getTime() - config.windowMs);

  try {
    if (rateLimit.blocked_until) {
      const blockedUntil = new Date(rateLimit.blocked_until);
      if (blockedUntil > now) {
        return { allowed: false, remainingAttempts: 0, blockedUntil };
      }
      await queryDatabase(
        `UPDATE auth_rate_limits
         SET attempt_count = 1, last_attempt_at = CURRENT_TIMESTAMP, blocked_until = NULL
         WHERE id = $1`,
        [rateLimit.id]
      );
      return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
    }

    if (lastAttempt < windowStart) {
      await queryDatabase(
        `UPDATE auth_rate_limits
         SET attempt_count = 1, last_attempt_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [rateLimit.id]
      );
      return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
    }

    if (rateLimit.attempt_count >= config.maxAttempts) {
      const blockedUntil = new Date(now.getTime() + config.blockDurationMs);
      await queryDatabase(
        `UPDATE auth_rate_limits SET blocked_until = $1 WHERE id = $2`,
        [blockedUntil.toISOString(), rateLimit.id]
      );
      return { allowed: false, remainingAttempts: 0, blockedUntil };
    }

    await queryDatabase(
      `UPDATE auth_rate_limits
       SET attempt_count = attempt_count + 1, last_attempt_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [rateLimit.id]
    );

    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - rateLimit.attempt_count - 1,
    };
  } catch (error) {
    console.error('[AUTH] rate-limit update error:', error.message);
    return storeUnavailableResult();
  }
}

async function resetRateLimit(identifier, identifierType, action) {
  if (!isRateLimitEnabled()) return;
  try {
    await queryDatabase(
      `DELETE FROM auth_rate_limits
       WHERE identifier = $1 AND identifier_type = $2 AND action = $3`,
      [identifier, identifierType, action]
    );
  } catch (error) {
    console.error('[AUTH] rate-limit reset error:', error.message);
  }
}

async function recordLoginAttempt(email, ipAddress, userAgent, success, failureReason) {
  if (!isRateLimitEnabled()) return;
  try {
    await queryDatabase(
      `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, ipAddress, userAgent || null, success, failureReason || null]
    );
  } catch (error) {
    console.error('[AUTH] login_attempts insert error:', error.message);
  }
}

/**
 * Login rate limit — DB store when available; memory fallback for pilot / no-DB (PR-06a).
 * Never unlimited.
 */
async function enforceLoginRateLimit(email, ipAddress) {
  const normalizedEmail = String(email || '').toLowerCase();
  const ip = ipAddress || 'unknown';
  const allowMemoryFallback =
    process.env.NODE_ENV !== 'production' ||
    process.env.REDIS_DISABLED === 'true' ||
    process.env.AUTH_RATE_LIMIT_MEMORY === 'true';

  if (isRateLimitEnabled()) {
    const ipCheck = await checkRateLimit(ip, 'ip', 'login');
    if (!ipCheck.storeUnavailable) {
      if (!ipCheck.allowed) return ipCheck;
      const emailCheck = await checkRateLimit(normalizedEmail, 'email', 'login');
      if (!emailCheck.storeUnavailable) return emailCheck;
      if (!allowMemoryFallback) return emailCheck;
      console.warn('[AUTH] rate-limit DB indisponível — fallback memória (login/email)');
    } else if (!allowMemoryFallback) {
      return ipCheck;
    } else {
      console.warn('[AUTH] rate-limit DB indisponível — fallback memória (login/ip)');
    }
  }

  const config = RATE_LIMIT_CONFIGS.login;
  const memIp = enforceMemoryRateLimit(`login:ip:${ip}`, config);
  if (!memIp.allowed) return memIp;
  return enforceMemoryRateLimit(`login:email:${normalizedEmail}`, config);
}

async function resetLoginRateLimit(email, ipAddress) {
  const normalizedEmail = String(email || '').toLowerCase();
  const ip = ipAddress || 'unknown';
  if (isRateLimitEnabled()) {
    await resetRateLimit(ip, 'ip', 'login');
    await resetRateLimit(normalizedEmail, 'email', 'login');
    return;
  }
  resetMemoryRateLimit(`login:ip:${ip}`);
  resetMemoryRateLimit(`login:email:${normalizedEmail}`);
}

async function enforceForgotPasswordRateLimit(email, ipAddress) {
  const ipCheck = await checkRateLimit(ipAddress || 'unknown', 'ip', 'forgot-password');
  if (!ipCheck.allowed) return ipCheck;
  return checkRateLimit(email.toLowerCase(), 'email', 'forgot-password');
}

async function enforceResetPasswordRateLimit(ipAddress) {
  return checkRateLimit(ipAddress || 'unknown', 'ip', 'reset-password');
}

async function enforceTwoFactorVerifyRateLimit(identifier) {
  return checkRateLimit(identifier || 'unknown', 'temp_token', '2fa-verify');
}

async function enforceChangePasswordRateLimit(email, ipAddress) {
  const ipCheck = await checkRateLimit(ipAddress || 'unknown', 'ip', 'change-password');
  if (!ipCheck.allowed) return ipCheck;
  return checkRateLimit(String(email || '').toLowerCase() || 'unknown', 'email', 'change-password');
}

/** HIG-02 — IP rate limit for POST /sso/exchange (DB store or memory when no DB). */
async function enforceSsoExchangeRateLimit(ipAddress) {
  const ip = ipAddress || 'unknown';
  if (isRateLimitEnabled()) {
    return checkRateLimit(ip, 'ip', 'sso-exchange');
  }
  return enforceMemoryRateLimit(`sso-exchange:ip:${ip}`, RATE_LIMIT_CONFIGS['sso-exchange']);
}

function getClientIp(req) {
  return (req.header('x-forwarded-for') || '').split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function rateLimitDeniedStatus(check) {
  return check.storeUnavailable ? 503 : 429;
}

function rateLimitDeniedBody(check) {
  if (check.storeUnavailable) {
    return {
      success: false,
      error: 'Serviço temporariamente indisponível',
    };
  }
  return {
    success: false,
    error: 'Muitas tentativas. Tente novamente mais tarde.',
    blocked_until: check.blockedUntil?.toISOString?.() || check.blockedUntil,
  };
}

module.exports = {
  isRateLimitEnabled,
  checkRateLimit,
  enforceLoginRateLimit,
  enforceForgotPasswordRateLimit,
  enforceResetPasswordRateLimit,
  enforceTwoFactorVerifyRateLimit,
  enforceChangePasswordRateLimit,
  enforceSsoExchangeRateLimit,
  resetLoginRateLimit,
  recordLoginAttempt,
  getClientIp,
  rateLimitDeniedStatus,
  rateLimitDeniedBody,
  RATE_LIMIT_CONFIGS,
};
