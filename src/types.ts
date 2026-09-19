export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  images?: string[];
  category?: string;
  stock?: number;
  vendor_name?: string;
  rating?: number;
  review_count?: number;
  is_active?: boolean;
  featured?: boolean;
  featured_order?: number;
  created_at?: string;
}

export interface Review {
  id: string;
  product_id: string;
  customer_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export type PaymentMethod = 'cod' | 'instapay';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

export type PaymentStatus = 'unpaid' | 'paid' | 'failed';

export interface Order {
  id: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone: string;
  address: string;
  notes?: string;
  payment_method: PaymentMethod;
  payment_status?: PaymentStatus;
  discount_code?: string | null;
  discount_amount?: number;
  total: number;
  status: OrderStatus;
  items: CartItem[];
  created_at: string;
}

export interface AdminUser {
  email: string;
  role?: 'owner' | 'admin' | 'staff';
  permissions?: string[];
  created_at?: string;
}

export type AdminPermission =
  | 'manage_products'
  | 'manage_orders'
  | 'manage_discounts'
  | 'view_analytics'
  | 'manage_settings'
  | 'manage_team'
  | 'view_audit_log'
  | 'manual_payment_override'
  | 'export_reports';

export interface DiscountCode {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}