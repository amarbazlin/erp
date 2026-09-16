-- =============================================
-- SEED DATA for HardwareAI System
-- Run this after schema.sql in Supabase SQL editor
-- =============================================

-- Categories
INSERT INTO categories (name, description) VALUES
  ('Electrical',        'Switches, sockets, wiring, conduits'),
  ('Plumbing',          'Pipes, fittings, valves, taps'),
  ('Roofing',           'Roof sheets, fasteners, gutters'),
  ('Building Materials','Cement, sand, bricks, aggregates'),
  ('Hardware',          'Nuts, bolts, screws, nails'),
  ('Tools',             'Hand tools, power tools, accessories'),
  ('Paint & Finishes',  'Paints, primers, brushes, rollers'),
  ('Safety Equipment',  'Helmets, gloves, boots, masks'),
  ('PVC & Fittings',    'PVC pipes, elbows, tees, reducers'),
  ('Adhesives & Sealants', 'Epoxy, silicone, PVC cement');

-- Suppliers
INSERT INTO suppliers (supplier_name, contact_person, phone, email, address, average_delivery_days, status) VALUES
  ('Lesso Lanka Pvt Ltd',     'Kamal Perera',    '0112-334455', 'kamal@lesso.lk',      'Colombo 10',     3, 'active'),
  ('ABC Hardware Distributors','Nimal Silva',    '0912-223344', 'nimal@abchard.lk',    'Galle',          4, 'active'),
  ('Lanka Electrical Supplies','Suresh Mendis',  '0112-556677', 'suresh@lesupply.lk',  'Colombo 03',     2, 'active'),
  ('Matara Building Supplies', 'Chaminda Ratne', '0412-234567', 'chaminda@mbs.lk',     'Matara',         1, 'active'),
  ('National Hardware (Pvt)', 'Ranjith Fernando','0112-778899', 'ranjith@national.lk', 'Colombo 06',     5, 'active'),
  ('Southern Traders',         'Priya Jayaweera', '0412-345678', 'priya@southern.lk',  'Matara',         2, 'active');

-- Products
INSERT INTO products (product_code, product_name, category_id, supplier_id, quantity, reorder_level, buying_price, selling_price, unit, status) VALUES
  -- Electrical (category 1)
  ('EL-SW-001', 'Lesso 1-Gang Switch',          1, 1, 85,  20, 185.00,  240.00, 'pcs', 'active'),
  ('EL-SW-002', 'Lesso 2-Gang Switch',          1, 1, 42,  15, 245.00,  320.00, 'pcs', 'active'),
  ('EL-SW-003', 'Lesso 3-Gang Switch',          1, 1, 28,  10, 310.00,  410.00, 'pcs', 'active'),
  ('EL-SK-001', 'Lesso 1-Gang Socket 13A',      1, 1, 0,   15, 280.00,  370.00, 'pcs', 'active'),
  ('EL-SK-002', 'Lesso 2-Gang Socket 13A',      1, 1, 5,   15, 350.00,  460.00, 'pcs', 'active'),
  ('EL-CD-001', 'PVC Conduit 20mm 3m',          1, 1, 120, 30, 95.00,   135.00, 'pcs', 'active'),
  ('EL-CD-002', 'PVC Conduit 25mm 3m',          1, 1, 90,  25, 125.00,  170.00, 'pcs', 'active'),
  ('EL-SB-001', 'DB Sunbox 6-Way',              1, 3, 15,  5,  1850.00, 2400.00,'pcs', 'active'),
  ('EL-SB-002', 'DB Sunbox 12-Way',             1, 3, 8,   5,  2800.00, 3600.00,'pcs', 'active'),
  ('EL-TK-001', 'PVC Trunking 25x16mm 2m',     1, 1, 60,  20, 145.00,  195.00, 'pcs', 'active'),

  -- Plumbing (category 2)
  ('PL-PP-001', 'UPVC Pipe 1/2" 6m',            2, 2, 45,  15, 320.00,  420.00, 'pcs', 'active'),
  ('PL-PP-002', 'UPVC Pipe 3/4" 6m',            2, 2, 35,  10, 450.00,  590.00, 'pcs', 'active'),
  ('PL-PP-003', 'UPVC Pipe 1" 6m',              2, 2, 0,   10, 620.00,  800.00, 'pcs', 'active'),
  ('PL-EL-001', 'Elbow 1/2" 90deg',             2, 2, 200, 50, 28.00,   40.00,  'pcs', 'active'),
  ('PL-TE-001', 'Tee Joint 1/2"',               2, 2, 150, 40, 35.00,   50.00,  'pcs', 'active'),

  -- Hardware (category 5)
  ('HW-NT-001', 'Nut M10 Galvanised',           5, 4, 500, 100,3.50,    6.00,   'pcs', 'active'),
  ('HW-BT-001', 'Bolt M10x60 Galvanised',       5, 4, 350, 100,8.00,    13.00,  'pcs', 'active'),
  ('HW-SC-001', 'Wood Screw 3x50mm (box 100)',  5, 4, 80,  20, 185.00,  250.00, 'box', 'active'),
  ('HW-NL-001', 'Wire Nail 3" (kg)',             5, 4, 3,   10, 280.00,  370.00, 'kg',  'active'),

  -- Tools (category 6)
  ('TL-HM-001', 'Claw Hammer 16oz',             6, 5, 22,  8,  680.00,  900.00, 'pcs', 'active'),
  ('TL-SP-001', 'Spanner Set 8pc',              6, 5, 12,  5,  1850.00, 2400.00,'set', 'active'),
  ('TL-DL-001', 'Electric Drill 650W',          6, 5, 4,   3,  5200.00, 7000.00,'pcs', 'active'),

  -- Paint (category 7)
  ('PT-LP-001', 'Nippon Paint Interior 4L',     7, 6, 28,  10, 2400.00, 3100.00,'tin', 'active'),
  ('PT-LP-002', 'Nippon Paint Exterior 4L',     7, 6, 18,  8,  2800.00, 3600.00,'tin', 'active'),
  ('PT-BR-001', 'Paint Brush 4"',               7, 6, 45,  15, 145.00,  195.00, 'pcs', 'active'),

  -- PVC (category 9)
  ('PV-PP-001', 'Lesso PVC Pipe 20mm 4m',       9, 1, 95,  25, 185.00,  245.00, 'pcs', 'active'),
  ('PV-PP-002', 'Lesso PVC Pipe 25mm 4m',       9, 1, 72,  20, 245.00,  320.00, 'pcs', 'active'),
  ('PV-EL-001', 'Lesso Elbow 20mm 90deg',       9, 1, 180, 50, 18.00,   28.00,  'pcs', 'active'),
  ('PV-TE-001', 'Lesso Tee 20mm',               9, 1, 145, 40, 22.00,   35.00,  'pcs', 'active');

-- Sample alerts for low stock products
INSERT INTO alerts (product_id, alert_type, message, severity, resolved) VALUES
  (4,  'out_of_stock', 'Lesso 1-Gang Socket 13A is out of stock. Reorder immediately.',             'critical', false),
  (5,  'low_stock',    'Lesso 2-Gang Socket 13A is critically low (5 units). Reorder level: 15.',   'high',     false),
  (13, 'out_of_stock', 'UPVC Pipe 1" 6m is out of stock.',                                          'critical', false),
  (19, 'low_stock',    'Wire Nail 3" (kg) has only 3 units left. Reorder level: 10.',               'high',     false);

-- Sample sale
INSERT INTO sales (invoice_number, total_amount, payment_method, created_at) VALUES
  ('INV-00000001', 11850.00, 'cash',         NOW() - INTERVAL '1 day'),
  ('INV-00000002', 4250.00,  'bank_transfer', NOW() - INTERVAL '2 days'),
  ('INV-00000003', 8900.00,  'card',          NOW() - INTERVAL '3 days'),
  ('INV-00000004', 2100.00,  'cash',          NOW() - INTERVAL '5 days'),
  ('INV-00000005', 15600.00, 'cash',          NOW() - INTERVAL '7 days');
