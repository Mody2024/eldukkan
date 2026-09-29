import type { CartItem, Product } from '../types';

export type AIPageType =
  | 'home'
  | 'search'
  | 'category'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'wishlist'
  | 'account'
  | 'tracking'
  | 'storefront';

export type AISafeProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  effective_price: number;
  category: string | null;
  stock: number | null;
  rating: number | null;
  review_count: number | null;
  sale_active: boolean;
};

export type AISafeCartItem = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  category: string | null;
  stock: number | null;
};

export type AIPageContext = {
  page: string;
  pageType: AIPageType;
  query: string;
  pageTitle: string;
  language: 'en' | 'ar';
  theme: 'light' | 'dark';
  experience: 'modern' | 'heritage' | 'easy';
  cart: {
    items: AISafeCartItem[];
    itemCount: number;
    subtotal: number;
  };
  pageMap: Array<{
    target: string | null;
    label: string;
    tag: string;
    href: string | null;
    visible: boolean;
  }>;
  userAskedToNavigate?: boolean;
  guidedMode?: boolean;
  guideStep?: {
    index: number;
    target: string | null;
    goal: string | null;
  } | null;
  [key: string]: unknown;
};

export function getEffectiveProductPrice(product: Pick<Product, 'price' | 'sale_price' | 'sale_ends_at'>, now = Date.now()) {
  const saleActive = typeof product.sale_price === 'number'
    && product.sale_price > 0
    && (!product.sale_ends_at || new Date(product.sale_ends_at).getTime() > now);
  return {
    saleActive,
    price: saleActive ? Number(product.sale_price) : Number(product.price),
  };
}

export function toAIProduct(product: Product): AISafeProduct {
  const sale = getEffectiveProductPrice(product);
  return {
    id: product.id,
    name: String(product.name || '').slice(0, 180),
    description: String(product.description || '').slice(0, 500),
    price: Number(product.price || 0),
    sale_price: product.sale_price == null ? null : Number(product.sale_price),
    effective_price: sale.price,
    category: product.category ? String(product.category).slice(0, 120) : null,
    stock: product.stock == null ? null : Number(product.stock),
    rating: product.review_count && product.review_count > 0 && product.rating != null ? Number(product.rating) : null,
    review_count: product.review_count == null ? null : Number(product.review_count),
    sale_active: sale.saleActive,
  };
}

export function toAICartItem(item: CartItem): AISafeCartItem {
  const unitPrice = Number(item.price || 0);
  const quantity = Math.max(0, Math.floor(Number(item.quantity || 0)));
  return {
    id: item.id,
    name: String(item.name || '').slice(0, 180),
    quantity,
    unit_price: unitPrice,
    line_total: unitPrice * quantity,
    category: item.category ? String(item.category).slice(0, 120) : null,
    stock: item.stock == null ? null : Number(item.stock),
  };
}

export function getAIPageType(pathname: string, search = ''): AIPageType {
  if (pathname === '/') return search.includes('q=') ? 'search' : 'home';
  if (pathname.startsWith('/category/')) return 'category';
  if (pathname.startsWith('/product/')) return 'product';
  if (pathname === '/cart') return 'cart';
  if (pathname === '/checkout') return 'checkout';
  if (pathname === '/wishlist') return 'wishlist';
  if (pathname === '/account') return 'account';
  if (pathname.startsWith('/tracking')) return 'tracking';
  return 'storefront';
}

export function collectAITargets() {
  const nodes = Array.from(
    document.querySelectorAll('[data-ai-target], button, a, input, select, textarea, [role="button"]')
  ) as HTMLElement[];

  return nodes
    .map((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      const target = node.getAttribute('data-ai-target') || null;
      const label =
        node.getAttribute('aria-label')
        || node.getAttribute('placeholder')
        || (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140);
      const href = node instanceof HTMLAnchorElement ? node.getAttribute('href') : null;
      return {
        target,
        label,
        tag: node.tagName.toLowerCase(),
        href: href ? href.slice(0, 180) : null,
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
      };
    })
    .filter((item) => item.visible && item.label)
    .slice(0, 160);
}
