'use client';

import { Eye, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface DocumentPreviewProps {
  url: string;
  title: string;
}

export function DocumentPreview({ url, title }: DocumentPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    const processUrl = async () => {
      try {
        // If it's already a full URL (http/https), use it directly
        if (url.startsWith('http://') || url.startsWith('https://')) {
          setImageUrl(url);
          setLoading(false);
          return;
        }

        // If it starts with /, it's a local path (public folder)
        if (url.startsWith('/')) {
          setImageUrl(url);
          setLoading(false);
          return;
        }

        // If it's a Supabase Storage path (contains /storage/ or storage.v1)
        if (url.includes('/storage/') || url.includes('storage.v1') || url.includes('supabase.co/storage')) {
          const supabase = createClient();
          
          // Extract bucket and path from Supabase Storage URL
          let bucket = 'documents'; // default bucket
          let path = url;

          // Try to extract bucket from full Supabase Storage URL
          if (url.includes('/storage/v1/object/public/')) {
            const match = url.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)/);
            if (match) {
              bucket = match[1];
              path = match[2];
            }
          } else if (url.includes('storage.v1.supabase.co') || url.includes('supabase.co/storage')) {
            // Handle Supabase Storage URL format
            const match = url.match(/\/object\/public\/([^\/]+)\/(.+)/);
            if (match) {
              bucket = match[1];
              path = match[2];
            }
          } else {
            // Assume format: bucket/path
            const parts = url.split('/');
            if (parts.length > 1) {
              bucket = parts[0];
              path = parts.slice(1).join('/');
            }
          }

          // Get public URL from Supabase Storage
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          setImageUrl(data.publicUrl);
          setLoading(false);
          return;
        }

        // If it's just a filename (no slashes, no http), try multiple sources
        if (!url.includes('/') && !url.includes('\\')) {
          // First try: public folder (most common for old files)
          const publicUrl = `/${url}`;
          
          // Try to load the image directly
          const testImg = new Image();
          
          testImg.onload = () => {
            // File exists in public folder
            setImageUrl(publicUrl);
            setLoading(false);
          };
          
          testImg.onerror = async () => {
            // Public folder failed, try alternative names or Supabase Storage
            // Try common alternative names (logo_academia.png -> logo.png)
            const alternatives: string[] = [];
            if (url.includes('logo_academia')) {
              alternatives.push('/logo.png');
            }
            if (url.includes('logo') && !url.includes('academia')) {
              alternatives.push('/logo_academia.png');
            }
            
            // Try alternatives first
            for (const alt of alternatives) {
              const altImg = new Image();
              const altPromise = new Promise<boolean>((resolve) => {
                altImg.onload = () => {
                  setImageUrl(alt);
                  setLoading(false);
                  resolve(true);
                };
                altImg.onerror = () => resolve(false);
                altImg.src = alt;
              });
              
              const found = await altPromise;
              if (found) return;
            }
            
            // If alternatives failed, try Supabase Storage
            try {
              const supabase = createClient();
              
              // Try to get public URL directly - if bucket doesn't exist, we'll handle it
              const { data } = supabase.storage.from('documents').getPublicUrl(url);
              
              // Test the Supabase URL
              const testStorageImg = new Image();
              testStorageImg.onload = () => {
                setImageUrl(data.publicUrl);
                setLoading(false);
              };
              testStorageImg.onerror = () => {
                // All sources failed
                setImageUrl(publicUrl);
                setLoading(false);
                setError(true);
              };
              testStorageImg.src = data.publicUrl;
            } catch (err) {
              // Error accessing storage, use public as final fallback
              setImageUrl(publicUrl);
              setLoading(false);
              setError(true);
            }
          };
          
          testImg.src = publicUrl;
          return;
        }

        // Default: try as public folder file first
        const publicUrl = url.startsWith('/') ? url : `/${url}`;
        setImageUrl(publicUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error processing image URL:', err);
        // Last resort: try as public folder file
        setImageUrl(url.startsWith('/') ? url : `/${url}`);
        setLoading(false);
      }
    };

    processUrl();
  }, [url]);

  if (!url) return null;

  // Helper to convert Google Drive view links to preview/embed links if possible
  const getEmbedUrl = (url: string) => {
    // Handle Google Drive links
    if (url.includes('drive.google.com')) {
      // Extract file ID from various Google Drive URL formats
      const fileIdMatch = url.match(/[-\w]{25,}/);
      if (fileIdMatch) {
        return `https://drive.google.com/file/d/${fileIdMatch[0]}/preview`;
      }
    }
    return url;
  };

  const finalUrl = imageUrl || url;
  const embedUrl = getEmbedUrl(finalUrl);
  const isGoogleDrive = finalUrl.includes('drive.google.com');
  const isImage = finalUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i) != null || imageUrl != null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye size={16} />
          Ver {title}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Vista previa del documento {title}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 w-full h-full min-h-[400px] bg-gray-100 rounded-md overflow-hidden relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-gray-600">Cargando imagen...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
              <FileText size={48} className="text-gray-400" />
              <div className="text-center">
                <p className="text-gray-900 font-medium mb-2">Error al cargar la imagen</p>
                <p className="text-gray-600 text-sm mb-4">
                  No se pudo cargar la imagen. Verifica que el archivo exista.
                </p>
                <p className="text-gray-500 text-xs mb-2">URL: {url}</p>
                {finalUrl && finalUrl !== url && (
                  <a href={finalUrl} target="_blank" rel="noopener noreferrer">
                    <Button>
                      <ExternalLink size={16} className="mr-2" />
                      Intentar abrir directamente
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ) : isGoogleDrive ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
              <FileText size={48} className="text-gray-400" />
              <div className="text-center">
                <p className="text-gray-900 font-medium mb-2">Documento de Google Drive</p>
                <p className="text-gray-600 text-sm mb-4">
                  Para ver este documento, el propietario debe compartirlo públicamente.
                </p>
                <a href={finalUrl} target="_blank" rel="noopener noreferrer">
                  <Button>
                    <ExternalLink size={16} className="mr-2" />
                    Abrir en Google Drive
                  </Button>
                </a>
              </div>
            </div>
          ) : isImage ? (
            <img 
              src={finalUrl} 
              alt={title} 
              className="w-full h-full object-contain"
              onError={() => {
                setError(true);
                setLoading(false);
              }}
              onLoad={() => {
                setLoading(false);
                setError(false);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <FileText size={48} className="text-gray-400" />
              <p className="text-gray-900">Este documento no se puede previsualizar aquí.</p>
              <a href={finalUrl} target="_blank" rel="noopener noreferrer">
                <Button>
                  <ExternalLink size={16} className="mr-2" />
                  Abrir en nueva pestaña
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
