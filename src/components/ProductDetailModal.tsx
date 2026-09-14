import React, { useState, useEffect } from 'react';
import { Star, X, ShoppingCart, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product, Review } from '../types';

interface Props {
  product: Product;
  userEmail?: string;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
}

export const ProductDetailModal: React.FC<Props> = ({ product, userEmail, onClose, onAddToCart }) => {
  const allImages = [product.image_url, ...(product.images || [])].filter(Boolean);
  const [selectedImg, setSelectedImg] = useState(allImages[0] || product.image_url);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    const { data } = await supabase.from('reviews').select('*').eq('product_id', product.id).order('created_at', { ascending: false });
    if (data) setReviews(data);
  };

  useEffect(() => {
    fetchReviews();
  }, [product.id]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return alert('Please sign in to write a review.');
    setSubmitting(true);

    const { error } = await supabase.from('reviews').insert([
      { product_id: product.id, user_email: userEmail, rating: newRating, comment: newComment }
    ]);

    if (!error) {
      setNewComment('');
      fetchReviews();
      
      // Update average rating on product
      const updatedCount = reviews.length + 1;
      const avgRating = Number(((reviews.reduce((acc, r) => acc + r.rating, 0) + newRating) / updatedCount).toFixed(1));
      await supabase.from('products').update({ rating: avgRating, review_count: updatedCount }).eq('id', product.id);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full p-6 text-white relative max-h-[90vh] overflow-y-auto my-8">
        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2">
          <X size={24} />
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Gallery */}
          <div className="space-y-4">
            <img src={selectedImg} alt={product.name} className="w-full h-80 object-cover rounded-2xl border border-zinc-800" />
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    onClick={() => setSelectedImg(img)}
                    className={`w-16 h-16 object-cover rounded-xl border-2 cursor-pointer ${selectedImg === img ? 'border-amber-500' : 'border-zinc-800 opacity-60'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Specs */}
          <div className="space-y-4 flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-full">{product.category}</span>
              <h1 className="text-2xl font-bold mt-2">{product.name}</h1>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-zinc-300">{product.rating} / 5</span>
                <span className="text-xs text-zinc-500">({reviews.length} reviews)</span>
              </div>

              <div className="text-3xl font-black text-amber-400 mt-4">${product.price}</div>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{product.description}</p>

              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <CheckCircle size={16} /> In Stock ({product.stock} units) • Ready for Express Delivery
              </div>
            </div>

            <button onClick={() => { onAddToCart(product); onClose(); }} className="w-full py-3.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-600 transition flex items-center justify-center gap-2">
              <ShoppingCart size={18} /> Add to Cart
            </button>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="mt-10 border-t border-zinc-800 pt-6">
          <h2 className="text-lg font-bold mb-4">Customer Reviews & Ratings</h2>

          {userEmail ? (
            <form onSubmit={handleAddReview} className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50 mb-6 space-y-3">
              <p className="text-xs text-zinc-400 font-semibold">Leave a Review as <span className="text-amber-400">{userEmail}</span></p>
              <div className="flex gap-2 items-center">
                <label className="text-xs text-zinc-300">Rating:</label>
                <select value={newRating} onChange={(e) => setNewRating(Number(e.target.value))} className="bg-zinc-900 border border-zinc-700 rounded-lg p-1 text-xs text-amber-400 font-bold">
                  {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Stars</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Write your honest review..." required value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white" />
                <button type="submit" disabled={submitting} className="bg-amber-500 text-black font-bold px-4 rounded-xl text-xs flex items-center gap-1">
                  <Send size={14} /> Post
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-zinc-500 italic mb-6">Sign in to leave a product review.</p>
          )}

          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {reviews.map((r) => (
              <div key={r.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-300">{r.user_email}</span>
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} fill={i < r.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                </div>
                <p className="text-zinc-400">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};