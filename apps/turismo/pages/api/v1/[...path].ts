import type { NextApiRequest, NextApiResponse } from 'next';

function backendOrigin(): string {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.BACKEND_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3002' : '')
  ).replace(/\/$/, '');
}

/** Runtime proxy: same-origin /api/v1/* → backend (Docker INTERNAL_API_URL). */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = backendOrigin();
  if (!origin) {
    return res.status(503).json({
      error: 'Backend URL not configured (INTERNAL_API_URL)',
    });
  }

  const segments = req.query.path;
  const parts = Array.isArray(segments) ? segments : segments ? [segments] : [];
  const pathname = `/api/v1/${parts.map(encodeURIComponent).join('/')}`;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, v));
    } else if (value != null) {
      qs.append(key, value);
    }
  }
  const query = qs.toString();
  const target = `${origin}${pathname}${query ? `?${query}` : ''}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'connection' || lower === 'content-length') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    } else {
      headers.set(key, value);
    }
  }

  let body: string | undefined;
  if (req.method && !['GET', 'HEAD'].includes(req.method)) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    const text = await upstream.text();
    if (text) {
      res.send(text);
    } else {
      res.end();
    }
  } catch {
    return res.status(502).json({
      error: 'Backend unreachable',
    });
  }
}
