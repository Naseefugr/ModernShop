-- Migration: Phase 2 & 3 Catalog, Inventory & Vendor Workflows
-- Purpose: Categories, Subcategories, Products, Product Images, Variants, Inventory Logs & RLS

DO $$ BEGIN
    CREATE TYPE public.product_status AS ENUM ('active', 'paused', 'out_of_stock', 'pending_approval', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.inventory_change_type AS ENUM ('order_purchase', 'order_cancellation', 'order_return', 'manual_restock', 'manual_adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- 2. Subcategories Table
CREATE TABLE IF NOT EXISTS public.subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_is_active ON public.subcategories(is_active);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salesman_id UUID NOT NULL REFERENCES public.salesman_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    brand TEXT,
    selling_price NUMERIC(10,2) NOT NULL CHECK (selling_price >= 0),
    original_price NUMERIC(10,2) CHECK (original_price >= selling_price),
    available_stock INTEGER NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    sku TEXT UNIQUE,
    features JSONB NOT NULL DEFAULT '[]'::JSONB,
    specifications JSONB NOT NULL DEFAULT '{}'::JSONB,
    tags TEXT[] NOT NULL DEFAULT '{}',
    delivery_info TEXT,
    status public.product_status NOT NULL DEFAULT 'active',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_trending BOOLEAN NOT NULL DEFAULT FALSE,
    average_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    total_reviews_count INTEGER NOT NULL DEFAULT 0,
    total_sold_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_salesman_id ON public.products(salesman_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_is_trending ON public.products(is_trending) WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_selling_price ON public.products(selling_price);

-- 4. Product Images Table
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);

-- 5. Product Variants Table
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    sku TEXT UNIQUE,
    additional_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    available_stock INTEGER NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
    attributes JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

-- 6. Inventory Logs Table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    change_type public.inventory_change_type NOT NULL,
    quantity_changed INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    resulting_stock INTEGER NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON public.inventory_logs(product_id);

-- 7. Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Policies for categories & subcategories (Public read)
CREATE POLICY "Public can view active categories" ON public.categories
FOR SELECT TO public USING (is_active = TRUE);

CREATE POLICY "Public can view active subcategories" ON public.subcategories
FOR SELECT TO public USING (is_active = TRUE);

-- Policies for products
CREATE POLICY "Public can view active products" ON public.products
FOR SELECT TO public USING (status = 'active');

CREATE POLICY "Salesmen can view own products" ON public.products
FOR SELECT TO authenticated
USING (salesman_id IN (SELECT id FROM public.salesman_profiles WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Salesmen can insert own products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (salesman_id IN (SELECT id FROM public.salesman_profiles WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Salesmen can update own products" ON public.products
FOR UPDATE TO authenticated
USING (salesman_id IN (SELECT id FROM public.salesman_profiles WHERE user_id = (SELECT auth.uid())))
WITH CHECK (salesman_id IN (SELECT id FROM public.salesman_profiles WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Salesmen can delete own products" ON public.products
FOR DELETE TO authenticated
USING (salesman_id IN (SELECT id FROM public.salesman_profiles WHERE user_id = (SELECT auth.uid())));

-- Policies for product_images
CREATE POLICY "Public can view product images" ON public.product_images
FOR SELECT TO public USING (true);

CREATE POLICY "Salesmen can manage own product images" ON public.product_images
FOR ALL TO authenticated
USING (product_id IN (SELECT id FROM public.products WHERE salesman_id IN (SELECT id FROM public.salesman_profiles WHERE user_id = (SELECT auth.uid()))))
WITH CHECK (product_id IN (SELECT id FROM public.products WHERE salesman_id IN (SELECT id FROM public.salesman_profiles WHERE user_id = (SELECT auth.uid()))));

-- Policies for product_variants
CREATE POLICY "Public can view product variants" ON public.product_variants
FOR SELECT TO public USING (true);

CREATE POLICY "Salesmen can manage own product variants" ON public.product_variants
FOR ALL TO authenticated
USING (product_id IN (SELECT id FROM public.products WHERE salesman_id IN (SELECT id FROM public.salesman_profiles WHERE user_id = (SELECT auth.uid()))))
WITH CHECK (product_id IN (SELECT id FROM public.products WHERE salesman_id IN (SELECT id FROM public.salesman_profiles WHERE user_id = (SELECT auth.uid()))));

-- Policies for inventory_logs
CREATE POLICY "Salesmen can view own inventory logs" ON public.inventory_logs
FOR SELECT TO authenticated
USING (product_id IN (SELECT id FROM public.products WHERE salesman_id IN (SELECT id FROM public.salesman_profiles WHERE user_id = (SELECT auth.uid()))));
