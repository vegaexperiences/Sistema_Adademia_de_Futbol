'use client';

import { createClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'documents';

export interface UploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param path - The path where to store the file (e.g., 'cedulas/player-123-front.jpg')
 * @returns The public URL of the uploaded file or an error
 */
export async function uploadFile(file: File, path: string): Promise<UploadResult> {
  try {
    const supabase = createClient();

    // Check if bucket exists, if not, we'll get an error that we can handle
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error checking buckets:', bucketError);
      return { url: null, error: 'Error al acceder al almacenamiento' };
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      return { 
        url: null, 
        error: `El bucket "${BUCKET_NAME}" no existe. Por favor créalo en Supabase Storage.` 
      };
    }

    // Upload the file
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}-${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { url: null, error: uploadError.message || 'Error al subir el archivo' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    console.error('Unexpected error uploading file:', error);
    return { url: null, error: error.message || 'Error inesperado al subir el archivo' };
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: { file: File; path: string }[]
): Promise<{ results: UploadResult[]; errors: string[] }> {
  const results = await Promise.all(
    files.map(({ file, path }) => uploadFile(file, path))
  );

  const errors = results
    .filter(r => r.error)
    .map(r => r.error!);

  return { results, errors };
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(filePath: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    
    // Extract path from full URL if needed
    let path = filePath;
    if (filePath.includes('/storage/v1/object/public/')) {
      const match = filePath.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)/);
      if (match) {
        path = match[1];
      }
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Error al eliminar el archivo' };
  }
}

