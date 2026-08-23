-- ============================================================================
-- DS DRY FRUITS BILLING & INVENTORY MANAGEMENT SYSTEM
-- PostgreSQL / Supabase Database Architecture Schema
-- ============================================================================
-- Description: Production-ready PostgreSQL schema for DS Dry Fruits.
-- Includes:
--   1. Extensions
--   2. Custom ENUM types
--   3. Concurrency-safe Business ID Sequences
--   4. Core Table Definitions & Constraints
--   5. Reusable Utility & Timestamp Functions
--   6. Supabase Auth to Profiles Sync (Security Definer Trigger)
--   7. Business Logic Triggers (Bill Totals, Purchases, Stock & Customer Credit)
--   8. Helper Authorization Functions (Role-Based Access Control)
--   9. Row Level Security (RLS) & Policies
--  10. Foreign Key Indexes & Performance Optimization
--  11. Verification Queries
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 2. CUSTOM ENUM TYPES
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('admin', 'staff', 'associate');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE public.user_status AS ENUM ('active', 'inactive');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        CREATE TYPE public.customer_status AS ENUM ('active', 'inactive');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_status') THEN
        CREATE TYPE public.category_status AS ENUM ('active', 'inactive');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
        CREATE TYPE public.product_status AS ENUM ('active', 'inactive');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
        CREATE TYPE public.purchase_status AS ENUM ('draft', 'completed', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_status') THEN
        CREATE TYPE public.bill_status AS ENUM ('draft', 'completed', 'cancelled', 'refunded');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode') THEN
        CREATE TYPE public.payment_mode AS ENUM ('cash', 'upi', 'credit');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_calculation') THEN
        CREATE TYPE public.transaction_calculation AS ENUM ('sum', 'subtract');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_payment_mode') THEN
        CREATE TYPE public.expense_payment_mode AS ENUM ('cash', 'upi');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. CONCURRENCY-SAFE BUSINESS ID SEQUENCES
-- ----------------------------------------------------------------------------
-- Human-readable business IDs (e.g., cat-101, distri-101, prod-101, prchs-101, bill-101)
-- are generated using PostgreSQL sequences to guarantee lock-free concurrency.
CREATE SEQUENCE IF NOT EXISTS public.category_id_seq START WITH 101 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.distributor_code_seq START WITH 101 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.product_id_seq START WITH 101 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.purchase_id_seq START WITH 101 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.bill_id_seq START WITH 101 INCREMENT BY 1;

-- ----------------------------------------------------------------------------
-- 4. REUSABLE UTILITY & TIMESTAMP FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. CORE DATABASE TABLES
-- ----------------------------------------------------------------------------

-- Table 1: profiles
-- Linked directly to Supabase auth.users.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT NOT NULL,
    mobile TEXT,
    role public.user_role NOT NULL DEFAULT 'admin',
    status public.user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: customers
-- Supports retail customers, loyalty points, and credit tracking.
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    mobile TEXT,
    points NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (points >= 0),
    credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (credit >= 0),
    location TEXT,
    address TEXT,
    status public.customer_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 3: categories
-- Product categories with human-readable business category_id (e.g. cat-101).
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL UNIQUE DEFAULT ('cat-' || nextval('public.category_id_seq'::regclass)),
    name TEXT NOT NULL,
    status public.category_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 4: distributors
-- Wholesalers and vendor suppliers with distributor_code (e.g. distri-101).
CREATE TABLE IF NOT EXISTS public.distributors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_code TEXT NOT NULL UNIQUE DEFAULT ('distri-' || nextval('public.distributor_code_seq'::regclass)),
    name TEXT NOT NULL,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 5: products
-- Dry fruits, nuts, berries, and spice inventory.
-- Barcode is nullable because loose or unpackaged items may not carry a barcode initially.
-- A unique constraint on barcode ensures no two distinct items share the same non-null barcode.
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL UNIQUE DEFAULT ('prod-' || nextval('public.product_id_seq'::regclass)),
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (mrp >= 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    retail_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (retail_quantity >= 0),
    warehouse_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (warehouse_quantity >= 0),
    low_selling_price NUMERIC(12, 2) DEFAULT 0.00 CHECK (low_selling_price >= 0),
    low_warehouse_quantity NUMERIC(12, 3) DEFAULT 0.000 CHECK (low_warehouse_quantity >= 0),
    status public.product_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 6: purchases
-- Inbound restock orders from distributors.
-- quantity represents the total aggregate units/kg purchased across all line items.
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id TEXT NOT NULL UNIQUE DEFAULT ('bill-' || to_char(now(), 'YYMMDD') || '-' || nextval('public.purchase_id_seq'::regclass)),
    distributor_id UUID REFERENCES public.distributors(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (quantity >= 0),
    status public.purchase_status NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 7: purchase_items
-- Detailed line items for each purchase batch.
-- product_name preserves historical name snapshot at the time of purchase.
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    retail_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (retail_quantity >= 0),
    warehouse_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (warehouse_quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_purchase_item_has_quantity CHECK (retail_quantity > 0 OR warehouse_quantity > 0)
);

-- Table 8: bills
-- Outbound customer billing transactions.
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id TEXT NOT NULL UNIQUE DEFAULT ('bill-' || to_char(now(), 'YYMMDD') || '-' || nextval('public.bill_id_seq'::regclass)),
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    status public.bill_status NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 9: bill_items
-- Line items associated with a bill. Stores historical mrp, selling_price, and row_total snapshot.
CREATE TABLE IF NOT EXISTS public.bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 1.000 CHECK (quantity > 0),
    mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (mrp >= 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    row_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (row_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 10: bill_payments
-- Payment records for bills supporting split tender (e.g. ₹500 Cash + ₹200 UPI).
CREATE TABLE IF NOT EXISTS public.bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    mode public.payment_mode NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 11: customer_transactions
-- Customer ledger accounting for credit additions and settlements.
-- bill_id is nullable to support manual adjustments and non-bill ledger entries.
CREATE TABLE IF NOT EXISTS public.customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
    calculation public.transaction_calculation NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 12: expenses
-- Daily operational expense tracking (e.g. tea, maintenance, packaging).
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    mode_type public.expense_payment_mode NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. ATTACH REUSABLE UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_distributors_updated_at ON public.distributors;
CREATE TRIGGER set_distributors_updated_at
    BEFORE UPDATE ON public.distributors
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_purchases_updated_at ON public.purchases;
CREATE TRIGGER set_purchases_updated_at
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_purchase_items_updated_at ON public.purchase_items;
CREATE TRIGGER set_purchase_items_updated_at
    BEFORE UPDATE ON public.purchase_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_bills_updated_at ON public.bills;
CREATE TRIGGER set_bills_updated_at
    BEFORE UPDATE ON public.bills
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_bill_items_updated_at ON public.bill_items;
CREATE TRIGGER set_bill_items_updated_at
    BEFORE UPDATE ON public.bill_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_bill_payments_updated_at ON public.bill_payments;
CREATE TRIGGER set_bill_payments_updated_at
    BEFORE UPDATE ON public.bill_payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_customer_transactions_updated_at ON public.customer_transactions;
CREATE TRIGGER set_customer_transactions_updated_at
    BEFORE UPDATE ON public.customer_transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_expenses_updated_at ON public.expenses;
CREATE TRIGGER set_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 7. SUPABASE AUTH TO PROFILES TRIGGER (CRITICAL REQUIREMENT)
-- ----------------------------------------------------------------------------
-- Creates profile automatically on auth.users creation with default role 'admin' and status 'active'.
-- Uses SECURITY DEFINER with fixed search_path to prevent security escalation.
-- Encapsulated in EXCEPTION block so unexpected profile errors do not block auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_name TEXT;
BEGIN
    -- Extract full name from raw_user_meta_data if present
    v_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(COALESCE(NEW.email, 'User'), '@', 1)
    );

    INSERT INTO public.profiles (
        id,
        name,
        email,
        mobile,
        role,
        status
    )
    VALUES (
        NEW.id,
        v_name,
        COALESCE(NEW.email, ''),
        NEW.phone,
        'admin'::public.user_role,
        'active'::public.user_status
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = clock_timestamp();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error to PostgreSQL log without breaking the auth transaction
        RAISE WARNING 'Supabase Auth handle_new_user trigger error: % %', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 8. BUSINESS LOGIC TRIGGERS
-- ----------------------------------------------------------------------------

-- 8.1 Bill Items Row Total Calculation (BEFORE INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.calculate_bill_item_row_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.row_total := ROUND((NEW.quantity * NEW.selling_price)::numeric, 2);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_bill_item_row_total ON public.bill_items;
CREATE TRIGGER trg_calculate_bill_item_row_total
    BEFORE INSERT OR UPDATE OF quantity, selling_price ON public.bill_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_bill_item_row_total();

-- 8.2 Bill Totals Recalculation (AFTER INSERT/UPDATE/DELETE on bill_items)
CREATE OR REPLACE FUNCTION public.sync_bill_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_bill_id UUID;
    v_subtotal NUMERIC(12, 2);
    v_discount NUMERIC(12, 2);
BEGIN
    v_bill_id := COALESCE(NEW.bill_id, OLD.bill_id);

    SELECT COALESCE(SUM(row_total), 0.00)
    INTO v_subtotal
    FROM public.bill_items
    WHERE bill_id = v_bill_id;

    SELECT discount
    INTO v_discount
    FROM public.bills
    WHERE id = v_bill_id;

    v_discount := COALESCE(v_discount, 0.00);

    UPDATE public.bills
    SET
        subtotal = v_subtotal,
        total = GREATEST(0.00, ROUND((v_subtotal - v_discount)::numeric, 2)),
        updated_at = clock_timestamp()
    WHERE id = v_bill_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bill_totals ON public.bill_items;
CREATE TRIGGER trg_sync_bill_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.bill_items
    FOR EACH ROW EXECUTE FUNCTION public.sync_bill_totals();

-- 8.3 Purchase Aggregate Quantity Recalculation (AFTER INSERT/UPDATE/DELETE on purchase_items)
CREATE OR REPLACE FUNCTION public.sync_purchase_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_purchase_id UUID;
    v_total_qty NUMERIC(12, 3);
BEGIN
    v_purchase_id := COALESCE(NEW.purchase_id, OLD.purchase_id);

    SELECT COALESCE(SUM(retail_quantity + warehouse_quantity), 0.000)
    INTO v_total_qty
    FROM public.purchase_items
    WHERE purchase_id = v_purchase_id;

    UPDATE public.purchases
    SET
        quantity = v_total_qty,
        updated_at = clock_timestamp()
    WHERE id = v_purchase_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_purchase_quantity ON public.purchase_items;
CREATE TRIGGER trg_sync_purchase_quantity
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_items
    FOR EACH ROW EXECUTE FUNCTION public.sync_purchase_quantity();

-- 8.4 Inbound Inventory Automation: Purchases -> Product Stock
-- Increases product retail_quantity and warehouse_quantity when purchase items are added to a completed purchase.
CREATE OR REPLACE FUNCTION public.handle_purchase_item_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_purchase_status public.purchase_status;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT status INTO v_purchase_status FROM public.purchases WHERE id = NEW.purchase_id;
        IF v_purchase_status = 'completed' THEN
            UPDATE public.products
            SET
                retail_quantity = retail_quantity + NEW.retail_quantity,
                warehouse_quantity = warehouse_quantity + NEW.warehouse_quantity,
                updated_at = clock_timestamp()
            WHERE id = NEW.product_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        SELECT status INTO v_purchase_status FROM public.purchases WHERE id = OLD.purchase_id;
        IF v_purchase_status = 'completed' THEN
            UPDATE public.products
            SET
                retail_quantity = GREATEST(0.000, retail_quantity - OLD.retail_quantity),
                warehouse_quantity = GREATEST(0.000, warehouse_quantity - OLD.warehouse_quantity),
                updated_at = clock_timestamp()
            WHERE id = OLD.product_id;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        SELECT status INTO v_purchase_status FROM public.purchases WHERE id = NEW.purchase_id;
        IF v_purchase_status = 'completed' THEN
            UPDATE public.products
            SET
                retail_quantity = GREATEST(0.000, retail_quantity + (NEW.retail_quantity - OLD.retail_quantity)),
                warehouse_quantity = GREATEST(0.000, warehouse_quantity + (NEW.warehouse_quantity - OLD.warehouse_quantity)),
                updated_at = clock_timestamp()
            WHERE id = NEW.product_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_purchase_item_stock ON public.purchase_items;
CREATE TRIGGER trg_handle_purchase_item_stock
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_purchase_item_stock();

-- 8.5 Outbound Inventory Automation: Bill Items -> Retail Stock
-- Decreases product retail_quantity atomically when items are billed on completed bills.
CREATE OR REPLACE FUNCTION public.handle_bill_item_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_bill_status public.bill_status;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT status INTO v_bill_status FROM public.bills WHERE id = NEW.bill_id;
        IF v_bill_status = 'completed' THEN
            UPDATE public.products
            SET
                retail_quantity = GREATEST(0.000, retail_quantity - NEW.quantity),
                updated_at = clock_timestamp()
            WHERE id = NEW.product_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        SELECT status INTO v_bill_status FROM public.bills WHERE id = OLD.bill_id;
        IF v_bill_status = 'completed' THEN
            UPDATE public.products
            SET
                retail_quantity = retail_quantity + OLD.quantity,
                updated_at = clock_timestamp()
            WHERE id = OLD.product_id;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        SELECT status INTO v_bill_status FROM public.bills WHERE id = NEW.bill_id;
        IF v_bill_status = 'completed' THEN
            UPDATE public.products
            SET
                retail_quantity = GREATEST(0.000, retail_quantity - (NEW.quantity - OLD.quantity)),
                updated_at = clock_timestamp()
            WHERE id = NEW.product_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_bill_item_stock ON public.bill_items;
CREATE TRIGGER trg_handle_bill_item_stock
    AFTER INSERT OR UPDATE OR DELETE ON public.bill_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_bill_item_stock();

-- 8.6 Bill Status Lifecycle Transition (Draft -> Completed -> Cancelled / Refunded)
-- Adjusts inventory atomically when a bill's overall status changes.
CREATE OR REPLACE FUNCTION public.handle_bill_status_stock_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
BEGIN
    -- Transition: Non-completed to Completed -> Deduct stock
    IF OLD.status <> 'completed' AND NEW.status = 'completed' THEN
        FOR r IN SELECT product_id, quantity FROM public.bill_items WHERE bill_id = NEW.id LOOP
            UPDATE public.products
            SET
                retail_quantity = GREATEST(0.000, retail_quantity - r.quantity),
                updated_at = clock_timestamp()
            WHERE id = r.product_id;
        END LOOP;

    -- Transition: Completed to Cancelled/Refunded/Draft -> Restore stock
    ELSIF OLD.status = 'completed' AND NEW.status IN ('cancelled', 'refunded', 'draft') THEN
        FOR r IN SELECT product_id, quantity FROM public.bill_items WHERE bill_id = NEW.id LOOP
            UPDATE public.products
            SET
                retail_quantity = retail_quantity + r.quantity,
                updated_at = clock_timestamp()
            WHERE id = r.product_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_bill_status_stock_transition ON public.bills;
CREATE TRIGGER trg_handle_bill_status_stock_transition
    AFTER UPDATE OF status ON public.bills
    FOR EACH ROW EXECUTE FUNCTION public.handle_bill_status_stock_transition();

-- 8.7 Customer Ledger & Credit Balance Maintenance
-- Maintains customers.credit strictly and prevents negative balances.
CREATE OR REPLACE FUNCTION public.sync_customer_credit_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_id UUID;
    v_delta NUMERIC(12, 2) := 0.00;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_customer_id := NEW.customer_id;
        IF NEW.calculation = 'sum' THEN
            v_delta := NEW.amount;
        ELSE
            v_delta := -NEW.amount;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        v_customer_id := OLD.customer_id;
        IF OLD.calculation = 'sum' THEN
            v_delta := -OLD.amount;
        ELSE
            v_delta := OLD.amount;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        v_customer_id := NEW.customer_id;
        -- Reverse old calculation
        IF OLD.calculation = 'sum' THEN
            v_delta := v_delta - OLD.amount;
        ELSE
            v_delta := v_delta + OLD.amount;
        END IF;
        -- Apply new calculation
        IF NEW.calculation = 'sum' THEN
            v_delta := v_delta + NEW.amount;
        ELSE
            v_delta := v_delta - NEW.amount;
        END IF;
    END IF;

    IF v_customer_id IS NOT NULL AND v_delta <> 0.00 THEN
        UPDATE public.customers
        SET
            credit = GREATEST(0.00, credit + v_delta),
            updated_at = clock_timestamp()
        WHERE id = v_customer_id;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_credit_balance ON public.customer_transactions;
CREATE TRIGGER trg_sync_customer_credit_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.customer_transactions
    FOR EACH ROW EXECUTE FUNCTION public.sync_customer_credit_balance();

-- 8.8 Automatic Customer Credit Transaction on Credit Bill Payment
-- When a bill payment of mode 'credit' is registered for a customer bill,
-- automatically log a ledger transaction if one doesn't exist yet.
CREATE OR REPLACE FUNCTION public.handle_credit_payment_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_id UUID;
    v_bill_status public.bill_status;
BEGIN
    IF NEW.mode = 'credit' THEN
        SELECT customer_id, status INTO v_customer_id, v_bill_status
        FROM public.bills
        WHERE id = NEW.bill_id;

        IF v_customer_id IS NOT NULL AND v_bill_status = 'completed' THEN
            INSERT INTO public.customer_transactions (
                customer_id,
                bill_id,
                calculation,
                amount,
                notes
            )
            VALUES (
                v_customer_id,
                NEW.bill_id,
                'sum'::public.transaction_calculation,
                NEW.amount,
                'Credit sale on bill #' || (SELECT bill_id FROM public.bills WHERE id = NEW.bill_id)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_credit_payment_ledger ON public.bill_payments;
CREATE TRIGGER trg_handle_credit_payment_ledger
    AFTER INSERT ON public.bill_payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_credit_payment_ledger();

-- 8.9 Protect Profile Role Escalation
-- Normal authenticated users cannot elevate their own or other users' roles or status unless they are an active admin.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_role public.user_role;
    v_caller_status public.user_status;
BEGIN
    -- Allow service role or initial auth trigger executions
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT role, status INTO v_caller_role, v_caller_status
    FROM public.profiles
    WHERE id = auth.uid();

    -- If caller is not an active admin, prevent changes to role and status
    IF v_caller_role <> 'admin' OR v_caller_status <> 'active' THEN
        IF NEW.role <> OLD.role THEN
            RAISE EXCEPTION 'Access Denied: Only active administrators can modify user roles.';
        END IF;
        IF NEW.status <> OLD.status THEN
            RAISE EXCEPTION 'Access Denied: Only active administrators can modify account status.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- ----------------------------------------------------------------------------
-- 9. HELPER AUTHORIZATION FUNCTIONS (RBAC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND status = 'active' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'::public.user_role
          AND status = 'active'::public.user_status
    );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin'::public.user_role, 'staff'::public.user_role)
          AND status = 'active'::public.user_status
    );
$$;

CREATE OR REPLACE FUNCTION public.is_active_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND status = 'active'::public.user_status
    );
$$;

-- ----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 11. RLS POLICIES
-- ----------------------------------------------------------------------------

-- 11.1 PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR public.is_admin()
    );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin() OR id = auth.uid()
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        id = auth.uid() OR public.is_admin()
    )
    WITH CHECK (
        id = auth.uid() OR public.is_admin()
    );

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (
        public.is_admin() AND id <> auth.uid()
    );

-- 11.2 CUSTOMERS POLICIES
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
CREATE POLICY "customers_select_policy"
    ON public.customers
    FOR SELECT
    TO authenticated
    USING (public.is_active_authenticated());

DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
CREATE POLICY "customers_insert_policy"
    ON public.customers
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
CREATE POLICY "customers_update_policy"
    ON public.customers
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;
CREATE POLICY "customers_delete_policy"
    ON public.customers
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 11.3 CATEGORIES POLICIES
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
CREATE POLICY "categories_select_policy"
    ON public.categories
    FOR SELECT
    TO authenticated
    USING (public.is_active_authenticated());

DROP POLICY IF EXISTS "categories_insert_policy" ON public.categories;
CREATE POLICY "categories_insert_policy"
    ON public.categories
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "categories_update_policy" ON public.categories;
CREATE POLICY "categories_update_policy"
    ON public.categories
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "categories_delete_policy" ON public.categories;
CREATE POLICY "categories_delete_policy"
    ON public.categories
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 11.4 DISTRIBUTORS POLICIES
DROP POLICY IF EXISTS "distributors_select_policy" ON public.distributors;
CREATE POLICY "distributors_select_policy"
    ON public.distributors
    FOR SELECT
    TO authenticated
    USING (public.is_active_authenticated());

DROP POLICY IF EXISTS "distributors_insert_policy" ON public.distributors;
CREATE POLICY "distributors_insert_policy"
    ON public.distributors
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "distributors_update_policy" ON public.distributors;
CREATE POLICY "distributors_update_policy"
    ON public.distributors
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "distributors_delete_policy" ON public.distributors;
CREATE POLICY "distributors_delete_policy"
    ON public.distributors
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 11.5 PRODUCTS POLICIES
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
CREATE POLICY "products_select_policy"
    ON public.products
    FOR SELECT
    TO authenticated
    USING (public.is_active_authenticated());

DROP POLICY IF EXISTS "products_insert_policy" ON public.products;
CREATE POLICY "products_insert_policy"
    ON public.products
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "products_update_policy" ON public.products;
CREATE POLICY "products_update_policy"
    ON public.products
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "products_delete_policy" ON public.products;
CREATE POLICY "products_delete_policy"
    ON public.products
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 11.6 PURCHASES POLICIES
DROP POLICY IF EXISTS "purchases_select_policy" ON public.purchases;
CREATE POLICY "purchases_select_policy"
    ON public.purchases
    FOR SELECT
    TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "purchases_insert_policy" ON public.purchases;
CREATE POLICY "purchases_insert_policy"
    ON public.purchases
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "purchases_update_policy" ON public.purchases;
CREATE POLICY "purchases_update_policy"
    ON public.purchases
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "purchases_delete_policy" ON public.purchases;
CREATE POLICY "purchases_delete_policy"
    ON public.purchases
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 11.7 PURCHASE_ITEMS POLICIES
DROP POLICY IF EXISTS "purchase_items_select_policy" ON public.purchase_items;
CREATE POLICY "purchase_items_select_policy"
    ON public.purchase_items
    FOR SELECT
    TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "purchase_items_insert_policy" ON public.purchase_items;
CREATE POLICY "purchase_items_insert_policy"
    ON public.purchase_items
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "purchase_items_update_policy" ON public.purchase_items;
CREATE POLICY "purchase_items_update_policy"
    ON public.purchase_items
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "purchase_items_delete_policy" ON public.purchase_items;
CREATE POLICY "purchase_items_delete_policy"
    ON public.purchase_items
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 11.8 BILLS POLICIES
DROP POLICY IF EXISTS "bills_select_policy" ON public.bills;
CREATE POLICY "bills_select_policy"
    ON public.bills
    FOR SELECT
    TO authenticated
    USING (public.is_active_authenticated());

DROP POLICY IF EXISTS "bills_insert_policy" ON public.bills;
CREATE POLICY "bills_insert_policy"
    ON public.bills
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "bills_update_policy" ON public.bills;
CREATE POLICY "bills_update_policy"
    ON public.bills
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "bills_delete_policy" ON public.bills;
CREATE POLICY "bills_delete_policy"
    ON public.bills
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 11.9 BILL_ITEMS POLICIES
DROP POLICY IF EXISTS "bill_items_select_policy" ON public.bill_items;
CREATE POLICY "bill_items_select_policy"
    ON public.bill_items
    FOR SELECT
    TO authenticated
    USING (public.is_active_authenticated());

DROP POLICY IF EXISTS "bill_items_insert_policy" ON public.bill_items;
CREATE POLICY "bill_items_insert_policy"
    ON public.bill_items
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "bill_items_update_policy" ON public.bill_items;
CREATE POLICY "bill_items_update_policy"
    ON public.bill_items
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "bill_items_delete_policy" ON public.bill_items;
CREATE POLICY "bill_items_delete_policy"
    ON public.bill_items
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 11.10 BILL_PAYMENTS POLICIES
DROP POLICY IF EXISTS "bill_payments_select_policy" ON public.bill_payments;
CREATE POLICY "bill_payments_select_policy"
    ON public.bill_payments
    FOR SELECT
    TO authenticated
    USING (public.is_active_authenticated());

DROP POLICY IF EXISTS "bill_payments_insert_policy" ON public.bill_payments;
CREATE POLICY "bill_payments_insert_policy"
    ON public.bill_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "bill_payments_update_policy" ON public.bill_payments;
CREATE POLICY "bill_payments_update_policy"
    ON public.bill_payments
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "bill_payments_delete_policy" ON public.bill_payments;
CREATE POLICY "bill_payments_delete_policy"
    ON public.bill_payments
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 11.11 CUSTOMER_TRANSACTIONS POLICIES
DROP POLICY IF EXISTS "customer_transactions_select_policy" ON public.customer_transactions;
CREATE POLICY "customer_transactions_select_policy"
    ON public.customer_transactions
    FOR SELECT
    TO authenticated
    USING (public.is_active_authenticated());

DROP POLICY IF EXISTS "customer_transactions_insert_policy" ON public.customer_transactions;
CREATE POLICY "customer_transactions_insert_policy"
    ON public.customer_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "customer_transactions_update_policy" ON public.customer_transactions;
CREATE POLICY "customer_transactions_update_policy"
    ON public.customer_transactions
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "customer_transactions_delete_policy" ON public.customer_transactions;
CREATE POLICY "customer_transactions_delete_policy"
    ON public.customer_transactions
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 11.12 EXPENSES POLICIES
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
CREATE POLICY "expenses_select_policy"
    ON public.expenses
    FOR SELECT
    TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
CREATE POLICY "expenses_insert_policy"
    ON public.expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
CREATE POLICY "expenses_update_policy"
    ON public.expenses
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;
CREATE POLICY "expenses_delete_policy"
    ON public.expenses
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 12. FOREIGN KEY INDEXES & QUERY OPTIMIZATION
-- ----------------------------------------------------------------------------
-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_category_id ON public.categories(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_status ON public.categories(status);

-- Distributors indexes
CREATE INDEX IF NOT EXISTS idx_distributors_distributor_code ON public.distributors(distributor_code);
CREATE INDEX IF NOT EXISTS idx_distributors_name ON public.distributors(name);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_product_id ON public.products(product_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- Purchases indexes
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_id ON public.purchases(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchases_distributor_id ON public.purchases(distributor_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.purchases(created_at DESC);

-- Purchase items indexes
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON public.purchase_items(product_id);

-- Bills indexes
CREATE INDEX IF NOT EXISTS idx_bills_bill_id ON public.bills(bill_id);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON public.bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills(created_at DESC);

-- Bill items indexes
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_product_id ON public.bill_items(product_id);

-- Bill payments indexes
CREATE INDEX IF NOT EXISTS idx_bill_payments_bill_id ON public.bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_mode ON public.bill_payments(mode);
CREATE INDEX IF NOT EXISTS idx_bill_payments_created_at ON public.bill_payments(created_at DESC);

-- Customer transactions indexes
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_id ON public.customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_bill_id ON public.customer_transactions(bill_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_calculation ON public.customer_transactions(calculation);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_created_at ON public.customer_transactions(created_at DESC);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_mode_type ON public.expenses(mode_type);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses(created_at DESC);

-- ============================================================================
-- VERIFICATION QUERIES (RUN IN SUPABASE SQL EDITOR AFTER EXECUTION)
-- ============================================================================
-- 1. Check all public tables:
--    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
--
-- 2. Check RLS enabled on all tables:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--
-- 3. Check all custom ENUMs:
--    SELECT typname, enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enum_typid = pg_type.oid ORDER BY typname, enumsortorder;
--
-- 4. Check all triggers:
--    SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';
--
-- 5. Check Auth Trigger:
--    SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
-- ============================================================================
