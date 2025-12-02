import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileVideo, Image, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVideo } from '@/contexts/VideoContext';

interface FileUploadProps {
  type: 'video' | 'thumbnail';
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  className?: string;
}

export function FileUpload({ type, onUploadComplete, currentUrl, className }: FileUploadProps) {
  const { uploadFile } = useVideo();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = type === 'video' 
    ? 'video/mp4,video/webm,video/ogg,video/*' 
    : 'image/jpeg,image/png,image/webp,image/gif,image/*';

  const bucket = type === 'video' ? 'videos' : 'thumbnails';

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate file type
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (type === 'video' && !isVideo) {
      alert('Please select a video file');
      return;
    }
    if (type === 'thumbnail' && !isImage) {
      alert('Please select an image file');
      return;
    }

    // Create preview for images
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    const url = await uploadFile(file, bucket);

    clearInterval(progressInterval);
    setUploadProgress(100);

    if (url) {
      setPreviewUrl(url);
      onUploadComplete(url);
    }

    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);
    }, 500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setPreviewUrl(null);
    onUploadComplete('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        id={`file-upload-${type}`}
      />

      <AnimatePresence mode="wait">
        {previewUrl ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-lg overflow-hidden bg-muted"
          >
            {type === 'thumbnail' ? (
              <img
                src={previewUrl}
                alt="Thumbnail preview"
                className="w-full h-32 object-cover"
              />
            ) : (
              <div className="w-full h-32 flex items-center justify-center bg-muted">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Video uploaded</span>
                </div>
              </div>
            )}
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "relative h-32 rounded-lg border-2 border-dashed transition-all cursor-pointer",
              "flex flex-col items-center justify-center gap-2",
              isDragging 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-primary/50 hover:bg-muted/50",
              isUploading && "pointer-events-none"
            )}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">Uploading...</span>
              </div>
            ) : (
              <>
                {type === 'video' ? (
                  <FileVideo className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Image className="w-8 h-8 text-muted-foreground" />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {isDragging ? 'Drop here' : `Upload ${type}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tap to select or drag & drop
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
