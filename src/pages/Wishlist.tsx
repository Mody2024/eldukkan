import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { Product } from '../types';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';

export default function Wishlist() {
  const { userId, wishlist, setWishlist, addToCart, showToast } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadWishlist();
  }, [userId]);

  const loadWishlist = async () => {
    setLoading(true);
    const { data: rows } = await supabase.from('wishlists').select('product_id').eq('customer_id', userId);
    const ids = (rows ?? []).map((r) => r.product_id as string);
    setWishlist(ids);
    if (ids.length > 0) {
      const { data: prods } = await supabase.from('products').select('*').in('id', ids);
      setProducts(prods ?? []);
    } else {
      setProducts([]);
    }
    setLoading(false);
  };

  const handleRemove = async (productId: string) => {
    await supabase.from('wishlists').delete().eq('customer_id', userId).eq('product_id', productId);
    setWishlist(wishlist.filter((id) => id !== productId));
    setProducts(products.filter((p) => p.id !== productId));
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    showToast(`Added ${product.name} to cart`);
  };

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      <h1 className="text-3xl font-black dark:text-white tracking-tight flex items-center gap-3">
        <Heart className="text-red-500" /> My Wishlist
      </h1>

      {loading ? (
        <p className="text-stone-500 text-center py-20 font-bold">Loading your wishlist...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-20 space-y-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl">
          <Heart className="mx-auto text-stone-400" size={32} />
          <p className="text-stone-500 text-sm">Nothing saved yet.</p>
          <Link to="/" className="inline-block px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-sm rounded-xl transition">
            Browse Storefront
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-sm flex flex-col">
              <Link to={`/product/${product.id}`} className="h-36 sm:h-48 bg-stone-100 dark:bg-stone-800 block">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              </Link>
              <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="font-black text-sm sm:text-base dark:text-white line-clamp-2">{product.name}</h3>
                  <p className="text-brand-500 font-black">EGP {product.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAddToCart(product)} className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2">
                    <ShoppingBag size={16} /> Add to Cart
                  </button>
                  <button onClick={() => handleRemove(product.id)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}