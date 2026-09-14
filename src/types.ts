export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  rating: number;
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