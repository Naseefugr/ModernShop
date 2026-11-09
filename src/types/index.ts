export type UserRole = "admin" | "salesman" | "customer";
export type UserStatus = "active" | "pending_approval" | "suspended" | "deactivated";
export type ProductStatus = "active" | "paused" | "out_of_stock" | "pending_approval" | "rejected";

export type MasterOrderStatus =
  | "pending_payment"
  | "confirmed"
  | "processing"
  | "partially_shipped"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type SubOrderStatus =
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancellation_requested"
  | "cancelled"
  | "return_requested"
  | "returned"
  | "refund_processing"
  | "refunded";

export type PaymentMethod = "upi" | "card" | "net_banking" | "cod";
export type PaymentStatus = "pending" | "authorized" | "captured" | "failed" | "refunded";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesmanProfile {
  id: string;
  user_id: string | null;
  store_name: string;
  store_slug: string;
  store_description: string | null;
  store_logo_url: string | null;
  store_banner_url: string | null;
  gstin: string | null;
  business_phone: string;
  business_email: string;
  business_address: string;
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  bank_account_holder?: string | null;
  is_approved: boolean;
  approved_at: string | null;
  commission_rate_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  total_orders_count: number;
  total_spent_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  recipient_name: string;
  phone_number: string;
  alternate_phone?: string | null;
  house_flat_no: string;
  street_locality: string;
  landmark?: string | null;
  city: string;
  district: string;
  state: string;
  pin_code: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku: string | null;
  additional_price: number;
  available_stock: number;
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  salesman_id: string;
  category_id: string;
  subcategory_id?: string | null;
  title: string;
  slug: string;
  description: string;
  brand: string | null;
  selling_price: number;
  original_price: number | null;
  available_stock: number;
  low_stock_threshold: number;
  sku: string | null;
  features: string[];
  specifications: Record<string, string>;
  tags: string[];
  delivery_info: string | null;
  status: ProductStatus;
  is_featured: boolean;
  is_trending: boolean;
  average_rating: number;
  total_reviews_count: number;
  total_sold_count: number;
  created_at?: string;
  updated_at?: string;
  categories?: Category;
  salesman_profiles?: SalesmanProfile;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
}

export interface CartItem {
  product: Product;
  selectedVariant?: ProductVariant | null;
  quantity: number;
}

export interface OrderItem {
  id: string;
  master_order_id: string;
  sub_order_id: string;
  product_id: string;
  variant_id?: string | null;
  salesman_id: string;
  product_title: string;
  product_sku?: string | null;
  variant_name?: string | null;
  product_image_url?: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  created_at?: string;
}

export interface SubOrder {
  id: string;
  sub_order_number: string;
  master_order_id: string;
  salesman_id: string;
  subtotal_amount: number;
  commission_percentage: number;
  commission_amount: number;
  vendor_net_earnings: number;
  status: SubOrderStatus;
  courier_partner?: string | null;
  tracking_number?: string | null;
  estimated_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  cancellation_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  salesman_profiles?: SalesmanProfile;
  order_items?: OrderItem[];
  order_status_history?: OrderStatusHistory[];
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  shipping_address_id?: string | null;
  shipping_address_snapshot: Partial<Address>;
  subtotal_amount: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: MasterOrderStatus;
  customer_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  sub_orders?: SubOrder[];
  order_items?: OrderItem[];
  profiles?: Profile;
}

export interface OrderStatusHistory {
  id: string;
  sub_order_id: string;
  previous_status?: SubOrderStatus | null;
  new_status: SubOrderStatus;
  notes?: string | null;
  updated_by?: string | null;
  created_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  action_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review_title?: string | null;
  comment: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discount_percentage?: number | null;
  flat_discount_amount?: number | null;
  minimum_order_amount: number;
  max_discount_amount?: number | null;
  is_active: boolean;
}
