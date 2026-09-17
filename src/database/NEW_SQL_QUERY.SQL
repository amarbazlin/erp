-- =========================================================
-- SWEET RESTAURANT ERP DATABASE
-- PostgreSQL / Supabase
-- =========================================================

-- =========================================================
-- 1. USERS
-- =========================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    role VARCHAR(30) NOT NULL DEFAULT 'cashier'
        CHECK (role IN ('admin', 'manager', 'cashier')),

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================================
-- 2. CUSTOMERS
-- =========================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    customer_code VARCHAR(50) UNIQUE,

    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(255),

    address TEXT,

    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC(12,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================================
-- 3. RAW MATERIAL CATEGORIES
-- =========================================================

CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================================
-- 4. RAW MATERIAL INVENTORY
-- =========================================================
-- Examples:
-- Chocolate
-- Kunafa
-- Milk
-- Sugar
-- Cream
-- Pistachio
--
-- All quantities are stored in grams.
-- Price is stored per kilogram.
-- =========================================================

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_id UUID REFERENCES inventory_categories(id)
        ON DELETE SET NULL,

    name VARCHAR(150) NOT NULL,
    sku VARCHAR(100) UNIQUE,

    unit VARCHAR(20) NOT NULL DEFAULT 'g'
        CHECK (unit IN ('g', 'ml', 'unit')),

    -- Cost of 1 KG / 1 L / 1 UNIT
    cost_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Current stock in grams/ml/units
    current_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,

    -- Alert when stock reaches this quantity
    low_stock_threshold NUMERIC(12,3) DEFAULT 0,

    supplier_name VARCHAR(150),
    supplier_phone VARCHAR(30),

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT positive_cost
        CHECK (cost_per_unit >= 0),

    CONSTRAINT positive_quantity
        CHECK (current_quantity >= 0)
);


-- =========================================================
-- 5. INVENTORY STOCK TRANSACTIONS
-- =========================================================
-- Keeps history of stock additions/removals.
-- =========================================================

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    inventory_item_id UUID NOT NULL
        REFERENCES inventory_items(id)
        ON DELETE CASCADE,

    transaction_type VARCHAR(30) NOT NULL
        CHECK (
            transaction_type IN (
                'purchase',
                'sale',
                'adjustment',
                'waste',
                'return'
            )
        ),

    quantity NUMERIC(12,3) NOT NULL,

    cost_per_unit NUMERIC(12,2),

    reference_id UUID,

    notes TEXT,

    created_by UUID REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================================
-- 6. PRODUCT CATEGORIES
-- =========================================================

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================================
-- 7. PRODUCTS / SELLABLE SWEETS
-- =========================================================
-- These are what appear on the POS sales screen.
--
-- Example:
-- Chocolate Kunafa Cup
-- Pistachio Kunafa
-- Lotus Cheesecake
-- Baklava
-- =========================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_id UUID REFERENCES product_categories(id)
        ON DELETE SET NULL,

    name VARCHAR(150) NOT NULL,
    sku VARCHAR(100) UNIQUE,

    description TEXT,

    image_url TEXT,

    -- Automatically calculated from recipe
    calculated_cost NUMERIC(12,2) DEFAULT 0,

    -- Selling price entered by admin
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT positive_selling_price
        CHECK (selling_price >= 0)
);


-- =========================================================
-- 8. PRODUCT RECIPES
-- =========================================================
-- Connects finished products to raw materials.
--
-- Example:
--
-- Chocolate Kunafa:
-- Chocolate = 80g
-- Kunafa = 120g
-- Cream = 50g
--
-- The cost is calculated from these quantities.
-- =========================================================

CREATE TABLE product_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

    inventory_item_id UUID NOT NULL
        REFERENCES inventory_items(id)
        ON DELETE RESTRICT,

    quantity_required NUMERIC(12,3) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(product_id, inventory_item_id),

    CONSTRAINT positive_recipe_quantity
        CHECK (quantity_required > 0)
);


-- =========================================================
-- 9. SALES
-- =========================================================

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    invoice_number VARCHAR(50) UNIQUE NOT NULL,

    customer_id UUID REFERENCES customers(id)
        ON DELETE SET NULL,

    cashier_id UUID REFERENCES users(id)
        ON DELETE SET NULL,

    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,

    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash'
        CHECK (
            payment_method IN (
                'cash',
                'card',
                'bank_transfer',
                'online'
            )
        ),

    payment_status VARCHAR(30) NOT NULL DEFAULT 'paid'
        CHECK (
            payment_status IN (
                'pending',
                'paid',
                'refunded',
                'partially_refunded'
            )
        ),

    sale_status VARCHAR(30) NOT NULL DEFAULT 'completed'
        CHECK (
            sale_status IN (
                'draft',
                'completed',
                'cancelled'
            )
        ),

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT positive_sale_values
        CHECK (
            subtotal >= 0
            AND discount >= 0
            AND tax >= 0
            AND total >= 0
        )
);


-- =========================================================
-- 10. SALE ITEMS
-- =========================================================

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sale_id UUID NOT NULL
        REFERENCES sales(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES products(id)
        ON DELETE RESTRICT,

    quantity INTEGER NOT NULL DEFAULT 1,

    unit_price NUMERIC(12,2) NOT NULL,

    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,

    total_price NUMERIC(12,2) NOT NULL,

    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT positive_sale_quantity
        CHECK (quantity > 0)
);


-- =========================================================
-- 11. EXPENSES
-- =========================================================

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category VARCHAR(100) NOT NULL,

    description TEXT,

    amount NUMERIC(12,2) NOT NULL,

    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,

    created_by UUID REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT positive_expense
        CHECK (amount >= 0)
);


-- =========================================================
-- 12. DAILY ANALYTICS
-- =========================================================

CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    analytics_date DATE UNIQUE NOT NULL,

    total_sales NUMERIC(12,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_items_sold INTEGER DEFAULT 0,

    total_cost NUMERIC(12,2) DEFAULT 0,
    gross_profit NUMERIC(12,2) DEFAULT 0,

    total_expenses NUMERIC(12,2) DEFAULT 0,
    net_profit NUMERIC(12,2) DEFAULT 0,

    cash_sales NUMERIC(12,2) DEFAULT 0,
    card_sales NUMERIC(12,2) DEFAULT 0,
    online_sales NUMERIC(12,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================================
-- 13. PRODUCT SALES ANALYTICS
-- =========================================================

CREATE TABLE product_sales_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

    analytics_date DATE NOT NULL,

    quantity_sold INTEGER DEFAULT 0,

    revenue NUMERIC(12,2) DEFAULT 0,

    cost NUMERIC(12,2) DEFAULT 0,

    profit NUMERIC(12,2) DEFAULT 0,

    UNIQUE(product_id, analytics_date)
);


-- =========================================================
-- 14. INDEXES
-- =========================================================

CREATE INDEX idx_inventory_name
ON inventory_items(name);

CREATE INDEX idx_inventory_category
ON inventory_items(category_id);

CREATE INDEX idx_inventory_transactions_item
ON inventory_transactions(inventory_item_id);

CREATE INDEX idx_products_name
ON products(name);

CREATE INDEX idx_products_category
ON products(category_id);

CREATE INDEX idx_product_recipes_product
ON product_recipes(product_id);

CREATE INDEX idx_sales_date
ON sales(created_at);

CREATE INDEX idx_sales_customer
ON sales(customer_id);

CREATE INDEX idx_sale_items_sale
ON sale_items(sale_id);

CREATE INDEX idx_sale_items_product
ON sale_items(product_id);


-- =========================================================
-- 15. VIEW:
-- PRODUCT COST
-- =========================================================

CREATE OR REPLACE VIEW product_cost_view AS
SELECT
    p.id AS product_id,
    p.name AS product_name,

    COALESCE(
        SUM(
            pr.quantity_required
            *
            (ii.cost_per_unit / 1000)
        ),
        0
    ) AS calculated_cost,

    p.selling_price,

    p.selling_price -
    COALESCE(
        SUM(
            pr.quantity_required
            *
            (ii.cost_per_unit / 1000)
        ),
        0
    ) AS estimated_profit

FROM products p

LEFT JOIN product_recipes pr
    ON p.id = pr.product_id

LEFT JOIN inventory_items ii
    ON pr.inventory_item_id = ii.id

GROUP BY
    p.id,
    p.name,
    p.selling_price;


-- =========================================================
-- 16. VIEW:
-- PRODUCT AVAILABLE STOCK
-- =========================================================
-- Calculates how many complete units of each product
-- can currently be produced based on available ingredients.
-- =========================================================

CREATE OR REPLACE VIEW product_stock_view AS
SELECT
    p.id AS product_id,
    p.name AS product_name,

    COALESCE(
        MIN(
            FLOOR(
                ii.current_quantity /
                NULLIF(pr.quantity_required, 0)
            )
        ),
        0
    )::INTEGER AS available_stock

FROM products p

LEFT JOIN product_recipes pr
    ON p.id = pr.product_id

LEFT JOIN inventory_items ii
    ON pr.inventory_item_id = ii.id

GROUP BY
    p.id,
    p.name;


-- =========================================================
-- 17. PRODUCT POS VIEW
-- =========================================================

CREATE OR REPLACE VIEW pos_products_view AS
SELECT
    p.id,
    p.name,
    p.sku,
    p.image_url,
    p.selling_price,
    p.calculated_cost,
    p.category_id,

    COALESCE(ps.available_stock, 0) AS available_stock,

    CASE
        WHEN COALESCE(ps.available_stock, 0) > 0
        THEN TRUE
        ELSE FALSE
    END AS in_stock

FROM products p

LEFT JOIN product_stock_view ps
    ON p.id = ps.product_id

WHERE p.is_active = TRUE;


-- =========================================================
-- 18. FUNCTION:
-- CALCULATE PRODUCT COST
-- =========================================================

CREATE OR REPLACE FUNCTION calculate_product_cost(
    p_product_id UUID
)
RETURNS NUMERIC
LANGUAGE SQL
AS $$
    SELECT COALESCE(
        SUM(
            pr.quantity_required
            *
            (ii.cost_per_unit / 1000)
        ),
        0
    )
    FROM product_recipes pr
    JOIN inventory_items ii
        ON ii.id = pr.inventory_item_id
    WHERE pr.product_id = p_product_id;
$$;


-- =========================================================
-- 19. FUNCTION:
-- UPDATE PRODUCT COST
-- =========================================================

CREATE OR REPLACE FUNCTION update_product_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_product UUID;
BEGIN

    IF TG_OP = 'DELETE' THEN
        target_product := OLD.product_id;
    ELSE
        target_product := NEW.product_id;
    END IF;

    UPDATE products
    SET
        calculated_cost =
            calculate_product_cost(target_product),
        updated_at = NOW()
    WHERE id = target_product;

    RETURN COALESCE(NEW, OLD);
END;
$$;


-- =========================================================
-- 20. TRIGGER:
-- UPDATE COST WHEN RECIPE CHANGES
-- =========================================================

CREATE TRIGGER trigger_update_product_cost
AFTER INSERT OR UPDATE OR DELETE
ON product_recipes
FOR EACH ROW
EXECUTE FUNCTION update_product_cost();


-- =========================================================
-- 21. FUNCTION:
-- INVENTORY STOCK UPDATE
-- =========================================================

CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.transaction_type IN ('purchase', 'return') THEN

        UPDATE inventory_items
        SET
            current_quantity =
                current_quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;

    ELSIF NEW.transaction_type IN ('sale', 'waste') THEN

        UPDATE inventory_items
        SET
            current_quantity =
                GREATEST(
                    0,
                    current_quantity - NEW.quantity
                ),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;

    ELSIF NEW.transaction_type = 'adjustment' THEN

        UPDATE inventory_items
        SET
            current_quantity = NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;

    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trigger_inventory_quantity
AFTER INSERT
ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_inventory_quantity();


-- =========================================================
-- 22. SAMPLE CATEGORIES
-- =========================================================

INSERT INTO inventory_categories (name, description)
VALUES
('Chocolate', 'Chocolate and chocolate-based ingredients'),
('Kunafa', 'Kunafa related ingredients'),
('Dairy', 'Milk, cream, cheese and dairy products'),
('Nuts', 'Pistachio, almond, cashew and other nuts'),
('Sugar & Sweeteners', 'Sugar and sweetening ingredients'),
('Packaging', 'Cups, boxes, bags and packaging materials'),
('Other Ingredients', 'Other restaurant ingredients');


INSERT INTO product_categories (name, description)
VALUES
('Kunafa', 'Kunafa desserts'),
('Chocolate', 'Chocolate desserts'),
('Cakes', 'Cake products'),
('Baklava', 'Baklava and pastries'),
('Drinks', 'Drinks and beverages'),
('Specials', 'Special sweet products');


-- =========================================================
-- 23. EXAMPLE INVENTORY
-- =========================================================

INSERT INTO inventory_items
(
    name,
    sku,
    category_id,
    unit,
    cost_per_unit,
    current_quantity,
    low_stock_threshold
)
SELECT
    'Chocolate',
    'RM-CHOC-001',
    id,
    'g',
    2400,
    10000,
    2000
FROM inventory_categories
WHERE name = 'Chocolate';


INSERT INTO inventory_items
(
    name,
    sku,
    category_id,
    unit,
    cost_per_unit,
    current_quantity,
    low_stock_threshold
)
SELECT
    'Kunafa',
    'RM-KUNAFA-001',
    id,
    'g',
    1800,
    10000,
    2000
FROM inventory_categories
WHERE name = 'Kunafa';


-- =========================================================
-- 24. SAMPLE PRODUCT
-- =========================================================

INSERT INTO products
(
    name,
    sku,
    category_id,
    description,
    selling_price
)
SELECT
    'Chocolate Kunafa Cup',
    'SWEET-001',
    id,
    'Chocolate and kunafa dessert cup',
    950
FROM product_categories
WHERE name = 'Kunafa';


-- =========================================================
-- 25. EXAMPLE PRODUCT RECIPE
-- =========================================================
-- 80g Chocolate
-- 120g Kunafa
--
-- Chocolate:
-- 80 × (2400 / 1000) = Rs.192
--
-- Kunafa:
-- 120 × (1800 / 1000) = Rs.216
--
-- Total raw-material cost = Rs.408
-- Selling price = Rs.950
-- Estimated gross profit = Rs.542
-- =========================================================


INSERT INTO product_recipes
(
    product_id,
    inventory_item_id,
    quantity_required
)
SELECT
    p.id,
    i.id,
    80
FROM products p
CROSS JOIN inventory_items i
WHERE p.sku = 'SWEET-001'
AND i.sku = 'RM-CHOC-001';


INSERT INTO product_recipes
(
    product_id,
    inventory_item_id,
    quantity_required
)
SELECT
    p.id,
    i.id,
    120
FROM products p
CROSS JOIN inventory_items i
WHERE p.sku = 'SWEET-001'
AND i.sku = 'RM-KUNAFA-001';


-- =========================================================
-- 26. USEFUL DASHBOARD VIEW
-- =========================================================

CREATE OR REPLACE VIEW dashboard_summary AS
SELECT

    (
        SELECT COALESCE(SUM(total), 0)
        FROM sales
        WHERE sale_status = 'completed'
        AND DATE(created_at) = CURRENT_DATE
    ) AS today_sales,

    (
        SELECT COUNT(*)
        FROM sales
        WHERE sale_status = 'completed'
        AND DATE(created_at) = CURRENT_DATE
    ) AS today_orders,

    (
        SELECT COALESCE(SUM(total_cost), 0)
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE s.sale_status = 'completed'
        AND DATE(s.created_at) = CURRENT_DATE
    ) AS today_cost,

    (
        SELECT COALESCE(SUM(total_price - total_cost), 0)
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE s.sale_status = 'completed'
        AND DATE(s.created_at) = CURRENT_DATE
    ) AS today_gross_profit,

    (
        SELECT COUNT(*)
        FROM inventory_items
        WHERE is_active = TRUE
        AND current_quantity <= low_stock_threshold
    ) AS low_stock_items,

    (
        SELECT COUNT(*)
        FROM products
        WHERE is_active = TRUE
    ) AS total_products;


-- =========================================================
-- 27. KEEP PRODUCT COST IN SYNC WHEN A RAW MATERIAL COST CHANGES
-- =========================================================
-- The recipe trigger (section 20) only recalculates a product when the
-- product_recipes rows change. If an admin edits an inventory item's
-- cost_per_unit, the cached products.calculated_cost must be refreshed too.
--
-- NOTE: if your database was created before this section was added, run
-- everything from this line down to the end once in the SQL editor.
-- =========================================================

CREATE OR REPLACE FUNCTION refresh_product_costs()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE products p
    SET
        calculated_cost = calculate_product_cost(p.id),
        updated_at = NOW()
    WHERE EXISTS (
        SELECT 1 FROM product_recipes pr WHERE pr.product_id = p.id
    );
END;
$$;


CREATE OR REPLACE FUNCTION refresh_product_costs_on_item_cost_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.cost_per_unit IS DISTINCT FROM OLD.cost_per_unit THEN
        PERFORM refresh_product_costs();
    END IF;
    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trigger_refresh_product_costs_on_item_cost ON inventory_items;

CREATE TRIGGER trigger_refresh_product_costs_on_item_cost
AFTER UPDATE OF cost_per_unit
ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION refresh_product_costs_on_item_cost_change();


-- =========================================================
-- 28. STORAGE BUCKET FOR PRODUCT IMAGES
-- =========================================================
-- The React app uploads finished-product photos to a public bucket called
-- "product-images". If this section is not run, the app falls back to storing
-- a compressed inline image, so uploads still work.
-- =========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', TRUE)
ON CONFLICT (id) DO NOTHING;


DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');


DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
CREATE POLICY "product_images_insert"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'product-images');


DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
CREATE POLICY "product_images_update"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'product-images');


DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'product-images');