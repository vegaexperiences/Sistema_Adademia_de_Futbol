/**
 * Server-side utilities for Supabase Storage
 * Used for uploading files from API routes and server components
 */

import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = 'documents'

export interface UploadResult {
  url: string | null
  error: string | null
}

/**
 * Upload a file buffer to Supabase Storage (server-side)
 * @param buffer - The file buffer to upload
 * @param path - The path where to store the file (e.g., 'academies/academy-123/logos/logo-main.png')
 * @param contentType - MIME type of the file (e.g., 'image/png')
 * @returns The public URL of the uploaded file or an error
 */
export async function uploadFileToStorage(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<UploadResult> {
  try {
    const supabase = await createClient()

    // Upload the file
    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      
      // Check if error is about bucket not existing
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
        return { 
          url: null, 
          error: `El bucket "${BUCKET_NAME}" no existe. Por favor créalo en Supabase Storage.` 
        }
      }
      
      return { url: null, error: uploadError.message || 'Error al subir el archivo' }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    return { url: urlData.publicUrl, error: null }
  } catch (error: any) {
    console.error('Unexpected error uploading file:', error)
    return { url: null, error: error.message || 'Error inesperado al subir el archivo' }
  }
}

/**
 * Delete a file from Supabase Storage (server-side)
 * @param path - The path of the file to delete
 * @returns Error if deletion failed
 */
export async function deleteFileFromStorage(path: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    
    // Extract path from full URL if needed
    let filePath = path
    if (path.includes('/storage/v1/object/public/')) {
      const match = path.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)/)
      if (match) {
        filePath = match[1]
      }
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error: any) {
    return { error: error.message || 'Error al eliminar el archivo' }
  }
}

