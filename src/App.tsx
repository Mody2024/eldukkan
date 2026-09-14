import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Product, CartItem } from './types';
import { ShoppingCart, Store, Shield, Search, User, LogOut, Eye } from 'lucide-react';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminPanel } from './components/AdminPanel';
import { ProductDetailModal } from './components/ProductDetailModal';

export function App() {
  const [view, setView] = useState<'store' | 'admin'>('store');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showCheckout, setShowCheckout] = useState(false);
  
  // Auth & Admin Auto-Detection States
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Amazon Product Detail View State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Check URL parameters for custom link access e.g., site.com/?admin=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      setView('admin');
    }
  }, []);

  // Sync Supabase Auth User & Check Admin Eligibility
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
        checkAdminAccess(data.user.email);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || null;
      setUserEmail(email);
      if (email) checkAdminAccess(email);
      else setIsAuthorizedAdmin(false);
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  const checkAdminAccess = async (email: string) => {
    const { data } = await supabase.from('admin_users').select('email').eq('email', email.trim().toLowerCase());
    if (data && data.length > 0) {
      setIsAuthorizedAdmin(true);
    } else {
      setIsAuthorizedAdmin(false);
    }
  };

  useEffect(() => {
    supabase.from('products').select('*').then(({ data }: { data: Product[] | null }) => {
      if (data) setProducts(data);
    });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) alert(error.message);
      else alert('Account created successfully!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) alert(error.message);
    }
    setShowAuthModal(false);
  };

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
            <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500" />
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-detected Quick Admin Button */}
            {isAuthorizedAdmin && (
              <button onClick={() => setView(view === 'store' ? 'admin' : 'store')} className="px-3 py-2 bg-amber-500/10 border border-amber-500 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
                <Shield size={14} /> {view === 'store' ? 'Quick Admin' : 'Back to Shop'}
              </button>
            )}

            {/* Account Sign In/Out */}
            {userEmail ? (
              <button onClick={() => supabase.auth.signOut()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-semibold rounded-xl flex items-center gap-1.5 border border-zinc-700">
                <LogOut size={14} /> Sign Out
              </button>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs text-amber-400 font-semibold rounded-xl flex items-center gap-1.5 border border-zinc-700">
                <User size={14} /> Account
              </button>
            )}

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
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between group">
                  <div className="relative overflow-hidden rounded-xl">
                    <img src={p.image_url} alt={p.name} className="w-full h-48 object-cover group-hover:scale-105 transition duration-300" />
                    <button onClick={() => setSelectedProduct(p)} className="absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white p-2 rounded-lg text-xs flex items-center gap-1 backdrop-blur-md">
                      <Eye size={14} /> View
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-white cursor-pointer hover:text-amber-400" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
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

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full space-y-4 text-white relative">
            <h2 className="text-lg font-bold text-amber-500 text-center">{authMode === 'signin' ? 'Sign In to Eldukkan' : 'Create Account'}</h2>
            <form onSubmit={handleAuth} className="space-y-3">
              <input type="email" placeholder="Email Address" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
              <input type="password" placeholder="Password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
              <button type="submit" className="w-full py-2.5 bg-amber-500 text-black font-bold rounded-lg">{authMode === 'signin' ? 'Sign In' : 'Sign Up'}</button>
            </form>
            <p className="text-xs text-center text-zinc-400 cursor-pointer hover:underline" onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}>
              {authMode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </p>
            <button onClick={() => setShowAuthModal(false)} className="w-full text-xs text-zinc-500 hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      {/* Product Detail Amazon View */}
      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} userEmail={userEmail || undefined} onClose={() => setSelectedProduct(null)} onAddToCart={addToCart} />
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal cart={cart} total={total} onClose={() => setShowCheckout(false)} onClearCart={() => setCart([])} />
      )}

      <footer className="max-w-7xl mx-auto w-full mt-12 pt-6 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
        <div><span className="font-bold text-amber-500">Eldukkan Enterprise</span> — Global Shopping Platform</div>
      </footer>
    </div>
  );
}

export default App;