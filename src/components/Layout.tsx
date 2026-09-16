import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Sun, Moon, Menu, X, Megaphone, Wrench, Heart, User, Search, Truck, Headset } from 'lucide-react';
import AICopilot from './AICopilot';
import { useStore } from '../store';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const navigate = useNavigate();
  const {
    theme, toggleTheme, cart, toast, userId, announcementBanner, maintenanceMode,
    isAuthorizedAdmin, storeName, logoUrl, wishlist,
  } = useStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Theme is applied here as the single place that touches the DOM class,
  // driven entirely by the shared store (no parallel local dark-mode state).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Maintenance mode blocks the storefront for everyone except a confirmed
  // signed-in admin.
  const showMaintenance = maintenanceMode && !isAuthorizedAdmin;

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(headerSearch.trim() ? `/?q=${encodeURIComponent(headerSearch.trim())}` : '/');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-300">
      {/* Utility bar — the small strip real storefronts use for trust signals */}
      <div className="hidden sm:block bg-zinc-900 dark:bg-black text-zinc-300 text-xs font-bold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Truck size={13} /> Fast delivery across Egypt</span>
          <span className="flex items-center gap-1.5"><Headset size={13} /> Need help? Ask the assistant below</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center gap-4 sm:gap-8">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="w-10 h-10 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition" />
            ) : (
              <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xl font-black tracking-tight dark:text-white hidden sm:inline">
              {storeName}
            </span>
          </Link>

          {/* Full-width search — the centerpiece of a real storefront header */}
          <form onSubmit={handleHeaderSearch} className="flex-1 max-w-2xl hidden md:flex">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder={`Search ${storeName}...`}
                className="w-full pl-11 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-amber-500 focus:bg-white dark:focus:bg-zinc-900 rounded-full font-semibold text-sm outline-none dark:text-white transition"
              />
            </div>
          </form>

          {/* No "Admin" link lives in this nav on purpose — the admin
             dashboard is reached only by a private, unguessable URL and
             is further gated behind Supabase auth + RLS. */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:scale-105 transition"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              to="/wishlist"
              className="relative hidden sm:flex p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-red-500 transition"
              title="Wishlist"
            >
              <Heart size={18} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <Link
              to={userId ? '/account' : '/login'}
              className="hidden sm:flex p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition"
              title={userId ? 'My Account' : 'Sign In'}
            >
              <User size={18} />
            </Link>

            <Link
              to="/cart"
              className="relative p-3 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black transition flex items-center gap-2 font-bold text-sm"
            >
              <ShoppingBag size={18} />
              <span className="hidden lg:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black font-black text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Secondary nav strip */}
        <div className="hidden md:block border-t border-zinc-100 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-6 font-bold text-sm text-zinc-600 dark:text-zinc-400">
            <Link to="/" className="hover:text-amber-500 transition">All Products</Link>
            <Link to="/tracking" className="hover:text-amber-500 transition">Track Order</Link>
            <Link to="/wishlist" className="hover:text-amber-500 transition">Wishlist</Link>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 space-y-3 animate-in slide-in-from-top duration-200">
            <form onSubmit={handleHeaderSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder={`Search ${storeName}...`}
                className="w-full pl-11 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-full font-semibold text-sm outline-none dark:text-white"
              />
            </form>
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">All Products</Link>
            <Link to="/tracking" onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">Track Order</Link>
            <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">Wishlist</Link>
            <Link to={userId ? '/account' : '/login'} onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">
              {userId ? 'My Account' : 'Sign In'}
            </Link>
          </div>
        )}
      </header>

      {announcementBanner && (
        <div className="bg-amber-500 text-black px-4 py-2.5 text-center text-sm font-bold flex items-center justify-center gap-2">
          <Megaphone size={16} /> {announcementBanner}
        </div>
      )}

      <main className="flex-1 w-full">
        {showMaintenance ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4 max-w-7xl mx-auto px-4">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center">
              <Wrench size={28} />
            </div>
            <h1 className="text-2xl font-black dark:text-white">We'll be right back</h1>
            <p className="text-zinc-500 max-w-sm">{storeName} is undergoing scheduled maintenance. Please check back shortly.</p>
          </div>
        ) : (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        )}
      </main>

      <footer className="bg-zinc-900 dark:bg-black text-zinc-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <span className="text-lg font-black text-white">{storeName}</span>
            <p className="text-xs leading-relaxed">Your everyday storefront for streetwear, tech, and more — built for fast, reliable delivery.</p>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
              <ShieldCheck size={14} /> Secure Checkout
            </span>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-white text-sm uppercase tracking-wide">Shop</h4>
            <Link to="/" className="block text-xs hover:text-amber-400 transition">All Products</Link>
            <Link to="/cart" className="block text-xs hover:text-amber-400 transition">Your Cart</Link>
            <Link to="/wishlist" className="block text-xs hover:text-amber-400 transition">Wishlist</Link>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-white text-sm uppercase tracking-wide">Support</h4>
            <Link to="/tracking" className="block text-xs hover:text-amber-400 transition">Track an Order</Link>
            <Link to="/login" className="block text-xs hover:text-amber-400 transition">Sign In</Link>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-white text-sm uppercase tracking-wide">Payments</h4>
            <p className="text-xs">Cash on Delivery, Card, Vodafone Cash, InstaPay, Fawry</p>
          </div>
        </div>
        <div className="border-t border-zinc-800 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <p>&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</p>
            <p>
              Built by <span className="font-bold text-zinc-300">AlyEldeen Alaa</span> &amp; <span className="font-bold text-zinc-300">Almuddaththir Mahmoud</span>
            </p>
          </div>
        </div>
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm px-5 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}

      <AICopilot />
    </div>
  );
}