-- Run once in the existing project's Supabase SQL Editor. Safe to rerun.
-- Requires the existing ERP expenses table. Does not replace existing data.
BEGIN;
CREATE TABLE IF NOT EXISTS public.income_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL CHECK (length(trim(category)) > 0),
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS income_entries_date_idx ON public.income_entries(income_date);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON public.expenses(expense_date);
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_entries TO authenticated;
DROP POLICY IF EXISTS income_entries_authenticated ON public.income_entries;
CREATE POLICY income_entries_authenticated ON public.income_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Finance follows the app's shared access model: all signed-in users.
-- Preserve any existing expenses policies; do not expose finance to anonymous users.
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
DROP POLICY IF EXISTS finance_expenses_authenticated ON public.expenses;
CREATE POLICY finance_expenses_authenticated ON public.expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
COMMIT;
