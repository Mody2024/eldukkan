import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Store, Moon, Sun, ShoppingCart, User, Shield } from 'lucide-react';
import { useStore } from '../store';
// import useSound from 'use-sound'; // Uncomment once you add sounds to public folder
// import switchSound from '/sounds/switch.mp3'; 

export const Layout: React.FC = () => {
  const { theme, toggleTheme, cart, userEmail, isAuthorizedAdmin } = useStore();
  // const [playSwitch] = useSound(switchSound, { volume: 0.5 });

  const handleThemeToggle = () => {
    // playSwitch(); // Play sound effect
    toggleTheme();
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
        
        <Link to="/" className="flex items-center gap-2 cursor-pointer group">
          <Store className="text-amber-500 group-hover:rotate-12 transition-transform" size={28} />
          <span className="text-xl font-black text-amber-500 tracking-wide">Eldukkan</span>
        </Link>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleThemeToggle} 
            className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-zinc-600" />}
          </button>

          {isAuthorizedAdmin && (
            <Link to="/admin" className="px-3 py-2 bg-amber-500/10 border border-amber-500 text-amber-500 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
              <Shield size={14} /> Admin
            </Link>
          )}

          <Link to="/checkout" className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-amber-600 transition shadow-md">
            <ShoppingCart size={16} /> Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
          </Link>
        </div>
      </header>

      <main className="flex-1 mt-6">
        {/* Outlet renders whatever component is matched by the Router (Home, ProductDetails, etc) */}
        <Outlet />
      </main>

      <footer className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500 dark:text-zinc-500">
        <div><span className="font-bold text-amber-500">Eldukkan V3</span> — Integrated Ecosystem</div>
      </footer>
    </div>
  );
};