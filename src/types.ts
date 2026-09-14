export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  images?: string[];
  stock: number;
  rating: number;
  review_count?: number;
  is_active: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  city: string;
  payment_method: 'cod' | 'vodafone' | 'fawry' | 'card';
  payment_reference?: string;
  total: number;
  status: string;
  items: CartItem[];
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_email: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}