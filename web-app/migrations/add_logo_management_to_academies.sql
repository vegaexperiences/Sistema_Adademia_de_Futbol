-- ============================================
-- Add Logo Management to Academies Table
-- ============================================
-- This migration adds comprehensive logo management fields for different sizes and favicons

-- Add logo size columns
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS logo_small_url TEXT;

ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS logo_medium_url TEXT;

ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS logo_large_url TEXT;

-- Add favicon columns
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS favicon_16_url TEXT;

ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS favicon_32_url TEXT;

-- Add Apple Touch Icon column
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS apple_touch_icon_url TEXT;

-- Add comments
COMMENT ON COLUMN academies.logo_small_url IS 'URL for small logo (32x32px) - used for icons and badges';
COMMENT ON COLUMN academies.logo_medium_url IS 'URL for medium logo (128x128px) - used for cards and headers';
COMMENT ON COLUMN academies.logo_large_url IS 'URL for large logo (512x512px) - used for hero sections and emails';
COMMENT ON COLUMN academies.favicon_16_url IS 'URL for 16x16 favicon';
COMMENT ON COLUMN academies.favicon_32_url IS 'URL for 32x32 favicon';
COMMENT ON COLUMN academies.apple_touch_icon_url IS 'URL for Apple Touch Icon (180x180px) - used for iOS home screen';

-- Note: logo_url column already exists and will be kept as the main/default logo for backward compatibility

