-- Fix RLS policies for documents bucket
-- Run this in Supabase SQL Editor

-- First, drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Policy 1: Allow authenticated users to INSERT (upload) files
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy 2: Allow authenticated users to UPDATE their files
CREATE POLICY "Allow authenticated updates" 
ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Policy 3: Allow public SELECT (read) access
CREATE POLICY "Allow public read" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'documents');

-- Policy 4: Allow authenticated users to DELETE files
CREATE POLICY "Allow authenticated deletes" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'documents');

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;

