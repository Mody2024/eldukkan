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
  created_at?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export type PaymentMethod = 'cod' | 'instapay';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

export interface Order {
  id: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone: string;
  address: string;
  notes?: string;
  payment_method: PaymentMethod;
  total: number;
  status: OrderStatus;
  items: CartItem[];
  created_at: string;
}

export interface AdminUser {
  email: string;
  created_at?: string;
}