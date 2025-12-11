-- ============================================
-- Create function to set academy context for RLS
-- ============================================
-- This function sets the app.academy_id session variable
-- which is used by RLS policies to filter data by academy

CREATE OR REPLACE FUNCTION set_academy_context(academy_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the session variable that RLS policies use
  PERFORM set_config('app.academy_id', academy_id::text, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_academy_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_academy_context(UUID) TO anon;

