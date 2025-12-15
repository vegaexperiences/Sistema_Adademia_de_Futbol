-- Migration: Allow public uploads to documents bucket
-- This is necessary for sponsor registration and enrollment where users may not be authenticated
-- Run this in Supabase SQL Editor

-- First, ensure the 'documents' bucket exists and is public
-- If it doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true, -- Public bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Policy 1: Allow public users (non-authenticated) to INSERT (upload) files
-- This is needed for sponsor registration and enrollment processes
CREATE POLICY "Allow public uploads" 
ON storage.objects
FOR INSERT 
TO public
WITH CHECK (bucket_id = 'documents');

-- Policy 2: Allow authenticated users to INSERT (upload) files
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy 3: Allow public SELECT (read) access
CREATE POLICY "Allow public read" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'documents');

-- Policy 4: Allow authenticated users to UPDATE their files
CREATE POLICY "Allow authenticated updates" 
ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Policy 5: Allow authenticated users to DELETE files
CREATE POLICY "Allow authenticated deletes" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'documents');
