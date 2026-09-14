import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { ArrowLeft, ShoppingBag, ShieldCheck, Truck } from 'lucide-react';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useStore();
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await supabase.from('products').select('*').eq('id', id).single();
      if (data) setProduct(data);
    };
    fetchProduct();
  }, [id]);

  if (!product) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-12 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
      
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 transition mb-8 font-semibold w-fit">
        <ArrowLeft size={20} /> Back to Store
      </button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Large Product Image */}
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden aspect-square border border-zinc-200 dark:border-zinc-700">
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
        </div>
        
        {/* Product Info & Actions */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 dark:text-white tracking-tight leading-tight">
            {product.name}
          </h1>
          <p className="text-3xl text-amber-500 font-black mb-6">EGP {product.price}</p>
          
          <div className="w-16 h-1 bg-amber-500 rounded-full mb-6"></div>
          
          <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed text-lg">
            {product.description || "Premium quality product from Eldukkan. Carefully inspected and packaged securely."}
          </p>
          
          <div className="space-y-4 mb-10 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <ShieldCheck className="text-emerald-500" size={22} /> 
              <span>Official Eldukkan Guarantee</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <Truck className="text-amber-500" size={22} /> 
              <span>Fast Delivery & Live Tracking via Admin Panel</span>
            </div>
          </div>

          <button 
            onClick={() => addToCart(product)}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black text-lg rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
          >
            <ShoppingBag size={24} /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}