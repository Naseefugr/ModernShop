-- Migration: Phases 4, 5, 6 - Orders, Multi-Vendor Splits, Invoices, Reviews, Notifications & Coupons
-- Purpose: Complete transaction, fulfillment, customer lifecycle, and governance tables

DO $$ BEGIN
    CREATE TYPE public.master_order_status AS ENUM ('pending_payment', 'confirmed', 'processing', 'partially_shipped', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.sub_order_status AS ENUM ('confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancellation_requested', 'cancelled', 'return_requested', 'returned', 'refund_processing', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method_type AS ENUM ('upi', 'card', 'net_banking', 'cod');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status_type AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Orders Table (Master Customer Order)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    shipping_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    shipping_address_snapshot JSONB NOT NULL,
    subtotal_amount NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method public.payment_method_type NOT NULL DEFAULT 'cod',
    payment_status public.payment_status_type NOT NULL DEFAULT 'pending',
    status public.master_order_status NOT NULL DEFAULT 'confirmed',
    customer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 2. Sub-Orders Table (Vendor Fulfillment Split)
CREATE TABLE IF NOT EXISTS public.sub_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_order_number TEXT NOT NULL UNIQUE,
    master_order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    salesman_id UUID NOT NULL REFERENCES public.salesman_profiles(id) ON DELETE RESTRICT,
    subtotal_amount NUMERIC(12,2) NOT NULL,
    commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    vendor_net_earnings NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status public.sub_order_status NOT NULL DEFAULT 'confirmed',
    courier_partner TEXT,
    tracking_number TEXT,
    estimated_delivery_date DATE,
    actual_delivery_date TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_orders_master_order_id ON public.sub_orders(master_order_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_salesman_id ON public.sub_orders(salesman_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_status ON public.sub_orders(status);

-- 3. Order Items Table (Immutable Snapshots)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sub_order_id UUID NOT NULL REFERENCES public.sub_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    salesman_id UUID NOT NULL REFERENCES public.salesman_profiles(id) ON DELETE RESTRICT,
    product_title TEXT NOT NULL,
    product_sku TEXT,
    variant_name TEXT,
    product_image_url TEXT,
    unit_price NUMERIC(10,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_master_order_id ON public.order_items(master_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_sub_order_id ON public.order_items(sub_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_salesman_id ON public.order_items(salesman_id);

-- 4. Order Status History Table (Audit Timeline)
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_order_id UUID NOT NULL REFERENCES public.sub_orders(id) ON DELETE CASCADE,
    previous_status public.sub_order_status,
    new_status public.sub_order_status NOT NULL,
    notes TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_sub_order_id ON public.order_status_history(sub_order_id);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    gateway_name TEXT NOT NULL DEFAULT 'razorpay',
    gateway_order_id TEXT NOT NULL UNIQUE,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status public.payment_status_type NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- 6. Wishlists Table
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wishlist_id UUID NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wishlist_product UNIQUE (wishlist_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);

-- 7. In-App Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = FALSE;

-- 8. Product Reviews Table
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_title TEXT,
    comment TEXT NOT NULL,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT TRUE,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);

-- 9. Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_percentage NUMERIC(5,2),
    flat_discount_amount NUMERIC(10,2),
    minimum_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    max_discount_amount NUMERIC(10,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
