import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { Product, Review } from '../types';
import { ShoppingBag, ArrowLeft, Star, Heart, Minus, Plus, Store, MessageSquare, ArrowUp, ArrowDown, Truck, ShieldCheck } from 'lucide-react';
import SEO from '../components/SEO';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const { addToCart, showToast, userId, wishlist, toggleWishlistId } = useStore();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligibleOrderId, setEligibleOrderId] = useState<string | null>(null);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myVote, setMyVote] = useState<1 | -1 | null>(null);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    checkReviewEligibility();
    fetchMyVote();
    setActiveImage(0);
    setQuantity(1);
    window.scrollTo(0, 0);
  }, [id, userId]);

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

  const fetchReviews = async () => {
    if (!id) return;
    const { data } = await supabase.from('reviews').select('*').eq('product_id', id).order('created_at', { ascending: false });
    setReviews(data ?? []);
  };

  // A customer can review this product only if they have a delivered order
  // containing it, and haven't already reviewed it — mirrors the RLS
  // policy exactly, so this is a UX convenience, not the real gate (the DB
  // enforces it regardless of what this check finds).
  const checkReviewEligibility = async () => {
    setEligibleOrderId(null);
    if (!userId || !id) return;

    const { data: existingReview } = await supabase.from('reviews').select('id').eq('customer_id', userId).eq('product_id', id).maybeSingle();
    if (existingReview) return;

    const { data: deliveredOrders } = await supabase
      .from('orders')
      .select('id, items')
      .eq('customer_id', userId)
      .eq('status', 'delivered');

    const match = (deliveredOrders ?? []).find((o) => (o.items ?? []).some((item: { id: string }) => item.id === id));
    if (match) setEligibleOrderId(match.id);
  };

  const handleSubmitReview = async () => {
    if (!eligibleOrderId || !id || !userId) return;
    setSubmittingReview(true);
    const { error } = await supabase.from('reviews').insert([{
      product_id: id,
      customer_id: userId,
      order_id: eligibleOrderId,
      rating: newRating,
      comment: newComment.trim() || null,
    }]);
    setSubmittingReview(false);
    if (error) {
      showToast(`Could not submit review: ${error.message}`);
      return;
    }
    setNewComment('');
    setEligibleOrderId(null);
    showToast('Thanks for your review!');
    fetchReviews();
    fetchProduct(); // pick up the recalculated rating/review_count
  };

  const fetchMyVote = async () => {
    setMyVote(null);
    if (!userId || !id) return;
    const { data } = await supabase.from('product_votes').select('vote').eq('product_id', id).eq('customer_id', userId).maybeSingle();
    if (data) setMyVote(data.vote as 1 | -1);
  };

  const handleVote = async (vote: 1 | -1) => {
    if (!id) return;
    if (!userId) {
      showToast('Sign in to vote on products.');
      return;
    }
    if (myVote === vote) {
      // Clicking the same vote again removes it.
      await supabase.from('product_votes').delete().eq('product_id', id).eq('customer_id', userId);
      setMyVote(null);
    } else {
      await supabase.from('product_votes').upsert([{ product_id: id, customer_id: userId, vote }]);
      setMyVote(vote);
    }
    fetchProduct(); // pick up the recalculated vote_score
  };

  const outOfStock = product?.stock !== undefined && product.stock <= 0;
  const isOnSale = !!(product?.sale_price && (!product.sale_ends_at || new Date(product.sale_ends_at) > new Date()));
  const isWishlisted = product ? wishlist.includes(product.id) : false;
  const gallery = product ? [product.image_url, ...(product.images ?? [])].filter(Boolean) : [];

  const handleAddToCart = () => {
    if (!product || outOfStock) return;
    const effectiveProduct = isOnSale ? { ...product, price: product.sale_price! } : product;
    for (let i = 0; i < quantity; i++) addToCart(effectiveProduct);
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
    return <p className="text-center py-20 font-bold text-stone-500">Loading product details...</p>;
  }

  if (!product) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-2xl font-black dark:text-white">Product not found</h2>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl">Back to Store</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-300">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 p-3 bg-stone-100 dark:bg-stone-800 rounded-xl hover:scale-105 transition dark:text-white w-fit font-bold text-sm">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 rounded-3xl shadow-sm">
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 h-[340px] sm:h-[400px] md:h-[500px] relative">
            <img src={gallery[activeImage]} alt={product.name} className={`w-full h-full object-cover ${outOfStock ? 'grayscale opacity-60' : ''}`} />
            {outOfStock && (
              <span className="absolute top-4 left-4 bg-stone-900/90 text-white text-xs font-black uppercase px-3 py-1.5 rounded-lg">Out of Stock</span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition ${activeImage === idx ? 'border-brand-500' : 'border-transparent opacity-70'}`}
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
              <button onClick={handleToggleWishlist} className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl shrink-0 hover:scale-105 transition">
                <Heart size={20} className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-stone-500'} />
              </button>
            </div>

            {product.rating !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={16} className={star <= Math.round(product.rating ?? 0) ? 'fill-brand-500 text-brand-500' : 'text-stone-300 dark:text-stone-700'} />
                  ))}
                </div>
                <span className="font-bold dark:text-stone-300">{product.rating.toFixed(1)}</span>
                {product.review_count !== undefined && <span className="text-stone-500">({product.review_count} reviews)</span>}
              </div>
            )}

            {product.vendor_name && (
              <p className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
                <Store size={14} /> Sold by {product.vendor_name}
              </p>
            )}

            <p className="text-2xl font-black text-brand-500 flex items-center gap-2">
              {isOnSale ? (
                <>
                  EGP {product.sale_price}
                  <span className="text-base font-bold text-stone-400 line-through">EGP {product.price}</span>
                  <span className="text-xs font-black uppercase bg-red-500 text-white px-2 py-0.5 rounded-lg">Sale</span>
                </>
              ) : (
                `EGP ${product.price}`
              )}
            </p>
            <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">{product.description}</p>

            {product.stock !== undefined && (
              <p className={`text-xs font-bold ${outOfStock ? 'text-red-500' : product.stock <= 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                {outOfStock ? 'Currently out of stock' : product.stock <= 5 ? `Only ${product.stock} left in stock` : 'In stock'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 border-y border-stone-100 dark:border-stone-800">
            <div className="flex flex-col items-center text-center gap-1 text-[10px] sm:text-xs font-bold text-stone-500"><Truck size={18} className="text-brand-500" /> Delivery</div>
            <div className="flex flex-col items-center text-center gap-1 text-[10px] sm:text-xs font-bold text-stone-500"><ShieldCheck size={18} className="text-brand-500" /> Secure checkout</div>
            <div className="flex flex-col items-center text-center gap-1 text-[10px] sm:text-xs font-bold text-stone-500"><Store size={18} className="text-brand-500" /> Trusted shop</div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleVote(1)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm transition ${myVote === 1 ? 'bg-emerald-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-emerald-500/10 hover:text-emerald-500'}`}
              >
                <ArrowUp size={16} /> Helpful
              </button>
              <button
                onClick={() => handleVote(-1)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm transition ${myVote === -1 ? 'bg-red-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-red-500/10 hover:text-red-500'}`}
              >
                <ArrowDown size={16} /> Not helpful
              </button>
            </div>

            {!outOfStock && (
              <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 rounded-xl p-1.5 w-fit">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 transition dark:text-white">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold dark:text-white">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-2.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 transition dark:text-white">
                  <Plus size={14} />
                </button>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-not-allowed text-white font-black text-lg rounded-xl transition shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
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
              <Link key={item.id} to={`/product/${item.id}`} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition group">
                <div className="h-32 sm:h-40 bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-sm dark:text-white line-clamp-1">{item.name}</h4>
                  <p className="text-brand-500 font-black text-sm">EGP {item.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-2xl font-black dark:text-white tracking-tight flex items-center gap-2">
          <MessageSquare size={22} className="text-brand-500" /> Reviews {reviews.length > 0 && `(${reviews.length})`}
        </h2>

        {eligibleOrderId && (
          <div className="bg-white dark:bg-stone-900 border border-brand-500/30 rounded-2xl p-6 space-y-3">
            <p className="font-bold text-sm dark:text-white">You bought this — leave a review</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setNewRating(star)}>
                  <Star size={22} className={star <= newRating ? 'fill-brand-500 text-brand-500' : 'text-stone-300 dark:text-stone-700'} />
                </button>
              ))}
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts (optional)"
              className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none text-sm dark:text-white min-h-[70px]"
            />
            <button
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl transition disabled:opacity-50"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="text-stone-500 text-sm">No reviews yet — be the first to buy and share your thoughts.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={14} className={star <= review.rating ? 'fill-brand-500 text-brand-500' : 'text-stone-300 dark:text-stone-700'} />
                  ))}
                  <span className="text-xs text-stone-400 ml-2">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                {review.comment && <p className="text-sm text-stone-600 dark:text-stone-400">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}