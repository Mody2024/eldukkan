import { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Sun, Moon, Menu, X } from 'lucide-react';
import AICopilot from './AICopilot';
import { useStore } from '../store';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, cart, toast, userId } = useStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Theme is applied here as the single place that touches the DOM class,
  // driven entirely by the shared store (no parallel local dark-mode state).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
                E
              </div>
              <span className="text-xl font-black tracking-tight dark:text-white">
                Eldukkan <span className="text-amber-500">V3</span>
              </span>
            </Link>

            {/* No "Admin" link lives in this nav on purpose — the admin
               dashboard is reached only by a private, unguessable URL and
               is further gated behind Supabase auth + RLS. */}
            <nav className="hidden md:flex items-center gap-6 font-bold text-sm text-zinc-600 dark:text-zinc-400">
              <Link to="/" className="hover:text-amber-500 transition">Storefront</Link>
              <Link to="/tracking" className="hover:text-amber-500 transition">Order Tracking</Link>
              <Link to={userId ? '/account' : '/login'} className="hover:text-amber-500 transition">
                {userId ? 'My Account' : 'Sign In'}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:scale-105 transition"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              to="/cart"
              className="relative p-3 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black transition flex items-center gap-2 font-bold text-sm"
            >
              <ShoppingBag size={18} />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 dark:bg-amber-500 text-black font-black text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-md">
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

        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 space-y-3 animate-in slide-in-from-top duration-200">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">Storefront</Link>
            <Link to="/tracking" onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">Order Tracking</Link>
            <Link to={userId ? '/account' : '/login'} onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800">
              {userId ? 'My Account' : 'Sign In'}
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500 font-medium">
          <p>&copy; {new Date().getFullYear()} Eldukkan V3. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
              <ShieldCheck size={16} /> Secure Supabase Checkout
            </span>
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