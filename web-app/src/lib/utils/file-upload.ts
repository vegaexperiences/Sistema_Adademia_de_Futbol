'use client';

import { createClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'documents';

export interface UploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Sanitize a string to be safe for use in file paths
 * Removes special characters, normalizes accents, and ensures valid characters only
 */
function sanitizePathSegment(segment: string): string {
  return segment
    .toLowerCase()
    .normalize('NFD') // Normalize to NFD form to separate base characters from accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks (ñ -> n, á -> a, etc.)
    .replace(/[^a-z0-9-]/g, '-') // Replace any non-alphanumeric (except hyphen) with hyphen
    .replace(/-+/g, '-') // Replace multiple hyphens with a single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Sanitize a full file path for Supabase Storage
 */
function sanitizeFilePath(path: string): string {
  const segments = path.split('/').filter(Boolean); // Remove empty segments
  return segments.map(sanitizePathSegment).join('/');
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

    // Sanitize the input path
    const sanitizedPath = sanitizeFilePath(path);
    console.log('[uploadFile] Original path:', path);
    console.log('[uploadFile] Sanitized path:', sanitizedPath);
    
    // Upload the file directly - if bucket doesn't exist, we'll get an error
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    
    // Get the last part of the path (e.g., 'cedulafrontfile' from 'players/olga-tanon/cedulafrontfile')
    const pathSegments = sanitizedPath.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Create filename with timestamp - sanitize the segment name too
    const fileName = `${lastSegment}-${timestamp}.${fileExt}`;
    
    // Full path: sanitized path + filename
    const filePath = `${sanitizedPath}/${fileName}`;
    console.log('[uploadFile] Final file path:', filePath);

    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      // Check if error is about bucket not existing
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
        return { 
          url: null, 
          error: `El bucket "${BUCKET_NAME}" no existe. Por favor créalo en Supabase Storage.` 
        };
      }
      
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

