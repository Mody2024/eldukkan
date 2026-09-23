import fs from 'node:fs';
import path from 'node:path';

const siteUrl = 'https://eldukkan.vercel.app';
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !anonKey) {
  console.warn('Product prerender skipped: missing VITE_SUPABASE_URL/SUPABASE_URL or VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY.');
  process.exit(0);
}

const endpoint = new URL('/rest/v1/products', supabaseUrl);
endpoint.searchParams.set(
  'select',
  'id,name,description,category,price,sale_price,sale_ends_at,stock,image_url,images,vendor_name,updated_at,created_at'
);
endpoint.searchParams.set('is_active', 'eq.true');
endpoint.searchParams.set('order', 'created_at.desc');
endpoint.searchParams.set('limit', '5000');

const response = await fetch(endpoint, {
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  },
});

if (!response.ok) {
  throw new Error(`Supabase products request failed with HTTP ${response.status}`);
}

const products = await response.json();
const templatePath = path.resolve('dist/index.html');
const template = fs.readFileSync(templatePath, 'utf8');

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\\u2028/g, '\\u2028')
    .replace(/\\u2029/g, '\\u2029');

let reviewsByProduct = new Map();

const productIds = products.map((product) => product?.id).filter(Boolean);
if (productIds.length > 0) {
  const reviewEndpoint = new URL('/rest/v1/reviews', supabaseUrl);
  reviewEndpoint.searchParams.set('select', 'product_id,rating');
  reviewEndpoint.searchParams.set('product_id', `in.(${productIds.join(',')})`);
  reviewEndpoint.searchParams.set('limit', '10000');

  const reviewResponse = await fetch(reviewEndpoint, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (reviewResponse.ok) {
    const reviews = await reviewResponse.json();
    reviewsByProduct = reviews.reduce((map, review) => {
      const list = map.get(review.product_id) || [];
      list.push(Number(review.rating || 0));
      map.set(review.product_id, list);
      return map;
    }, new Map());
  } else {
    console.warn(`Product prerender: reviews request returned HTTP ${reviewResponse.status}; continuing without ratings.`);
  }
}

for (const product of products) {
  if (!product?.id || !product?.name) continue;

  const productUrl = `${siteUrl}/product/${encodeURIComponent(product.id)}`;
  const description = String(product.description || `Shop ${product.name} online at ElDukkan.`).slice(0, 155);
  const gallery = [product.image_url, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);
  const isOnSale =
    !!product.sale_price &&
    (!product.sale_ends_at || new Date(product.sale_ends_at) > new Date());
  const outOfStock = Number(product.stock ?? 1) <= 0;
  const ratings = reviewsByProduct.get(product.id) || [];
  const reviewCount = ratings.length;
  const reviewAverage = reviewCount
    ? ratings.reduce((sum, rating) => sum + rating, 0) / reviewCount
    : 0;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    image: gallery,
    sku: product.id,
    url: productUrl,
    ...(product.category ? { category: product.category } : {}),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id: productUrl,
    },
    ...(reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(reviewAverage.toFixed(2)),
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'EGP',
      price: isOnSale ? product.sale_price : product.price,
      availability: outOfStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: product.vendor_name || 'ElDukkan',
      },
      ...(product.sale_ends_at && isOnSale ? { priceValidUntil: product.sale_ends_at.split('T')[0] } : {}),
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${siteUrl}/`,
      },
      ...(product.category
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: product.category,
              item: `${siteUrl}/category/${encodeURIComponent(product.category)}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: product.category ? 3 : 2,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  const head = [
    `<title>${escapeHtml(product.name)} | ElDukkan</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<link rel="canonical" href="${escapeHtml(productUrl)}" />`,
    `<meta property="og:site_name" content="ElDukkan" />`,
    `<meta property="og:title" content="${escapeHtml(product.name)} | ElDukkan" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:url" content="${escapeHtml(productUrl)}" />`,
    ...(gallery[0] ? [
      `<meta property="og:image" content="${escapeHtml(gallery[0])}" />`,
      `<meta property="og:image:alt" content="${escapeHtml(product.name)}" />`,
    ] : []),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(product.name)} | ElDukkan" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    ...(gallery[0] ? [
      `<meta name="twitter:image" content="${escapeHtml(gallery[0])}" />`,
      `<meta name="twitter:image:alt" content="${escapeHtml(product.name)}" />`,
    ] : []),
    `<script type="application/ld+json">${safeJson(schema)}</script>`,
    `<script type="application/ld+json">${safeJson(breadcrumb)}</script>`,
  ].join('\n    ');

  const bodyInsert = `
        <main class="seo-prerender" aria-label="${escapeHtml(product.name)}">
          <nav aria-label="Breadcrumb">
            <a href="${siteUrl}/">Home</a>
            ${product.category ? ` / <a href="${siteUrl}/category/${encodeURIComponent(product.category)}">${escapeHtml(product.category)}</a>` : ''}
            / <span>${escapeHtml(product.name)}</span>
          </nav>
          <article>
            <h1>${escapeHtml(product.name)}</h1>
            ${gallery[0] ? `<img src="${escapeHtml(gallery[0])}" alt="${escapeHtml(product.name)}" width="800" height="800" />` : ''}
            <p>${escapeHtml(product.description || product.name)}</p>
            <p>Price: EGP ${escapeHtml(isOnSale ? product.sale_price : product.price)}</p>
            <p>${outOfStock ? 'Out of stock' : 'In stock'}</p>
            <a href="${productUrl}">View ${escapeHtml(product.name)} at ElDukkan</a>
          </article>
        </main>
`;

  const html = template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta name="description"[^>]*\/>/i, '')
    .replace(/<meta name="robots"[^>]*\/>/i, '')
    .replace(/<link rel="canonical"[^>]*\/>/i, '')
    .replace(/<meta property="og:[^"]+"[^>]*\/>/gi, '')
    .replace(/<meta name="twitter:[^"]+"[^>]*\/>/gi, '')
    .replace(/<\/head>/i, `    ${head}\n  </head>`)
    .replace(/<div id="root"><\/div>/i, `<div id="root">${bodyInsert}</div>`);

  const outputDir = path.join('dist', 'product', product.id);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
}

console.log(`Prerendered ${products.length} active product pages.`);
