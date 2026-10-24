import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsRight, Check, ArrowRight, Loader2 } from 'lucide-react';

interface SwipeActionButtonProps {
  label: string;
  successLabel?: string;
  variant?: 'checkin' | 'checkout';
  onAction: () => void | Promise<void>;
  disabled?: boolean;
}

export function SwipeActionButton({
  label,
  successLabel = 'Completed!',
  variant = 'checkin',
  onAction,
  disabled = false,
}: SwipeActionButtonProps) {
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const isInteractingRef = useRef(false);

  const isCheckIn = variant === 'checkin';

  // Theme styles based on variant
  const theme = isCheckIn
    ? {
        trackBg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700',
        trackFill: 'bg-gradient-to-r from-blue-700 to-indigo-700',
        shadow: 'shadow-lg shadow-blue-500/20',
        thumbIconColor: 'text-blue-600',
        ringColor: 'ring-blue-400/30',
        border: 'border-blue-400/30',
      }
    : {
        trackBg: 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700',
        trackFill: 'bg-gradient-to-r from-rose-700 to-red-700',
        shadow: 'shadow-lg shadow-rose-500/25',
        thumbIconColor: 'text-rose-600',
        ringColor: 'ring-rose-400/30',
        border: 'border-rose-400/30',
      };

  const triggerAction = useCallback(async () => {
    setIsSuccess(true);
    setIsLoading(true);
    try {
      await onAction();
    } catch {
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
      setDragProgress(0);
    }
  }, [onAction]);

  // Animate slide to complete (e.g. on click / tap)
  const animateComplete = useCallback(() => {
    if (disabled || isSuccess || isLoading) return;
    setIsDragging(false);
    setDragProgress(1);
    setTimeout(() => {
      triggerAction();
    }, 180);
  }, [disabled, isSuccess, isLoading, triggerAction]);

  // Touch handlers (Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isSuccess || isLoading) return;
    setIsDragging(true);
    isInteractingRef.current = true;
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startXRef.current;
    const maxDrag = Math.max(1, containerRef.current.clientWidth - 54);
    const progress = Math.max(0, Math.min(1, deltaX / maxDrag));
    setDragProgress(progress);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    isInteractingRef.current = false;
    if (dragProgress > 0.6) {
      setDragProgress(1);
      triggerAction();
    } else {
      setDragProgress(0);
    }
  };

  // Mouse handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isSuccess || isLoading) return;
    setIsDragging(true);
    isInteractingRef.current = true;
    startXRef.current = e.clientX;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const deltaX = e.clientX - startXRef.current;
      const maxDrag = Math.max(1, containerRef.current.clientWidth - 54);
      const progress = Math.max(0, Math.min(1, deltaX / maxDrag));
      setDragProgress(progress);
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
      isInteractingRef.current = false;
      if (dragProgress > 0.6) {
        setDragProgress(1);
        triggerAction();
      } else {
        setDragProgress(0);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragProgress, triggerAction]);

  // Calculate pixel translation for thumb
  const containerWidth = containerRef.current?.clientWidth || 320;
  const maxTravel = Math.max(0, containerWidth - 54);
  const thumbTranslateX = dragProgress * maxTravel;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[54px] rounded-full select-none overflow-hidden transition-all duration-300 border ${
        theme.border
      } ${theme.shadow} ${theme.trackBg} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-105 active:brightness-95'
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        // Allow click to auto-complete if not dragged
        if (!isInteractingRef.current && dragProgress === 0) {
          animateComplete();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          animateComplete();
        }
      }}
    >
      {/* Subtle glossy top highlight line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-white/25 pointer-events-none" />

      {/* Dynamic Drag Fill overlay behind thumb */}
      <div
        className={`absolute inset-y-0 left-0 ${theme.trackFill} pointer-events-none transition-all ${
          isDragging ? 'duration-0' : 'duration-300 ease-out'
        }`}
        style={{
          width: `${thumbTranslateX + 50}px`,
          opacity: dragProgress > 0.05 ? 0.9 : 0,
        }}
      />

      {/* Center Label with dynamic opacity and shimmer chevrons */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
        <div
          className="flex items-center gap-2 text-white font-semibold text-sm tracking-wide transition-opacity duration-200"
          style={{
            opacity: Math.max(0, 1 - dragProgress * 2.2),
          }}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={17} />
              <span>Processing...</span>
            </div>
          ) : isSuccess ? (
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Check size={18} strokeWidth={2.5} />
              <span>{successLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 drop-shadow-sm">
              <span className="font-medium text-[14px]">{label}</span>
              <div className="flex items-center text-white/80">
                <ChevronsRight size={17} className="animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draggable Button Thumb (Circle with Arrow / State) */}
      <div
        className={`absolute top-1 bottom-1 left-1 w-[46px] h-[46px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.25)] transition-transform ${
          isDragging ? 'duration-0 scale-95' : 'duration-300 ease-out hover:scale-105 active:scale-95'
        }`}
        style={{
          transform: `translateX(${thumbTranslateX}px)`,
        }}
      >
        {isLoading ? (
          <Loader2 className={`animate-spin ${theme.thumbIconColor}`} size={20} />
        ) : isSuccess ? (
          <Check className="text-emerald-600 font-bold" size={22} strokeWidth={2.8} />
        ) : (
          <div className="relative flex items-center justify-center">
            <ArrowRight
              className={`${theme.thumbIconColor} transition-transform ${
                isDragging ? 'translate-x-0.5' : ''
              }`}
              size={19}
              strokeWidth={2.6}
            />
          </div>
        )}
      </div>

      {/* Subtle accessibility & quick hint badge (cleaner, non-intrusive) */}
      <div
        className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200 text-[11px] font-medium text-white/50 hidden sm:block`}
        style={{
          opacity: dragProgress > 0.1 ? 0 : 0.7,
        }}
      >
        swipe or click
      </div>
    </div>
  );
}
