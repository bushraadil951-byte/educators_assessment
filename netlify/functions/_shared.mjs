import { neon } from '@neondatabase/serverless';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  return neon(process.env.DATABASE_URL);
}

export const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders
  },
  body: JSON.stringify(body)
});

export const parseBody = (event) => {
  try { return JSON.parse(event.body || '{}'); }
  catch { return {}; }
};

function sign(value) {
  return createHmac('sha256', process.env.SESSION_SECRET || '').update(value).digest('hex');
}

export function makeSession() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters.');
  }
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function hasAdminSession(event) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const cookie = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('ib_admin_session='));
  if (!cookie) return false;
  const token = decodeURIComponent(cookie.slice('ib_admin_session='.length));
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !process.env.SESSION_SECRET) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); }
  catch { return false; }
}

export const sessionCookie = (token) => `ib_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
export const clearSessionCookie = 'ib_admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
export const requireAdmin = (event) => hasAdminSession(event);
