import { json, parseBody, makeSession, sessionCookie, clearSessionCookie, hasAdminSession } from './_shared.mjs';
import { timingSafeEqual } from 'node:crypto';

export const handler = async (event) => {
  if (event.httpMethod === 'GET') return json(200, { authenticated: hasAdminSession(event) });
  if (event.httpMethod === 'DELETE') return json(200, { ok: true }, { 'set-cookie': clearSessionCookie });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  try {
    const { password } = parseBody(event);
    const expected = process.env.ADMIN_PASSWORD || '';
    if (!expected) return json(500, { error: 'ADMIN_PASSWORD is not configured in Netlify.' });
    const a = Buffer.from(String(password || ''));
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return json(401, { error: 'Incorrect password.' });
    return json(200, { ok: true }, { 'set-cookie': sessionCookie(makeSession()) });
  } catch (error) {
    console.error('login endpoint:', error);
    return json(500, { error: error.message || 'Could not sign in.' });
  }
};
