-- =============================================
-- HardwareAI System — Supabase Schema
-- Run in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    supplier_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    average_delivery_days INTEGER DEFAULT 3,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_code TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    buying_price NUMERIC(12,2) NOT NULL,
    selling_price NUMERIC(12,2) NOT NULL,
    unit TEXT DEFAULT 'pcs',
    last_restocked TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale','purchase','adjustment','return','damage')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER,
    new_stock INTEGER,
    reference_id BIGINT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash','card','bank_transfer','cheque','credit')),
    sold_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
    invoice_number TEXT,
    total_amount NUMERIC(12,2),
    purchased_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_id BIGINT REFERENCES purchases(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(12,2),
    subtotal NUMERIC(12,2)
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock','out_of_stock','price_anomaly','demand_spike','dead_stock','reorder')),
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier    ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_status      ON products(status);
CREATE INDEX IF NOT EXISTS idx_sales_date           ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale      ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product   ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product    ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_type       ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_alerts_product       ON alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved      ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier   ON purchases(supplier_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                 ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read everything
CREATE POLICY "auth_read_all" ON products               FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_all" ON categories             FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_all" ON suppliers              FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_all" ON sales                  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_all" ON sale_items             FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_all" ON purchases              FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_all" ON purchase_items         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_all" ON inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_all" ON alerts                 FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_own" ON users                  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Authenticated users can insert/update/delete
CREATE POLICY "auth_write" ON products               FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_write" ON categories             FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_write" ON suppliers              FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_write" ON sales                  FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_write" ON sale_items             FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_write" ON purchases              FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_write" ON purchase_items         FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_write" ON inventory_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_write" ON alerts                 FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_write_own" ON users              FOR UPDATE TO authenticated USING (auth.uid() = id);
