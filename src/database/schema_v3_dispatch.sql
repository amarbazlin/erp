-- =============================================
-- Forgera Dispatch — Order Tracking Schema v3
-- Run AFTER schema_v2.sql in Supabase SQL Editor
-- =============================================

-- ── Dispatch trips (group multiple orders into one trip) ─────────────────────
CREATE TABLE IF NOT EXISTS dispatch_trips (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_number     TEXT UNIQUE NOT NULL,
    trip_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    driver_name     TEXT,
    vehicle_number  TEXT,
    notes           TEXT,
    status          TEXT DEFAULT 'planned'
                    CHECK (status IN ('planned','in_progress','completed','cancelled')),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Extend deliveries for dispatch tracking ────────────────────────────────────
ALTER TABLE deliveries
    ADD COLUMN IF NOT EXISTS dispatch_trip_id   BIGINT REFERENCES dispatch_trips(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS packed_at          TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS proof_confirmed    BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS proof_signature_url TEXT,
    ADD COLUMN IF NOT EXISTS updated_by         UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS status_updated_at  TIMESTAMP WITH TIME ZONE;

-- Expand status values: pending → packed → dispatched → delivered | returned
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE deliveries ADD CONSTRAINT deliveries_status_check
    CHECK (status IN ('pending','packed','dispatched','delivered','returned','failed','cancelled'));

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dispatch_trips_date   ON dispatch_trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_trip       ON deliveries(dispatch_trip_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_packed     ON deliveries(packed_at);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE dispatch_trips ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dispatch_trips' AND policyname = 'auth_all_dispatch_trips'
  ) THEN
    CREATE POLICY "auth_all_dispatch_trips" ON dispatch_trips FOR ALL TO authenticated USING (true);
  END IF;
END $$;
