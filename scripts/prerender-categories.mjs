import fs from 'node:fs';
import path from 'node:path';

const siteUrl = 'https://eldukkan.vercel.app';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !anonKey) {
  console.warn('Category prerender skipped: missing Supabase environment variables.');
  process.exit(0);
}

const endpoint = new URL('/rest/v1/products', supabaseUrl);
endpoint.searchParams.set('select', 'id,name,description,category,price,sale_price,sale_ends_at,stock,image_url');
endpoint.searchParams.set('is_active', 'eq.true');
endpoint.searchParams.set('order', 'created_at.desc');
endpoint.searchParams.set('limit', '5000');

const response = await fetch(endpoint, {
  headers: { apikey: anonKey, Authorization: 'Bearer ' + anonKey },
});

if (!response.ok) throw new Error('Supabase category request failed with HTTP ' + response.status);
const products = await response.json();
const template = fs.readFileSync(path.resolve('dist/index.html'), 'utf8');

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\"/g, '&quot;')
  .replace(/'/g, '&#39;');

const safeJson = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');

const categories = new Map();
for (const product of products) {
  if (!product?.category || !product?.id || !product?.name) continue;
  const list = categories.get(product.category) || [];
  list.push(product);
  categories.set(product.category, list);
}

for (const [category, items] of categories.entries()) {
  const categoryUrl = siteUrl + '/category/' + encodeURIComponent(category);
  const description = 'Browse ' + items.length + ' ' + category + ' product' + (items.length === 1 ? '' : 's') + ' available on ElDukkan in Egypt.';
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category + ' Products',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: siteUrl + '/product/' + encodeURIComponent(item.id),
      name: item.name,
    })),
  };
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category + ' Products',
    description,
    url: categoryUrl,
    isPartOf: { '@type': 'WebSite', name: 'ElDukkan', url: siteUrl + '/' },
    mainEntity: itemList,
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl + '/' },
      { '@type': 'ListItem', position: 2, name: category, item: categoryUrl },
    ],
  };
  const head = [
    '<title>' + escapeHtml(category) + ' Products | ElDukkan</title>',
    '<meta name="description" content="' + escapeHtml(description) + '" />',
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    '<link rel="canonical" href="' + escapeHtml(categoryUrl) + '" />',
    '<meta property="og:site_name" content="ElDukkan" />',
    '<meta property="og:title" content="' + escapeHtml(category) + ' Products | ElDukkan" />',
    '<meta property="og:description" content="' + escapeHtml(description) + '" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:url" content="' + escapeHtml(categoryUrl) + '" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + escapeHtml(category) + ' Products | ElDukkan" />',
    '<meta name="twitter:description" content="' + escapeHtml(description) + '" />',
    '<script type="application/ld+json" data-eldukkan-prerender-jsonld="true">' + safeJson(pageSchema) + '</script>',
    '<script type="application/ld+json" data-eldukkan-prerender-jsonld="true">' + safeJson(breadcrumb) + '</script>',
    '<script type="application/ld+json" data-eldukkan-prerender-jsonld="true">' + safeJson(itemList) + '</script>',
  ].join('\n    ');
  const body = '<main class="seo-prerender" aria-label="' + escapeHtml(category) + '">' +
    '<nav aria-label="Breadcrumb"><a href="' + siteUrl + '/">Home</a> / <span>' + escapeHtml(category) + '</span></nav>' +
    '<h1>' + escapeHtml(category) + ' Products</h1>' +
    '<p>' + escapeHtml(description) + '</p>' +
    '<ul>' + items.map((item) => '<li><a href="' + siteUrl + '/product/' + encodeURIComponent(item.id) + '">' + escapeHtml(item.name) + '</a></li>').join('') + '</ul>' +
    '</main>';
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta name="description"[^>]*\/>/i, '')
    .replace(/<meta name="robots"[^>]*\/>/i, '')
    .replace(/<link rel="canonical"[^>]*\/>/i, '')
    .replace(/<meta property="og:[^"]+"[^>]*\/>/gi, '')
    .replace(/<meta name="twitter:[^"]+"[^>]*\/>/gi, '')
    .replace(/<\/head>/i, '    ' + head + '\n  </head>')
    .replace(/<div id="root"><\/div>/i, '<div id="root">' + body + '</div>');
  const outputDir = path.join('dist', 'category', category);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
}

console.log('Prerendered ' + categories.size + ' category pages.');