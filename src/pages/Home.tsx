import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import type { Product } from '../types';
import { ShoppingBag, Sparkles, Star, Heart } from 'lucide-react';
import SEO from '../components/SEO';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'trending';

export default function Home() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const searchQuery = searchParams.get('q') || '';
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [loading, setLoading] = useState(true);
  const { addToCart, showToast, userId, wishlist, toggleWishlistId, storeName, heroHeadline, heroSubheadline, heroImageUrl } = useStore();
  const { t } = useTranslation();

  useEffect(() => {
    fetchProducts();

    // Real Supabase Realtime subscription: any insert/update/delete on the
    // products table (e.g. from the admin dashboard) reflects live here
    // without a manual refresh.
    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      setProducts(data ?? []);
    } catch {
      showToast('Could not reach the store catalog. Showing a preview instead.');
      setProducts([
        { id: '1', name: 'Eldukkan Custom Hoodie', price: 650, image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80', description: 'Premium heavyweight cotton streetwear hoodie.', category: 'Streetwear', rating: 4.6, review_count: 128, stock: 14 },
        { id: '2', name: 'Cyberpunk Desk Mat', price: 350, image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', description: 'Anti-slip waterproof gaming mat with RGB aesthetic.', category: 'Tech & Gadgets', rating: 4.2, review_count: 54, stock: 30 },
        { id: '3', name: 'Minimalist Mechanical Keyboard', price: 1450, image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', description: 'Hot-swappable wireless mechanical keyboard.', category: 'Tech & Gadgets', rating: 4.8, review_count: 210, stock: 6 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock !== undefined && product.stock <= 0) return;
    const isOnSale = !!(product.sale_price && (!product.sale_ends_at || new Date(product.sale_ends_at) > new Date()));
    addToCart(isOnSale ? { ...product, price: product.sale_price! } : product);
    showToast(`Added ${product.name} to cart`);
  };

  const handleToggleWishlist = async (product: Product) => {
    if (!userId) {
      showToast('Sign in to save items to your wishlist.');
      return;
    }
    const isSaved = wishlist.includes(product.id);
    toggleWishlistId(product.id);
    if (isSaved) {
      await supabase.from('wishlists').delete().eq('customer_id', userId).eq('product_id', product.id);
    } else {
      await supabase.from('wishlists').insert([{ customer_id: userId, product_id: product.id }]);
    }
  };

  const categories = Array.from(new Set(products.map((p) => p.category).filter((c): c is string => !!c)));

  const filteredProducts = products
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((p) => !activeCategory || p.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'trending') return (b.vote_score ?? 0) - (a.vote_score ?? 0);
      return 0;
    });

  const featuredProducts = products
    .filter((p) => p.featured)
    .sort((a, b) => (a.featured_order ?? 0) - (b.featured_order ?? 0));

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-10 lg:p-12 flex flex-col md:flex-row items-center gap-8 shadow-sm">
        <div className="flex flex-col items-start gap-4 flex-1">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-500 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles size={14} /> {storeName}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight dark:text-white max-w-xl">
            {heroHeadline || t('discover')}
          </h1>
          <p className="text-stone-600 dark:text-stone-400 font-medium max-w-lg text-sm sm:text-base">
            {heroSubheadline || t('hero_sub')}
          </p>
        </div>
        {heroImageUrl && (
          <div className="w-full md:w-64 h-48 md:h-64 rounded-3xl overflow-hidden shrink-0">
            <img src={heroImageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {featuredProducts.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black dark:text-white tracking-tight">{t('featured')}</h2>
          <div className="flex gap-5 overflow-x-auto pb-2">
            {featuredProducts.map((product) => (
              <Link key={product.id} to={`/product/${product.id}`} className="shrink-0 w-56 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition group">
                <div className="h-40 bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-sm dark:text-white line-clamp-1">{product.name}</h4>
                  <p className="text-brand-500 font-black text-sm">EGP {product.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {searchQuery && (
        <div className="flex items-center gap-3 -mt-6">
          <p className="text-sm text-stone-500">
            {t('showing_results_for')} <span className="font-bold text-stone-900 dark:text-white">"{searchQuery}"</span>
          </p>
          <Link to="/" className="text-xs font-bold text-brand-500 hover:underline">{t('clear')}</Link>
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`min-w-[150px] sm:min-w-0 p-5 rounded-2xl border text-left transition ${activeCategory === cat ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-brand-500/50'}`}
            >
              <p className="font-black dark:text-white">{cat}</p>
              <p className="text-xs text-stone-500">{products.filter((p) => p.category === cat).length} items</p>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-black dark:text-white tracking-tight">
            {activeCategory ?? t('available_inventory')}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            {activeCategory && (
              <button onClick={() => setActiveCategory(null)} className="px-4 py-2 rounded-full text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                Clear filter
              </button>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 dark:text-white outline-none cursor-pointer"
            >
              <option value="featured">{t('sort_featured')}</option>
              <option value="price-asc">{t('sort_price_asc')}</option>
              <option value="price-desc">{t('sort_price_desc')}</option>
              <option value="rating">{t('sort_rating')}</option>
              <option value="trending">{t('sort_trending')}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-stone-500 text-center py-20 font-bold">Loading live store catalog...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-stone-500 text-center py-20 font-bold">No products match your search query.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {filteredProducts.map((product) => {
              const outOfStock = product.stock !== undefined && product.stock <= 0;
              const lowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;
              const isOnSale = !!(product.sale_price && (!product.sale_ends_at || new Date(product.sale_ends_at) > new Date()));
              const isWishlisted = wishlist.includes(product.id);

              return (
    <>
      <SEO
        title={searchQuery ? 'Search results for "' + searchQuery + '" | ElDukkan' : 'ElDukkan | Shop Online in Egypt'}
        description={searchQuery ? 'Browse ElDukkan products matching "' + searchQuery + '".' : 'Shop products online in Egypt with ElDukkan.'}
        canonical="/"
      />
                <div key={product.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
                  <div className="relative h-44 sm:h-60 overflow-hidden bg-stone-100 dark:bg-stone-800">
                    <Link to={`/product/${product.id}`}>
                      <img src={product.image_url} alt={product.name} className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${outOfStock ? 'grayscale opacity-60' : ''}`} />
                    </Link>
                    <button
                      onClick={() => handleToggleWishlist(product)}
                      className="absolute top-3 right-3 p-2.5 bg-white/90 dark:bg-stone-900/90 backdrop-blur rounded-xl hover:scale-110 transition"
                    >
                      <Heart size={16} className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-stone-500'} />
                    </button>
                    {isOnSale && (
                      <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">Sale</span>
                    )}
                    {outOfStock && (
                      <span className="absolute bottom-3 left-3 bg-stone-900/90 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">{t('out_of_stock')}</span>
                    )}
                    {!outOfStock && lowStock && (
                      <span className="absolute bottom-3 left-3 bg-red-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">{t('only_left', { n: product.stock ?? 0 })}</span>
                    )}
                  </div>
                  <div className="p-3 sm:p-6 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-black text-sm sm:text-lg dark:text-white line-clamp-2">{product.name}</h3>
                      {product.rating !== undefined && (
                        <div className="flex items-center gap-1 text-xs">
                          <Star size={13} className="fill-brand-500 text-brand-500" />
                          <span className="font-bold dark:text-stone-300">{product.rating.toFixed(1)}</span>
                          {product.review_count !== undefined && <span className="text-stone-500">({product.review_count})</span>}
                        </div>
                      )}
                      <p className="text-stone-500 text-xs line-clamp-2">{product.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
                      <span className="text-base sm:text-xl font-black text-brand-500 flex items-center gap-1.5">
                        {isOnSale ? (
                          <>
                            EGP {product.sale_price}
                            <span className="text-xs font-bold text-stone-400 line-through">{product.price}</span>
                          </>
                        ) : (
                          `EGP ${product.price}`
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link to={`/product/${product.id}`} className="p-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition text-stone-700 dark:text-stone-300 font-bold text-xs">
                          {t('details')}
                        </Link>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={outOfStock}
                          className="p-3 bg-brand-500 hover:bg-brand-600 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-md"
                        >
                          <ShoppingBag size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}