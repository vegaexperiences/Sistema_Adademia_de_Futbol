import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createStorageBucket() {
  console.log('🚀 Creating Supabase Storage bucket...\n');

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      process.exit(1);
    }

    const bucketExists = buckets?.some(b => b.name === 'documents');
    
    if (bucketExists) {
      console.log('✅ Bucket "documents" already exists!\n');
      console.log('📋 Current buckets:');
      buckets?.forEach(b => {
        console.log(`   - ${b.name} (${b.public ? 'public' : 'private'})`);
      });
      return;
    }

    // Create the bucket
    console.log('📦 Creating bucket "documents"...');
    const { data, error } = await supabase.storage.createBucket('documents', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
    });

    if (error) {
      console.error('❌ Error creating bucket:', error);
      console.error('\n💡 Try creating it manually in Supabase Dashboard:');
      console.error('   1. Go to Storage');
      console.error('   2. Click "New bucket"');
      console.error('   3. Name: "documents"');
      console.error('   4. Public: Yes');
      process.exit(1);
    }

    console.log('✅ Bucket created successfully!\n');
    console.log('📋 Bucket details:');
    console.log(`   Name: ${data.name}`);
    console.log(`   Public: ${data.public}`);
    console.log(`   File size limit: ${data.file_size_limit ? `${data.file_size_limit / 1024 / 1024}MB` : 'Unlimited'}`);
    
    console.log('\n🔐 Now setting up RLS policies...');
    
    // Note: RLS policies need to be set via SQL, not the JS client
    console.log('\n⚠️  RLS policies must be set manually in Supabase SQL Editor:');
    console.log('\nRun these SQL commands in Supabase Dashboard → SQL Editor:\n');
    console.log(`
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow public read access
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents');
    `);

    console.log('\n✅ Setup complete!');
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

createStorageBucket();

