import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Eye } from 'lucide-react';
import { useStore } from '../store';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const { addToCart } = useStore();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*');
      if (data) setProducts(data);
    };
    fetchProducts();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {products.map(product => (
        <div key={product.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col hover:shadow-xl dark:hover:shadow-black/50 transition-all group">
          <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-4 overflow-hidden relative">
            <img src={product.image_url} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
              <Link to={`/product/${product.id}`} className="bg-white text-black p-3 rounded-full hover:bg-amber-400 hover:scale-110 transition-all shadow-lg">
                <Eye size={20} />
              </Link>
              <button 
                onClick={(e) => { e.preventDefault(); addToCart(product); }} 
                className="bg-amber-500 text-black p-3 rounded-full hover:bg-amber-400 hover:scale-110 transition-all shadow-lg"
              >
                <ShoppingCart size={20} />
              </button>
            </div>
          </div>
          
          <h3 className="font-bold text-lg dark:text-zinc-100 tracking-tight">{product.name}</h3>
          <p className="text-amber-500 font-black mt-auto text-xl">EGP {product.price}</p>
        </div>
      ))}
    </div>
  );
}