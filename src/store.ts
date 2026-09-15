import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from './types';

let toastTimer: ReturnType<typeof setTimeout> | undefined;

interface StoreState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  userEmail: string | null;
  setUserEmail: (email: string | null) => void;
  userId: string | null;
  setUserId: (id: string | null) => void;
  isAuthorizedAdmin: boolean;
  setAdminStatus: (status: boolean) => void;
  adminCheckPending: boolean;
  setAdminCheckPending: (pending: boolean) => void;

  toast: string | null;
  showToast: (message: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      cart: [],
      addToCart: (product) => set((state) => {
        const existing = state.cart.find((item) => item.id === product.id);
        if (existing) {
          return { cart: state.cart.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) };
        }
        return { cart: [...state.cart, { ...product, quantity: 1 }] };
      }),
      removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter((item) => item.id !== productId)
      })),
      updateQuantity: (productId, quantity) => set((state) => {
        if (quantity <= 0) {
          return { cart: state.cart.filter((item) => item.id !== productId) };
        }
        return { cart: state.cart.map((i) => i.id === productId ? { ...i, quantity } : i) };
      }),
      clearCart: () => set({ cart: [] }),

      userEmail: null,
      setUserEmail: (email) => set({ userEmail: email }),
      userId: null,
      setUserId: (id) => set({ userId: id }),
      isAuthorizedAdmin: false,
      setAdminStatus: (status) => set({ isAuthorizedAdmin: status }),
      // True until the first admin-status check (against admin_users) has
      // resolved. ProtectedAdminRoute must wait for this instead of
      // assuming "not yet confirmed admin" means "not admin" — otherwise a
      // real admin gets bounced out during the split second before the
      // async Supabase query finishes.
      adminCheckPending: true,
      setAdminCheckPending: (pending) => set({ adminCheckPending: pending }),

      // Lightweight in-store toast so we don't rely on blocking alert() popups.
      toast: null,
      showToast: (message) => {
        clearTimeout(toastTimer);
        set({ toast: message });
        toastTimer = setTimeout(() => set({ toast: null }), 2600);
      },
    }),
    {
      name: 'eldukkan-storage',
      // Only persist what should survive a refresh; auth/admin status and the
      // toast are runtime-only and must never be cached to localStorage.
      partialize: (state) => ({ theme: state.theme, cart: state.cart }),
    }
  )
);