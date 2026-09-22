const SITE_URL = 'https://eldukkan.vercel.app';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

type SitemapProduct = {
  id: string;
  created_at?: string | null;
};

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD' },
    });
  }

  const urls: { loc: string; lastmod?: string }[] = [{ loc: SITE_URL + '/' }];

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const endpoint = new URL('/rest/v1/products', SUPABASE_URL);
      endpoint.searchParams.set('select', 'id,created_at');
      endpoint.searchParams.set('is_active', 'eq.true');
      endpoint.searchParams.set('order', 'created_at.desc');
      endpoint.searchParams.set('limit', '5000');

      const response = await fetch(endpoint, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const products = (await response.json()) as SitemapProduct[];
        for (const product of products) {
          if (!product.id) continue;
          urls.push({
            loc: `${SITE_URL}/product/${encodeURIComponent(product.id)}`,
            lastmod: product.created_at ? new Date(product.created_at).toISOString() : undefined,
          });
        }
      }
    } catch {
      // Keep the homepage in the sitemap if the catalog is temporarily unavailable.
    }
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(({ loc, lastmod }) =>
      `  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
    ),
    '</urlset>',
  ].join('\n');

  return new Response(req.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
