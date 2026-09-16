-- =============================================
-- HardwareAI Schema v2 — New Feature Tables
-- Run this AFTER schema.sql in Supabase SQL Editor
-- =============================================

-- ── Locations / Branches ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    address     TEXT,
    phone       TEXT,
    is_default  BOOLEAN DEFAULT FALSE,
    status      TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock per location (extends existing products table)
CREATE TABLE IF NOT EXISTS location_stock (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id  BIGINT REFERENCES products(id) ON DELETE CASCADE,
    location_id BIGINT REFERENCES locations(id) ON DELETE CASCADE,
    quantity    INTEGER DEFAULT 0,
    UNIQUE (product_id, location_id)
);

-- Stock transfers between locations
CREATE TABLE IF NOT EXISTS stock_transfers (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    from_location_id BIGINT REFERENCES locations(id),
    to_location_id  BIGINT REFERENCES locations(id),
    transferred_by  UUID REFERENCES users(id),
    notes           TEXT,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transfer_id     BIGINT REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id      BIGINT REFERENCES products(id),
    quantity        INTEGER NOT NULL
);

-- ── Customers (business's customers, not users) ───────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    customer_type   TEXT DEFAULT 'retail' CHECK (customer_type IN ('retail','contractor','wholesale','vip')),
    credit_limit    NUMERIC(12,2) DEFAULT 0,
    current_balance NUMERIC(12,2) DEFAULT 0,   -- positive = they owe us
    price_tier_id   BIGINT,
    notes           TEXT,
    status          TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer payment history (credit repayments)
CREATE TABLE IF NOT EXISTS customer_payments (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    amount      NUMERIC(12,2) NOT NULL,
    method      TEXT,
    notes       TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Price tiers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_tiers (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             TEXT NOT NULL UNIQUE,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    description      TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Per-customer, per-product price override
CREATE TABLE IF NOT EXISTS customer_price_overrides (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    product_id  BIGINT REFERENCES products(id) ON DELETE CASCADE,
    price       NUMERIC(12,2) NOT NULL,
    valid_until DATE,
    UNIQUE (customer_id, product_id)
);

-- Add FK now that price_tiers exists
ALTER TABLE customers ADD CONSTRAINT fk_price_tier
    FOREIGN KEY (price_tier_id) REFERENCES price_tiers(id) ON DELETE SET NULL;

-- ── Add customer_id and location_id to sales ──────────────────────────────────
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id  BIGINT REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS location_id  BIGINT REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_credit    BOOLEAN DEFAULT FALSE;

-- Add location_id to purchases
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL;

-- ── Returns ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    return_number   TEXT UNIQUE NOT NULL,
    original_sale_id BIGINT REFERENCES sales(id) ON DELETE SET NULL,
    customer_id     BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    return_type     TEXT DEFAULT 'sale_return' CHECK (return_type IN ('sale_return','purchase_return','damage')),
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    reason          TEXT,
    credit_note_issued BOOLEAN DEFAULT FALSE,
    processed_by    UUID REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_items (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    return_id   BIGINT REFERENCES returns(id) ON DELETE CASCADE,
    product_id  BIGINT REFERENCES products(id) ON DELETE SET NULL,
    quantity    INTEGER NOT NULL,
    unit_price  NUMERIC(12,2) NOT NULL,
    subtotal    NUMERIC(12,2) NOT NULL,
    condition   TEXT DEFAULT 'good' CHECK (condition IN ('good','damaged','defective'))
);

-- ── Deliveries ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliveries (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    delivery_number TEXT UNIQUE NOT NULL,
    sale_id         BIGINT REFERENCES sales(id) ON DELETE SET NULL,
    customer_id     BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    location_id     BIGINT REFERENCES locations(id) ON DELETE SET NULL,
    driver_name     TEXT,
    vehicle_number  TEXT,
    delivery_address TEXT,
    scheduled_date  DATE,
    delivered_at    TIMESTAMP WITH TIME ZONE,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','dispatched','delivered','failed','cancelled')),
    proof_photo_url TEXT,
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Quotations ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quote_number    TEXT UNIQUE NOT NULL,
    customer_id     BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name   TEXT,
    total_amount    NUMERIC(12,2) NOT NULL,
    valid_until     DATE,
    status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quotation_id BIGINT REFERENCES quotations(id) ON DELETE CASCADE,
    product_id  BIGINT REFERENCES products(id) ON DELETE SET NULL,
    quantity    INTEGER NOT NULL,
    unit_price  NUMERIC(12,2) NOT NULL,
    subtotal    NUMERIC(12,2) NOT NULL
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_type    ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_status  ON customers(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_date   ON deliveries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_returns_sale      ON returns(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_loc_stock_prod    ON location_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_loc_stock_loc     ON location_stock(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer    ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_location    ON sales(location_id);

-- ── RLS policies for new tables ───────────────────────────────────────────────
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tiers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_stock         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns                ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items        ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','customer_payments','price_tiers','customer_price_overrides',
    'locations','location_stock','stock_transfers','stock_transfer_items',
    'returns','return_items','deliveries','quotations','quotation_items'
  ] LOOP
    EXECUTE format('CREATE POLICY "auth_all_%s" ON %I FOR ALL TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- ── Seed: default location and price tiers ────────────────────────────────────
INSERT INTO locations (name, address, phone, is_default) VALUES
  ('Rathna Traders — Matara', 'Matara, Southern Province', '0412-XXXXXX', true),
  ('CPT — Matara',            'Matara, Southern Province', '0412-XXXXXX', false)
ON CONFLICT (name) DO NOTHING;

INSERT INTO price_tiers (name, discount_percent, description) VALUES
  ('Retail',      0,    'Walk-in customers, full price'),
  ('Contractor',  8,    'Registered contractors'),
  ('Wholesale',   15,   'Bulk buyers and resellers'),
  ('VIP',         20,   'Top accounts, custom terms')
ON CONFLICT (name) DO NOTHING;
