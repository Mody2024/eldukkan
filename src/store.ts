import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from './types';

interface StoreState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  userEmail: string | null;
  setUserEmail: (email: string | null) => void;
  isAuthorizedAdmin: boolean;
  setAdminStatus: (status: boolean) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      
      cart: [],
      addToCart: (product) => set((state) => {
        const existing = state.cart.find(item => item.id === product.id);
        if (existing) {
          return { cart: state.cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) };
        }
        return { cart: [...state.cart, { ...product, quantity: 1 }] };
      }),
      removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter(item => item.id !== productId)
      })),
      clearCart: () => set({ cart: [] }),

      userEmail: null,
      setUserEmail: (email) => set({ userEmail: email }),
      isAuthorizedAdmin: false,
      setAdminStatus: (status) => set({ isAuthorizedAdmin: status }),
    }),
    { name: 'eldukkan-storage' } // Saves cart and theme to local storage automatically
  )
);