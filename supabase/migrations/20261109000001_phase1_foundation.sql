-- Migration: Phase 1 Foundation & Core Architecture
-- Generated: 2026-11-09
-- Purpose: Profiles, Roles, Status, Salesman Profiles, Customer Profiles, Addresses, Platform Settings, Trigger & RLS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'salesman', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.user_status AS ENUM ('active', 'pending_approval', 'suspended', 'deactivated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    role public.user_role NOT NULL DEFAULT 'customer',
    status public.user_status NOT NULL DEFAULT 'active',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 2. Salesman Profiles Table
CREATE TABLE IF NOT EXISTS public.salesman_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    store_slug TEXT NOT NULL UNIQUE,
    store_description TEXT,
    store_logo_url TEXT,
    store_banner_url TEXT,
    gstin TEXT,
    business_phone TEXT NOT NULL,
    business_email TEXT NOT NULL,
    business_address TEXT NOT NULL,
    bank_account_number TEXT,
    bank_ifsc_code TEXT,
    bank_account_holder TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    commission_rate_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_salesman_user_id ON public.salesman_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_salesman_is_approved ON public.salesman_profiles(is_approved);

-- 3. Customer Profiles Table
CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_orders_count INTEGER NOT NULL DEFAULT 0,
    total_spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_user_id ON public.customer_profiles(user_id);

-- 4. Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    alternate_phone TEXT,
    house_flat_no TEXT NOT NULL,
    street_locality TEXT NOT NULL,
    landmark TEXT,
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    pin_code VARCHAR(6) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- 5. Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Platform Settings
INSERT INTO public.platform_settings (key, value, description)
VALUES 
    ('general', '{"marketplace_name": "ModernShop", "support_email": "support@modernshop.com", "currency": "INR"}'::JSONB, 'General marketplace settings'),
    ('order_policies', '{"free_shipping_threshold": 999, "standard_shipping_fee": 49, "cod_enabled": true, "return_window_days": 7}'::JSONB, 'Shipping and checkout policies')
ON CONFLICT (key) DO NOTHING;

-- 6. Trigger to automatically provision profiles on auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SET search_path = public
AS $$
DECLARE
    v_role public.user_role;
    v_full_name TEXT;
    v_phone TEXT;
    v_store_name TEXT;
    v_store_slug TEXT;
    v_gstin TEXT;
    v_address TEXT;
BEGIN
    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'New User');
    v_phone := new.raw_user_meta_data->>'phone_number';
    
    IF (new.raw_user_meta_data->>'role') = 'salesman' THEN
        v_role := 'salesman';
    ELSIF (new.raw_user_meta_data->>'role') = 'admin' THEN
        v_role := 'admin';
    ELSE
        v_role := 'customer';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, phone_number, role, status)
    VALUES (new.id, new.email, v_full_name, v_phone, v_role, 'active')
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
        updated_at = CURRENT_TIMESTAMP;

    IF v_role = 'salesman' THEN
        v_store_name := COALESCE(new.raw_user_meta_data->>'store_name', v_full_name || '''s Store');
        v_store_slug := COALESCE(new.raw_user_meta_data->>'store_slug', 'store-' || substr(new.id::text, 1, 8));
        v_gstin := new.raw_user_meta_data->>'gstin';
        v_address := COALESCE(new.raw_user_meta_data->>'business_address', 'Address Pending');

        INSERT INTO public.salesman_profiles (
            user_id,
            store_name,
            store_slug,
            business_phone,
            business_email,
            business_address,
            gstin,
            is_approved
        )
        VALUES (
            new.id,
            v_store_name,
            v_store_slug,
            COALESCE(v_phone, '0000000000'),
            new.email,
            v_address,
            v_gstin,
            FALSE
        )
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF v_role = 'customer' THEN
        INSERT INTO public.customer_profiles (user_id)
        VALUES (new.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Row Level Security (RLS) Setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salesman_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Policies for profiles
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Public can view basic salesman profiles" ON public.profiles;
CREATE POLICY "Public can view basic salesman profiles"
ON public.profiles FOR SELECT
TO anon
USING (role = 'salesman');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Policies for salesman_profiles
DROP POLICY IF EXISTS "Public can view approved salesmen" ON public.salesman_profiles;
CREATE POLICY "Public can view approved salesmen"
ON public.salesman_profiles FOR SELECT
TO public
USING (is_approved = TRUE);

DROP POLICY IF EXISTS "Salesmen can view own profile even if unapproved" ON public.salesman_profiles;
CREATE POLICY "Salesmen can view own profile even if unapproved"
ON public.salesman_profiles FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Salesmen can update own profile" ON public.salesman_profiles;
CREATE POLICY "Salesmen can update own profile"
ON public.salesman_profiles FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- Policies for customer_profiles
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customer_profiles;
CREATE POLICY "Customers can view own profile"
ON public.customer_profiles FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can update own profile" ON public.customer_profiles;
CREATE POLICY "Customers can update own profile"
ON public.customer_profiles FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- Policies for addresses
DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
CREATE POLICY "Users can view own addresses"
ON public.addresses FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.addresses;
CREATE POLICY "Users can insert own addresses"
ON public.addresses FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
CREATE POLICY "Users can update own addresses"
ON public.addresses FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
CREATE POLICY "Users can delete own addresses"
ON public.addresses FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()));

-- Policies for platform_settings
DROP POLICY IF EXISTS "Platform settings public readable" ON public.platform_settings;
CREATE POLICY "Platform settings public readable"
ON public.platform_settings FOR SELECT
TO public
USING (true);
