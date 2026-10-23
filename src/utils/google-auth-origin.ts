/** GIS popup codes are bound to the calling page origin, not legacy "postmessage".
 * Only server-allowlisted origins can reach the code exchange. Ignore redirect_uri
 * supplied in the request body, including clients cached before this fix.
 */
export function googlePopupOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) return null;
    const allowed = ['https://lease-iq.vercel.app'];
    if (process.env.FRONTEND_URL) allowed.push(new URL(process.env.FRONTEND_URL).origin);
    if (process.env.NODE_ENV !== 'production') allowed.push('http://localhost:3000', 'http://127.0.0.1:3000');
    return allowed.includes(origin) ? origin : null;
  } catch { return null; }
}
