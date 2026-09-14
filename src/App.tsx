import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Product, CartItem } from './types';
import { ShoppingCart, Store, Shield, Search } from 'lucide-react';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminPanel } from './components/AdminPanel';

export function App() {
  const [view, setView] = useState<'store' | 'admin'>('store');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    supabase.from('products').select('*').then(({ data }) => {
      if (data) setProducts(data);
    });
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('store')}>
            <Store className="text-amber-500" size={28} />
            <span className="text-xl font-black text-amber-500 tracking-wide">Eldukkan</span>
          </div>

          <div className="flex-1 max-w-md mx-4 relative">
            <Search className="absolute left-3 top-2.5 text-zinc-500" size={18} />
            <input type="text" placeholder="Search Eldukkan products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500" />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setView(view === 'store' ? 'admin' : 'store')} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-zinc-700">
              <Shield size={14} className="text-amber-400" /> {view === 'store' ? 'Admin Portal' : 'Customer Shop'}
            </button>
            <button onClick={() => cart.length > 0 && setShowCheckout(true)} className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl flex items-center gap-2">
              <ShoppingCart size={16} /> Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
            </button>
          </div>
        </header>

        {view === 'admin' ? (
          <AdminPanel />
        ) : (
          <main className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['All', 'Electronics', 'Fashion', 'Grocery', 'Tech'].map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border ${category === cat ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((p) => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <img src={p.image_url} alt={p.name} className="w-full h-44 object-cover rounded-xl" />
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-white">{p.name}</h3>
                      <span className="text-xs bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded">${p.price}</span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{p.description}</p>
                  </div>
                  <button onClick={() => addToCart(p)} className="w-full py-2 bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-400 font-semibold rounded-xl text-xs transition">
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </main>
        )}
      </div>

      {showCheckout && (
        <CheckoutModal cart={cart} total={total} onClose={() => setShowCheckout(false)} onClearCart={() => setCart([])} />
      )}

      <footer className="max-w-7xl mx-auto w-full mt-12 pt-6 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
        <div>
          <span className="font-bold text-amber-500">Eldukkan Marketplace Platform</span> — Egyptian & Global eCommerce
        </div>
        <div>
          Designed & Developed by <span className="text-amber-400 font-semibold">AlyEldeen Alaa</span> & <span className="text-amber-400 font-semibold">Almuddaththir Mahmoud</span>
        </div>
      </footer>
    </div>
  );
}