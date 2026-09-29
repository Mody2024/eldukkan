import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import SEO from '../components/SEO';
import AIEntryPoint from '../components/AIEntryPoint';
import { useAIPageContext } from '../hooks/useAIContext';
import { useTranslation } from '../lib/i18n';

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const category = useMemo(() => {
    try {
      return slug ? decodeURIComponent(slug).trim() : '';
    } catch {
      return '';
    }
  }, [slug]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useTranslation();
  useAIPageContext({
    category,
    productCount: products.length,
    visibleProducts: products.slice(0, 12).map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      sale_price: product.sale_price ?? null,
      stock: product.stock ?? null,
    })),
  });

  useEffect(() => {
    if (!category) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setProducts(data ?? []);
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [category]);

  const canonical = category ? `/category/${encodeURIComponent(category)}` : '/';

  return (
    <div className="space-y-6 sm:space-y-8">
      <SEO
        title={category ? `${category} Products | ElDukkan` : 'Shop by Category | ElDukkan'}
        description={category
          ? `Browse ${products.length ? products.length + ' ' : ''}${category} products available on ElDukkan in Egypt.`
          : 'Browse products by category on ElDukkan.'}
        canonical={canonical}
        jsonLd={category ? [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${category} Products`,
            url: `https://eldukkan.vercel.app${canonical}`,
            isPartOf: {
              '@type': 'WebSite',
              name: 'ElDukkan',
              url: 'https://eldukkan.vercel.app/',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://eldukkan.vercel.app/' },
              { '@type': 'ListItem', position: 2, name: category, item: `https://eldukkan.vercel.app${canonical}` },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${category} Products`,
            numberOfItems: products.length,
            itemListElement: products.map((product, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: `https://eldukkan.vercel.app/product/${encodeURIComponent(product.id)}`,
              name: product.name,
            })),
          },
        ] : undefined}
      />

      <div className="space-y-2">
        <Link to="/" className="text-sm font-bold text-brand-500 hover:underline">← All products</Link>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight dark:text-white">{category || 'Category'}</h1>
        <p className="text-sm text-stone-500">
          {loading ? 'Loading products…' : `${products.length} product${products.length === 1 ? '' : 's'} in this category`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <AIEntryPoint
          label={language === 'ar' ? 'ساعدني أختار' : 'Help me choose'}
          prompt={language === 'ar' ? 'ساعدني أختار من الفئة دي' : 'Help me choose from this category'}
          source="category"
          mode="task"
        />
        <AIEntryPoint
          label={language === 'ar' ? 'قارن المنتجات' : 'Compare products'}
          prompt={language === 'ar' ? 'قارن المنتجات الظاهرة هنا' : 'Compare the products shown here'}
          source="category"
        />
      </div>

      {loading ? (
        <div className="py-20 text-center text-stone-500 font-bold">Loading live catalog…</div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <p className="text-stone-500 font-bold">No active products found in this category.</p>
          <Link to="/" className="inline-block text-brand-500 font-bold hover:underline">Browse all products</Link>
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center space-y-4 storefront-card">
          <p className="text-stone-500 font-bold">{language === 'ar' ? 'الفئة دي مفيهاش منتجات متاحة حاليًا.' : 'No active products were found in this category.'}</p>
          <AIEntryPoint
            label={language === 'ar' ? 'ساعدني ألاقي بدائل' : 'Find alternatives with AI'}
            prompt={language === 'ar' ? 'الفئة دي فاضية. ساعدني ألاقي بدائل حقيقية قريبة منها' : 'This category is empty. Help me find real alternatives close to it'}
            source="category-empty"
            mode="task"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6" data-ai-target="products">
          {products.map((product) => {
            const onSale = !!(product.sale_price && (!product.sale_ends_at || new Date(product.sale_ends_at) > new Date()));
            const outOfStock = product.stock !== undefined && product.stock <= 0;

            return (
              <article key={product.id} className="storefront-card overflow-hidden hover:shadow-lg transition">
                <Link data-ai-target={`product-${product.id}`} to={`/product/${product.id}`} className="block">
                  <div className="h-44 sm:h-60 bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                  </div>
                  <div className="p-4 sm:p-5 space-y-2">
                    <h2 className="font-black text-sm sm:text-lg dark:text-white line-clamp-2">{product.name}</h2>
                    <p className="text-xs text-stone-500 line-clamp-2">{product.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-brand-500">
                        EGP {onSale ? product.sale_price : product.price}
                      </span>
                      {onSale && <span className="text-xs text-stone-400 line-through">EGP {product.price}</span>}
                    </div>
                    {product.rating !== undefined && product.review_count !== undefined && product.review_count > 0 && (
                      <p className="text-xs font-bold text-stone-500">{product.rating.toFixed(1)} / 5 · {product.review_count} review{product.review_count === 1 ? '' : 's'}</p>
                    )}
                    {outOfStock && <p className="text-xs font-bold text-stone-500">Out of stock</p>}
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
