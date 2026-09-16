import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { Product } from '../types';
import { ShoppingBag, ArrowLeft, ShieldCheck, Star, Heart, Minus, Plus, Store } from 'lucide-react';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const { addToCart, showToast, userId, wishlist, toggleWishlistId } = useStore();

  useEffect(() => {
    fetchProduct();
    setActiveImage(0);
    setQuantity(1);
    window.scrollTo(0, 0);
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      setProduct(data);

      if (data?.category) {
        const { data: relatedData } = await supabase
          .from('products')
          .select('*')
          .eq('category', data.category)
          .neq('id', data.id)
          .limit(4);
        setRelated(relatedData ?? []);
      } else {
        setRelated([]);
      }
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const outOfStock = product?.stock !== undefined && product.stock <= 0;
  const isWishlisted = product ? wishlist.includes(product.id) : false;
  const gallery = product ? [product.image_url, ...(product.images ?? [])].filter(Boolean) : [];

  const handleAddToCart = () => {
    if (!product || outOfStock) return;
    for (let i = 0; i < quantity; i++) addToCart(product);
    showToast(`Added ${quantity}x ${product.name} to cart`);
  };

  const handleToggleWishlist = async () => {
    if (!product) return;
    if (!userId) {
      showToast('Sign in to save items to your wishlist.');
      return;
    }
    const wasSaved = isWishlisted;
    toggleWishlistId(product.id);
    if (wasSaved) {
      await supabase.from('wishlists').delete().eq('customer_id', userId).eq('product_id', product.id);
    } else {
      await supabase.from('wishlists').insert([{ customer_id: userId, product_id: product.id }]);
    }
  };

  if (loading) {
    return <p className="text-center py-20 font-bold text-zinc-500">Loading product details...</p>;
  }

  if (!product) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-2xl font-black dark:text-white">Product not found</h2>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl">Back to Store</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-300">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:scale-105 transition dark:text-white w-fit font-bold text-sm">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-sm">
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 h-80 md:h-[400px] relative">
            <img src={gallery[activeImage]} alt={product.name} className={`w-full h-full object-cover ${outOfStock ? 'grayscale opacity-60' : ''}`} />
            {outOfStock && (
              <span className="absolute top-4 left-4 bg-zinc-900/90 text-white text-xs font-black uppercase px-3 py-1.5 rounded-lg">Out of Stock</span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition ${activeImage === idx ? 'border-amber-500' : 'border-transparent opacity-70'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-black dark:text-white tracking-tight">{product.name}</h1>
              <button onClick={handleToggleWishlist} className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl shrink-0 hover:scale-105 transition">
                <Heart size={20} className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-zinc-500'} />
              </button>
            </div>

            {product.rating !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={16} className={star <= Math.round(product.rating ?? 0) ? 'fill-amber-500 text-amber-500' : 'text-zinc-300 dark:text-zinc-700'} />
                  ))}
                </div>
                <span className="font-bold dark:text-zinc-300">{product.rating.toFixed(1)}</span>
                {product.review_count !== undefined && <span className="text-zinc-500">({product.review_count} reviews)</span>}
              </div>
            )}

            {product.vendor_name && (
              <p className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
                <Store size={14} /> Sold by {product.vendor_name}
              </p>
            )}

            <p className="text-2xl font-black text-amber-500">EGP {product.price}</p>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{product.description}</p>

            {product.stock !== undefined && (
              <p className={`text-xs font-bold ${outOfStock ? 'text-red-500' : product.stock <= 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                {outOfStock ? 'Currently out of stock' : product.stock <= 5 ? `Only ${product.stock} left in stock` : 'In stock'}
              </p>
            )}
          </div>

          <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
              <ShieldCheck size={16} /> Verified Supabase Catalog Item
            </div>

            {!outOfStock && (
              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1.5 w-fit">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2.5 rounded-lg hover:bg-white dark:hover:bg-zinc-700 transition dark:text-white">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold dark:text-white">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-2.5 rounded-lg hover:bg-white dark:hover:bg-zinc-700 transition dark:text-white">
                  <Plus size={14} />
                </button>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-black text-lg rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <ShoppingBag size={20} /> {outOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black dark:text-white tracking-tight">You Might Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {related.map((item) => (
              <Link key={item.id} to={`/product/${item.id}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition group">
                <div className="h-32 sm:h-40 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-sm dark:text-white line-clamp-1">{item.name}</h4>
                  <p className="text-amber-500 font-black text-sm">EGP {item.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}