-- Migration: Create Financial Management System Tables
-- This adds comprehensive financial management capabilities

-- 1. Staff/Employee Management Table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'coach', 'admin', 'maintenance', 'other'
  salary NUMERIC(10,2) NOT NULL,
  payment_frequency TEXT NOT NULL, -- 'weekly', 'biweekly', 'monthly'
  hire_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff Payment History
CREATE TABLE IF NOT EXISTS staff_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- emoji or icon identifier
  color TEXT, -- hex color for UI
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Recurring Expenses Configuration
CREATE TABLE IF NOT EXISTS expense_recurrence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  frequency TEXT NOT NULL, -- 'weekly', 'monthly', 'yearly'
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT NOT NULL,
  vendor TEXT,
  is_active BOOLEAN DEFAULT true,
  last_generated_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enhance existing expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES expense_recurrence(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_payments_staff_id ON staff_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payments_date ON staff_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expense_recurrence_active ON expense_recurrence(is_active);

-- Row Level Security Policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_recurrence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON staff FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON staff_payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON expense_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON expense_recurrence FOR ALL TO authenticated USING (true);

-- Insert default expense categories
INSERT INTO expense_categories (name, description, icon, color) VALUES
('Alquiler', 'Alquiler de instalaciones deportivas', '🏢', '#3B82F6'),
('Servicios', 'Agua, luz, internet, etc.', '💡', '#10B981'),
('Mantenimiento', 'Reparaciones y mantenimiento de instalaciones', '🔧', '#F59E0B'),
('Equipamiento', 'Balones, conos, uniformes, etc.', '⚽', '#8B5CF6'),
('Marketing', 'Publicidad y promoción', '📣', '#EC4899'),
('Transporte', 'Combustible y transporte', '🚗', '#6366F1'),
('Administrativo', 'Papelería, software, etc.', '📋', '#64748B'),
('Otros', 'Gastos varios no categorizados', '📦', '#94A3B8')
ON CONFLICT (name) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for staff table
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
