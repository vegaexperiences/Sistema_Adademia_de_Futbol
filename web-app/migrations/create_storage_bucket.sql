-- This migration creates the Supabase Storage bucket for documents
-- Run this in Supabase SQL Editor, not as a regular migration

-- Note: Supabase Storage buckets must be created through the Supabase Dashboard
-- or using the Storage API. This SQL file is for reference only.

-- To create the bucket manually:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: "documents"
-- 4. Public: Yes (to allow public access to uploaded files)
-- 5. File size limit: 50MB (or as needed)
-- 6. Allowed MIME types: image/*, application/pdf (or leave empty for all)

-- Alternatively, you can use the Supabase Storage API:
-- 
-- const { data, error } = await supabase.storage.createBucket('documents', {
--   public: true,
--   fileSizeLimit: 52428800, // 50MB
--   allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
-- });

-- Storage Policy (RLS) - Run this in Supabase SQL Editor after creating the bucket:

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents');

-- Allow public read access (since bucket is public)
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents');

