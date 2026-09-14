import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShoppingBag, Search, Sparkles } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      if (data) setProducts(data);
    } catch {
      setProducts([
        { id: '1', name: 'Eldukkan Custom Hoodie', price: 650, image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80', description: 'Premium heavyweight cotton streetwear hoodie.' },
        { id: '2', name: 'Cyberpunk Desk Mat', price: 350, image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', description: 'Anti-slip waterproof gaming mat with RGB aesthetic.' },
        { id: '3', name: 'Minimalist Mechanical Keyboard', price: 1450, image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', description: 'Hot-swappable wireless mechanical keyboard.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: any) => {
    try {
      const cart = JSON.parse(localStorage.getItem('eldukkan_cart') || '[]');
      const existing = cart.find((item: any) => item.id === product.id);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        cart.push({ ...product, quantity: 1 });
      }
      localStorage.setItem('eldukkan_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));
      alert(`Added ${product.name} to cart!`);
    } catch {
      alert('Could not add to cart.');
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent border border-amber-500/20 p-8 sm:p-12 flex flex-col items-start justify-center gap-4">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
          <Sparkles size={14} /> Eldukkan V3 Storefront
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight dark:text-white max-w-xl">
          Discover Premium Streetwear & Tech Gear
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-medium max-w-lg text-sm sm:text-base">
          Built with Supabase realtime synchronization. Explore our latest curated collections below.
        </p>

        <div className="w-full max-w-md mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 dark:text-white shadow-sm"
          />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-black dark:text-white tracking-tight">Available Inventory</h2>
        
        {loading ? (
          <p className="text-zinc-500 text-center py-20 font-bold">Loading live store catalog...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-zinc-500 text-center py-20 font-bold">No products match your search query.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
                <div className="relative h-60 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-black text-lg dark:text-white">{product.name}</h3>
                    <p className="text-zinc-500 text-xs line-clamp-2">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-xl font-black text-amber-500">EGP {product.price}</span>
                    <div className="flex items-center gap-2">
                      <Link to={`/product/${product.id}`} className="p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                        Details
                      </Link>
                      <button onClick={() => addToCart(product)} className="p-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition shadow-md">
                        <ShoppingBag size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}