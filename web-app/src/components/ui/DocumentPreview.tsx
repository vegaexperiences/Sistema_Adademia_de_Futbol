import { Eye, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface DocumentPreviewProps {
  url: string;
  title: string;
}

export function DocumentPreview({ url, title }: DocumentPreviewProps) {
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

  const embedUrl = getEmbedUrl(url);
  const isGoogleDrive = url.includes('drive.google.com');
  const isImage = url.match(/\.(jpeg|jpg|gif|png)$/) != null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye size={16} />
          Ver {title}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full h-full min-h-[400px] bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden relative">
          {isGoogleDrive ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
              <FileText size={48} className="text-gray-400" />
              <div className="text-center">
                <p className="text-gray-900 dark:text-white font-medium mb-2">Documento de Google Drive</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Para ver este documento, el propietario debe compartirlo públicamente.
                </p>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <Button>
                    <ExternalLink size={16} className="mr-2" />
                    Abrir en Google Drive
                  </Button>
                </a>
              </div>
            </div>
          ) : isImage ? (
            <img src={url} alt={title} className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <FileText size={48} className="text-gray-400" />
              <p className="text-gray-900 dark:text-white">Este documento no se puede previsualizar aquí.</p>
              <a href={url} target="_blank" rel="noopener noreferrer">
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
