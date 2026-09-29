/**
 * PhotoUpload — multi-photo capture with preview & compression
 * Part 5 — Sectore 360
 */
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, ImagePlus } from 'lucide-react';
import type { TaskPhotoCategory } from '@/types/engineer';

export interface PhotoItem {
  id: string;
  dataUrl: string;
  fileName: string;
  fileSizeKB: number;
  category: TaskPhotoCategory;
}

interface PhotoUploadProps {
  category: TaskPhotoCategory;
  label: string;
  photos: PhotoItem[];
  onAdd: (photo: PhotoItem) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  maxPhotos?: number;
}

/** Compress a File to base64 JPEG at max 1080px / 0.7 quality */
function compressImage(file: File): Promise<{ dataUrl: string; fileSizeKB: number; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1080;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        const bytes = Math.round((dataUrl.length * 3) / 4);
        resolve({ dataUrl, fileSizeKB: Math.round(bytes / 1024), fileName: file.name });
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PhotoUpload({
  category, label, photos, onAdd, onRemove, disabled = false, maxPhotos = 10,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file);
        onAdd({
          id: `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          ...compressed,
          category,
        });
      } catch {
        // silently skip corrupt files
      }
    }
  }

  const canAdd = !disabled && photos.length < maxPhotos;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span className="text-xs text-muted-foreground">{photos.length}/{maxPhotos}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0">
            <img src={p.dataUrl} alt={p.fileName} className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X size={10} />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1">
              <p className="text-[10px] text-white truncate">{p.fileSizeKB}KB</p>
            </div>
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Camera size={20} />
            <span className="text-[10px]">Add</span>
          </button>
        )}

        {photos.length === 0 && !canAdd && (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <ImagePlus size={16} />
            <span className="text-sm">No photos</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
