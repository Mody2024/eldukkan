import fs from 'node:fs';
import path from 'node:path';

const siteUrl = 'https://eldukkan.vercel.app';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !anonKey) {
  console.warn('Homepage prerender skipped: missing Supabase environment variables.');
  process.exit(0);
}

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
};

async function fetchJson(pathname, params = {}) {
  const endpoint = new URL(pathname, supabaseUrl);
  for (const [key, value] of Object.entries(params)) endpoint.searchParams.set(key, value);
  const response = await fetch(endpoint, { headers });
  if (!response.ok) throw new Error(`Supabase request failed with HTTP ${response.status} for ${pathname}`);
  return response.json();
}

const [settingsRows, products] = await Promise.all([
  fetchJson('/rest/v1/site_settings', {
    select: 'store_name,logo_url,hero_headline,hero_subheadline,hero_image_url',
    limit: '1',
  }),
  fetchJson('/rest/v1/products', {
    select: 'id,name,description,category,price,sale_price,sale_ends_at,stock,image_url,featured,featured_order,created_at,updated_at',
    is_active: 'eq.true',
    order: 'featured.desc,featured_order.asc,created_at.desc',
    limit: '24',
  }),
]);

const settings = settingsRows?.[0] || {};
const storeName = settings.store_name || 'ElDukkan';
const description = String(settings.hero_subheadline || 'Shop products, deals and everyday essentials online in Egypt.').slice(0, 155);
const headline = String(settings.hero_headline || storeName);
const logoUrl = typeof settings.logo_url === 'string' && /^https?:\/\//i.test(settings.logo_url)
  ? settings.logo_url
  : siteUrl + '/favicon';

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const safeJson = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');

const currentPrice = (product) => {
  const saleActive = !!product.sale_price && (!product.sale_ends_at || new Date(product.sale_ends_at) > new Date());
  return saleActive ? product.sale_price : product.price;
};

const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
const itemList = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: storeName + ' Products',
  numberOfItems: products.length,
  itemListElement: products.map((product, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: siteUrl + '/product/' + encodeURIComponent(product.id),
    name: product.name,
  })),
};

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: storeName,
  alternateName: 'Eldukkan',
  url: siteUrl + '/',
  inLanguage: 'en',
  potentialAction: {
    '@type': 'SearchAction',
    target: siteUrl + '/?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: storeName,
  alternateName: 'Eldukkan',
  url: siteUrl + '/',
  logo: logoUrl,
  areaServed: {
    '@type': 'Country',
    name: 'Egypt',
  },
};

const webPage = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: storeName + ' | Online Marketplace in Egypt',
  description,
  url: siteUrl + '/',
  isPartOf: website,
  mainEntity: itemList,
};

const template = fs.readFileSync(path.resolve('dist/index.html'), 'utf8');

const head = [
  '<title>' + escapeHtml(storeName + ' | Online Marketplace in Egypt') + '</title>',
  '<meta name="description" content="' + escapeHtml(description) + '" />',
  '<meta name="robots" content="index, follow, max-image-preview:large" />',
  '<link rel="canonical" href="' + siteUrl + '/" />',
  '<meta property="og:site_name" content="' + escapeHtml(storeName) + '" />',
  '<meta property="og:title" content="' + escapeHtml(storeName + ' | Online Marketplace in Egypt') + '" />',
  '<meta property="og:description" content="' + escapeHtml(description) + '" />',
  '<meta property="og:type" content="website" />',
  '<meta property="og:url" content="' + siteUrl + '/" />',
  '<meta property="og:image" content="' + escapeHtml(logoUrl) + '" />',
  '<meta property="og:image:alt" content="' + escapeHtml(storeName) + '" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta name="twitter:title" content="' + escapeHtml(storeName + ' | Online Marketplace in Egypt') + '" />',
  '<meta name="twitter:description" content="' + escapeHtml(description) + '" />',
  '<meta name="twitter:image" content="' + escapeHtml(logoUrl) + '" />',
  '<script type="application/ld+json" data-eldukkan-prerender-jsonld="true">' + safeJson(website) + '</script>',
  '<script type="application/ld+json" data-eldukkan-prerender-jsonld="true">' + safeJson(organization) + '</script>',
  '<script type="application/ld+json" data-eldukkan-prerender-jsonld="true">' + safeJson(webPage) + '</script>',
  '<script type="application/ld+json" data-eldukkan-prerender-jsonld="true">' + safeJson(itemList) + '</script>',
].join('\n    ');

const productLinks = products.map((product) => {
  const price = currentPrice(product);
  return '<li><a href="' + siteUrl + '/product/' + encodeURIComponent(product.id) + '">' +
    escapeHtml(product.name) + ' — EGP ' + escapeHtml(price) + '</a></li>';
}).join('');

const categoryLinks = categories.map((category) =>
  '<li><a href="' + siteUrl + '/category/' + encodeURIComponent(category) + '">' +
  escapeHtml(category) + '</a></li>'
).join('');

const body = [
  '<main class="seo-prerender-home">',
  '<header>',
  '<h1>' + escapeHtml(headline) + '</h1>',
  '<p>' + escapeHtml(description) + '</p>',
  '</header>',
  categories.length ? '<nav aria-label="Categories"><h2>Shop by category</h2><ul>' + categoryLinks + '</ul></nav>' : '',
  products.length ? '<section><h2>Products</h2><ul>' + productLinks + '</ul></section>' : '',
  '<p><a href="' + siteUrl + '/">Visit ' + escapeHtml(storeName) + '</a></p>',
  '</main>',
].join('');

const html = template
  .replace(/<title>[\s\S]*?<\/title>/i, '')
  .replace(/<meta name="description"[^>]*\/>/i, '')
  .replace(/<meta name="robots"[^>]*\/>/i, '')
  .replace(/<link rel="canonical"[^>]*\/>/i, '')
  .replace(/<meta property="og:[^"]+"[^>]*\/>/gi, '')
  .replace(/<meta name="twitter:[^"]+"[^>]*\/>/gi, '')
  .replace(/<script type="application\/ld\+json"[\s\S]*?<\/script>/gi, '')
  .replace(/<\/head>/i, '    ' + head + '\n  </head>')
  .replace(/<div id="root"><\/div>/i, '<div id="root">' + body + '</div>');

fs.writeFileSync(path.resolve('dist/index.html'), html);
console.log('Prerendered homepage with ' + products.length + ' products and ' + categories.length + ' categories.');
