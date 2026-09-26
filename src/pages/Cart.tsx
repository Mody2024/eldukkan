import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../store';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
        <div className="w-20 h-20 bg-brand-500/10 text-brand-500 rounded-3xl flex items-center justify-center mx-auto">
          <ShoppingBag size={36} />
        </div>
        <h2 className="text-2xl font-black dark:text-white">{t('cart_empty')}</h2>
        <p className="text-stone-500 text-sm">Add some items from the store first.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-xl transition">
          {t('browse_storefront')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      <h1 className="text-3xl font-black dark:text-white tracking-tight">{t('your_cart')}</h1>

      <div className="space-y-4">
        {cart.map((item) => (
          <div key={item.id} className="flex items-center gap-3 sm:gap-4 storefront-card p-3 sm:p-4">
            <img src={item.image_url} alt={item.name} className="w-20 h-20 sm:w-16 sm:h-16 object-cover rounded-xl border border-stone-200 dark:border-stone-700 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold dark:text-white truncate">{item.name}</h3>
              <p className="text-brand-500 font-black text-sm">EGP {item.price}</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="min-w-11 min-h-11 p-2 rounded-lg hover:bg-white dark:hover:bg-stone-700 transition dark:text-white flex items-center justify-center"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-bold text-sm dark:text-white">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="p-2 rounded-lg hover:bg-white dark:hover:bg-stone-700 transition dark:text-white"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={() => removeFromCart(item.id)}
              className="min-w-11 min-h-11 p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition shrink-0 flex items-center justify-center"
              aria-label="Remove item"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between sticky bottom-3 z-20 shadow-xl">
        <div>
          <p className="text-stone-500 text-xs font-bold uppercase">{t('total')}</p>
          <p className="text-2xl font-black text-brand-500">EGP {total}</p>
        </div>
        <button
          onClick={() => navigate('/checkout')}
          className="flex items-center gap-2 px-6 py-4 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-xl transition shadow-lg shadow-brand-500/20"
        >
          {t('checkout')} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}