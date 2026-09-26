import { lazy, Suspense, useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Sun, Moon, Menu, X, Megaphone, Wrench, Heart, User, Search, Truck, Headset, Languages } from 'lucide-react';
const AICopilot = lazy(() => import('./AICopilot'));
import ShopIntro from './ShopIntro';
import { useStore } from '../store';
import ExperiencePicker from './ExperiencePicker';
import MobileBottomNav from './MobileBottomNav';
import { useTranslation } from '../lib/i18n';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const navigate = useNavigate();
  const {
    theme, toggleTheme, cart, toast, userId, announcementBanner, maintenanceMode,
    isAuthorizedAdmin, storeName, logoUrl, wishlist, footerCreditsEnabled, footerCreditsText, sponsors,
    language, setLanguage, experience,
  } = useStore();
  const { t } = useTranslation();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.experience = experience;
  }, [experience]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Keep the browser tab/app icon synchronized with the logo configured in
  // Admin > Settings. /favicon is a stable URL so Google can use the same
  // site icon while the actual destination can follow the current branding.
  useEffect(() => {
    const iconHref = logoUrl || '/favicon';
    const icon = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (icon) icon.href = iconHref;
    const appleIcon = document.head.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (appleIcon) appleIcon.href = iconHref;
  }, [logoUrl]);

  // Maintenance mode blocks the storefront for everyone except a confirmed
  // signed-in admin.
  const showMaintenance = maintenanceMode && !isAuthorizedAdmin;

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(headerSearch.trim() ? `/?q=${encodeURIComponent(headerSearch.trim())}` : '/');
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  };

  return (
    <div data-experience={experience} className="storefront-shell min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-300">
      <a href="#store-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-stone-900 focus:px-4 focus:py-3 focus:text-sm focus:font-black focus:text-white">
        Skip to store content
      </a>
      <ShopIntro />
      {/* Utility bar — the small strip real storefronts use for trust signals */}
      <div className="hidden sm:block bg-stone-900 dark:bg-black text-stone-300 text-xs font-bold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Truck size={13} /> {t('fast_delivery')}</span>
          <span className="flex items-center gap-1.5"><Headset size={13} /> {t('need_help')}</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/98 dark:bg-stone-900/98 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center gap-2 sm:gap-5">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} width="40" height="40" loading="eager" fetchPriority="high" decoding="async" className="w-10 h-10 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition" />
            ) : (
              <div className="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-brand-500/20 group-hover:scale-105 transition">
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder={t('search_placeholder')}
                className="w-full pl-11 pr-4 py-3.5 bg-stone-100 dark:bg-stone-800 border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-stone-900 rounded-full font-semibold text-sm outline-none dark:text-white transition"
              />
            </div>
          </form>

          {/* No "Admin" link lives in this nav on purpose — the admin
             dashboard is reached only by a private, unguessable URL and
             is further gated behind Supabase auth + RLS. */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:scale-105 transition flex items-center gap-1.5 font-bold text-xs"
              title="Language / اللغة"
              aria-label="Language / اللغة"
            >
              <Languages size={16} /> {language === 'en' ? 'AR' : 'EN'}
            </button>

            <ExperiencePicker />

            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:scale-105 transition"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              to="/wishlist"
              className="relative hidden sm:flex p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-red-500 transition"
              title={t('wishlist')}
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
              className="hidden sm:flex p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-brand-500 transition"
              title={userId ? t('my_account') : t('sign_in')}
            >
              <User size={18} />
            </Link>

            <Link
              to="/cart"
              className="relative p-3 rounded-xl bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white transition flex items-center gap-2 font-bold text-sm"
            >
              <ShoppingBag size={18} />
              <span className="hidden lg:inline">{t('cart')}</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white font-black text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Secondary nav strip */}
        <div className="hidden md:block border-t border-stone-100 dark:border-stone-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-6 font-bold text-sm text-stone-600 dark:text-stone-400">
            <Link to="/" className="hover:text-brand-500 transition">Home</Link>
            <Link to="/" className="hover:text-brand-500 transition">Shop</Link>
            <Link to="/tracking" className="hover:text-brand-500 transition">Track order</Link>
            <Link to="/wishlist" className="hover:text-brand-500 transition">Wishlist</Link>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 p-4 space-y-3 animate-in slide-in-from-top duration-200">
            <form onSubmit={handleHeaderSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder={t('search_placeholder')}
                className="w-full pl-11 pr-4 py-3 bg-stone-100 dark:bg-stone-800 rounded-full font-semibold text-sm outline-none dark:text-white"
              />
            </form>
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-stone-100 dark:hover:bg-stone-800">{t('all_products')}</Link>
            <Link to="/tracking" onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-stone-100 dark:hover:bg-stone-800">{t('track_order')}</Link>
            <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-stone-100 dark:hover:bg-stone-800">{t('wishlist')}</Link>
            <Link to={userId ? '/account' : '/login'} onClick={() => setMobileMenuOpen(false)} className="block p-3 rounded-xl font-bold hover:bg-stone-100 dark:hover:bg-stone-800">
              {userId ? t('my_account') : t('sign_in')}
            </Link>
          </div>
        )}
      </header>

      {announcementBanner && (
        <div className="bg-brand-500 text-white px-4 py-2.5 text-center text-sm font-bold flex items-center justify-center gap-2">
          <Megaphone size={16} /> {announcementBanner}
        </div>
      )}

      <main id="store-content" className="flex-1 w-full">
        {showMaintenance ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4 max-w-7xl mx-auto px-4">
            <div className="w-16 h-16 bg-brand-500/10 text-brand-500 rounded-3xl flex items-center justify-center">
              <Wrench size={28} />
            </div>
            <h1 className="text-2xl font-black dark:text-white">We'll be right back</h1>
            <p className="text-stone-500 max-w-sm">{storeName} is undergoing scheduled maintenance. Please check back shortly.</p>
          </div>
        ) : (
          <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
            <Outlet />
          </div>
        )}
      </main>

      <footer className="bg-stone-950 dark:bg-black text-stone-400 mt-auto pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <span className="text-lg font-black text-white">{storeName}</span>
            <p className="text-xs leading-relaxed">Your everyday storefront for streetwear, tech, and more — built for fast, reliable delivery.</p>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
              <ShieldCheck size={14} /> {t('secure_checkout')}
            </span>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-white text-sm uppercase tracking-wide">Shop</h4>
            <Link to="/" className="block text-xs hover:text-brand-400 transition">{t('all_products')}</Link>
            <Link to="/cart" className="block text-xs hover:text-brand-400 transition">{t('your_cart')}</Link>
            <Link to="/wishlist" className="block text-xs hover:text-brand-400 transition">{t('wishlist')}</Link>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-white text-sm uppercase tracking-wide">Support</h4>
            <Link to="/tracking" className="block text-xs hover:text-brand-400 transition">{t('track_order')}</Link>
            <Link to="/login" className="block text-xs hover:text-brand-400 transition">{t('sign_in')}</Link>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-white text-sm uppercase tracking-wide">Payments</h4>
            <p className="text-xs">Cash on Delivery, Card, Vodafone Cash, InstaPay, Fawry</p>
          </div>
        </div>

        {sponsors.length > 0 && (
          <div className="border-t border-stone-800 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500 text-center">In partnership with</p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {sponsors.map((sponsor, idx) => (
                  sponsor.url ? (
                    <a key={idx} href={sponsor.url} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition">
                      <img src={sponsor.logo_url} alt={sponsor.name} loading="lazy" decoding="async" className="h-8 object-contain" />
                    </a>
                  ) : (
                    <img key={idx} src={sponsor.logo_url} alt={sponsor.name} loading="lazy" decoding="async" className="h-8 object-contain opacity-70" />
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-stone-800 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <p>&copy; {new Date().getFullYear()} {storeName}. {t('all_rights_reserved')}</p>
            {footerCreditsEnabled && (
              <p>{footerCreditsText || 'Built by AlyEldeen Alaa & Almuddaththir Mahmoud'}</p>
            )}
          </div>
        </div>
      </footer>

      <Suspense fallback={null}>
        <AICopilot />
      </Suspense>

      <MobileBottomNav onSearch={() => { setMobileMenuOpen(false); setMobileSearchOpen(true); }} />

      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-[80] bg-stone-950/40 backdrop-blur-sm" onClick={() => setMobileSearchOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 mobile-safe-bottom bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 rounded-t-3xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-w-xl mx-auto space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-lg dark:text-white">{t('search')}</p>
                  <p className="text-xs text-stone-500">{t('search_placeholder')}</p>
                </div>
                <button type="button" onClick={() => setMobileSearchOpen(false)} className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-300" aria-label="Close search">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleHeaderSearch} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19} />
                <input
                  autoFocus
                  type="search"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full pl-11 pr-4 py-4 storefront-field bg-stone-50 dark:bg-stone-950"
                />
              </form>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold text-sm px-5 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}

    </div>
  );
}