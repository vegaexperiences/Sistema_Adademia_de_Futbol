-- Create table to store Yappy order information temporarily
-- This is needed because Yappy truncates orderId to 15 characters,
-- losing the full playerId UUID, and doesn't send amount in callback

CREATE TABLE IF NOT EXISTS yappy_orders (
  order_id TEXT PRIMARY KEY, -- Truncated orderId (max 15 chars) from Yappy
  player_id UUID, -- Full playerId UUID (can be null for enrollment)
  amount DECIMAL(10, 2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('enrollment', 'monthly', 'custom')),
  type TEXT NOT NULL CHECK (type IN ('payment', 'enrollment')), -- payment or enrollment
  month_year TEXT, -- 'YYYY-MM' for monthly payments
  notes TEXT,
  description TEXT, -- Order description
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours') -- Auto-cleanup after 48 hours
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_yappy_orders_order_id ON yappy_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_yappy_orders_created_at ON yappy_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_yappy_orders_expires_at ON yappy_orders(expires_at);

-- Enable RLS
ALTER TABLE yappy_orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read/write
CREATE POLICY "Allow authenticated users to manage yappy orders"
  ON yappy_orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to automatically clean up expired orders
CREATE OR REPLACE FUNCTION cleanup_expired_yappy_orders()
RETURNS void AS $$
BEGIN
  DELETE FROM yappy_orders WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up expired orders
-- This can be run via a cron job or scheduled task
-- Example: SELECT cleanup_expired_yappy_orders();

