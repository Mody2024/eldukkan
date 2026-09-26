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
  adminRole: 'owner' | 'admin' | 'staff' | null;
  setAdminRole: (role: 'owner' | 'admin' | 'staff' | null) => void;
  adminPermissions: string[];
  setAdminPermissions: (perms: string[]) => void;
  hasPermission: (perm: string) => boolean;
  adminCheckPending: boolean;
  setAdminCheckPending: (pending: boolean) => void;

  toast: string | null;
  showToast: (message: string) => void;

  announcementBanner: string | null;
  maintenanceMode: boolean;
  storeName: string;
  logoUrl: string | null;
  heroHeadline: string | null;
  heroSubheadline: string | null;
  heroImageUrl: string | null;
  footerCreditsEnabled: boolean;
  footerCreditsText: string | null;
  sponsors: { name: string; logo_url: string; url?: string }[];
  setSiteSettings: (settings: {
    announcementBanner: string | null; maintenanceMode: boolean; storeName: string; logoUrl: string | null;
    heroHeadline?: string | null; heroSubheadline?: string | null; heroImageUrl?: string | null;
    footerCreditsEnabled?: boolean; footerCreditsText?: string | null; sponsors?: { name: string; logo_url: string; url?: string }[];
  }) => void;

  wishlist: string[];
  setWishlist: (ids: string[]) => void;
  toggleWishlistId: (id: string) => void;

  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;

  experience: 'modern' | 'heritage' | 'easy';
  setExperience: (experience: 'modern' | 'heritage' | 'easy') => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      theme: 'light',
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
      adminRole: null,
      setAdminRole: (role) => set({ adminRole: role }),
      adminPermissions: [],
      setAdminPermissions: (perms) => set({ adminPermissions: perms }),
      // Owner has every capability, non-negotiable in the UI too (mirrors
      // the SQL admin_has_permission() short-circuit for owner).
      hasPermission: (perm) => {
        const state = get();
        if (state.adminRole === 'owner') return true;
        return state.adminPermissions.includes(perm);
      },
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

      announcementBanner: null,
      maintenanceMode: false,
      storeName: 'Eldukkan',
      logoUrl: null,
      heroHeadline: null,
      heroSubheadline: null,
      heroImageUrl: null,
      footerCreditsEnabled: true,
      footerCreditsText: null,
      sponsors: [],
      setSiteSettings: (settings) =>
        set({
          announcementBanner: settings.announcementBanner,
          maintenanceMode: settings.maintenanceMode,
          storeName: settings.storeName,
          logoUrl: settings.logoUrl,
          heroHeadline: settings.heroHeadline ?? null,
          heroSubheadline: settings.heroSubheadline ?? null,
          heroImageUrl: settings.heroImageUrl ?? null,
          footerCreditsEnabled: settings.footerCreditsEnabled ?? true,
          footerCreditsText: settings.footerCreditsText ?? null,
          sponsors: settings.sponsors ?? [],
        }),

      // Wishlist is a list of product IDs, synced with the `wishlists`
      // table for signed-in customers (see Account/ProductDetails).
      wishlist: [],
      setWishlist: (ids) => set({ wishlist: ids }),
      toggleWishlistId: (id) => set((state) => ({
        wishlist: state.wishlist.includes(id) ? state.wishlist.filter((w) => w !== id) : [...state.wishlist, id],
      })),

      language: 'en',
      setLanguage: (lang) => set({ language: lang }),

      experience: 'modern',
      setExperience: (experience) => set({ experience }),
    }),
    {
      name: 'eldukkan-storage',
      // Only persist what should survive a refresh; auth/admin status and the
      // toast are runtime-only and must never be cached to localStorage.
      partialize: (state) => ({ theme: state.theme, cart: state.cart, language: state.language, experience: state.experience }),
    }
  )
);