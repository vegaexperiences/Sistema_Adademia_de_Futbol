-- Create table to store PagueloFacil order information temporarily
-- This stores enrollment data that might not be preserved in callback URL

CREATE TABLE IF NOT EXISTS paguelofacil_orders (
  order_id TEXT PRIMARY KEY, -- Full orderId from enrollment
  enrollment_data JSONB, -- Enrollment data (tutor info, players, etc.)
  amount DECIMAL(10, 2),
  type TEXT NOT NULL CHECK (type IN ('payment', 'enrollment')), -- payment or enrollment
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours') -- Auto-cleanup after 48 hours
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_paguelofacil_orders_order_id ON paguelofacil_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_paguelofacil_orders_created_at ON paguelofacil_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_paguelofacil_orders_expires_at ON paguelofacil_orders(expires_at);

-- Enable RLS
ALTER TABLE paguelofacil_orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read/write
CREATE POLICY "Allow authenticated users to manage paguelofacil orders"
  ON paguelofacil_orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to automatically clean up expired orders
CREATE OR REPLACE FUNCTION cleanup_expired_paguelofacil_orders()
RETURNS void AS $$
BEGIN
  DELETE FROM paguelofacil_orders WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

