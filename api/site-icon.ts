import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_ICON = '/favicon.svg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !anonKey) {
    return res.redirect(302, DEFAULT_ICON);
  }

  try {
    const endpoint = new URL('/rest/v1/site_settings', supabaseUrl);
    endpoint.searchParams.set('select', 'logo_url');
    endpoint.searchParams.set('id', 'eq.true');
    endpoint.searchParams.set('limit', '1');

    const response = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (!response.ok) return res.redirect(302, DEFAULT_ICON);

    const rows = await response.json();
    const logoUrl = rows?.[0]?.logo_url;

    if (typeof logoUrl === 'string' && /^https?:\/\//i.test(logoUrl)) {
      return res.redirect(302, logoUrl);
    }

    return res.redirect(302, DEFAULT_ICON);
  } catch {
    return res.redirect(302, DEFAULT_ICON);
  }
}