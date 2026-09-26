import { Home, Search, Heart, ShoppingBag, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';

type Props = {
  onSearch: () => void;
};

export default function MobileBottomNav({ onSearch }: Props) {
  const location = useLocation();
  const { cart, wishlist, userId } = useStore();
  const { t } = useTranslation();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isActive = (path: string) => location.pathname === path || (path === '/' && location.pathname === '/');

  return (
    <nav
      aria-label="Mobile storefront navigation"
      className="md:hidden fixed inset-x-0 bottom-0 z-[45] border-t border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl mobile-safe-bottom"
    >
      <div className="grid grid-cols-5 max-w-xl mx-auto h-16">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-black transition ${isActive('/') ? 'text-brand-500' : 'text-stone-500 dark:text-stone-400'}`}
          aria-label={t('all_products')}
        >
          <Home size={19} />
          <span className="mobile-bottom-label">{t('shop')}</span>
        </Link>

        <button
          type="button"
          onClick={onSearch}
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-black text-stone-500 dark:text-stone-400 transition"
          aria-label={t('search')}
        >
          <Search size={19} />
          <span className="mobile-bottom-label">{t('search')}</span>
        </button>

        <Link
          to="/wishlist"
          className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-black transition ${isActive('/wishlist') ? 'text-brand-500' : 'text-stone-500 dark:text-stone-400'}`}
          aria-label={t('wishlist')}
        >
          <Heart size={19} />
          {wishlist.length > 0 && (
            <span className="absolute top-1.5 left-1/2 translate-x-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
              {wishlist.length}
            </span>
          )}
          <span className="mobile-bottom-label">{t('wishlist')}</span>
        </Link>

        <Link
          to="/cart"
          className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-black transition ${isActive('/cart') ? 'text-brand-500' : 'text-stone-500 dark:text-stone-400'}`}
          aria-label={t('cart')}
        >
          <ShoppingBag size={19} />
          {cartCount > 0 && (
            <span className="absolute top-1.5 left-1/2 translate-x-1.5 min-w-4 h-4 px-1 rounded-full bg-brand-500 text-white text-[9px] flex items-center justify-center">
              {cartCount}
            </span>
          )}
          <span className="mobile-bottom-label">{t('cart')}</span>
        </Link>

        <Link
          to={userId ? '/account' : '/login'}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-black transition ${(isActive('/account') || isActive('/login')) ? 'text-brand-500' : 'text-stone-500 dark:text-stone-400'}`}
          aria-label={userId ? t('my_account') : t('sign_in')}
        >
          <UserRound size={19} />
          <span className="mobile-bottom-label">{userId ? t('my_account') : t('sign_in')}</span>
        </Link>
      </div>
    </nav>
  );
}
