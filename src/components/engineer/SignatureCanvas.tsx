/**
 * SignatureCanvas — touch-optimized signature capture
 * Part 5 — Sectore 360
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Check } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  existingDataUrl?: string;
  disabled?: boolean;
}

export function SignatureCanvas({ onSave, existingDataUrl, disabled = false }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!existingDataUrl);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (existingDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = existingDataUrl;
      setIsEmpty(false);
    }
  }, [existingDataUrl]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPoint.current = getPos(e, canvas);
  }, [disabled]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    lastPoint.current = pos;
    setIsEmpty(false);
  }, [isDrawing, disabled]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }, []);

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onSave(canvas.toDataURL('image/png'));
  }, [isEmpty, onSave]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full h-32 md:h-40 cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {isEmpty && !disabled && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none select-none">
            Sign here
          </p>
        )}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={clear} className="flex-1">
            <RotateCcw size={14} className="mr-1" /> Clear
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={isEmpty} className="flex-1">
            <Check size={14} className="mr-1" /> Save Signature
          </Button>
        </div>
      )}
    </div>
  );
}
