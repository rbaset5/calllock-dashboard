'use client';

/**
 * SlideToDispatch Component
 *
 * A mobile-friendly slider that triggers a phone call when dragged to completion.
 * Includes iOS Safari swipe conflict mitigations:
 * - mx-4 padding from screen edges
 * - dragDirectionLock to prevent vertical scroll conflicts
 * - touch-action: pan-y on parent
 */

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Phone, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideToDispatchProps {
  phone: string;
  onDispatch?: () => void;
  className?: string;
}

const DISPATCH_THRESHOLD = 200; // pixels to complete dispatch

export function SlideToDispatch({ phone, onDispatch, className }: SlideToDispatchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isComplete, setIsComplete] = useState(false);
  const dragX = useMotionValue(0);

  // Progress from 0 to 1 based on drag distance
  const progress = useTransform(dragX, [0, DISPATCH_THRESHOLD], [0, 1]);

  // Color transitions from red to green as user drags
  const backgroundColor = useTransform(
    progress,
    [0, 0.5, 1],
    ['rgb(239, 68, 68)', 'rgb(234, 179, 8)', 'rgb(34, 197, 94)']
  );

  // Scale up slightly as user drags
  const scale = useTransform(progress, [0, 1], [1, 1.1]);

  // Opacity of the arrow indicators
  const arrowOpacity = useTransform(progress, [0, 0.3], [1, 0]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x >= DISPATCH_THRESHOLD) {
      setIsComplete(true);
      // Trigger phone call
      window.location.href = `tel:${phone}`;
      onDispatch?.();
    }
  };

  if (isComplete) {
    return (
      <div className={cn('relative h-14 rounded-full bg-green-500 overflow-hidden mx-4', className)}>
        <div className="absolute inset-0 flex items-center justify-center text-white font-semibold">
          <Phone className="w-5 h-5 mr-2" />
          Dispatching...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-14 rounded-full bg-red-100 overflow-hidden mx-4',
        // iOS swipe conflict mitigation
        'touch-pan-y',
        className
      )}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Track background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          style={{ opacity: arrowOpacity }}
          className="flex items-center gap-1 text-red-400"
        >
          <ChevronRight className="w-4 h-4" />
          <ChevronRight className="w-4 h-4 -ml-2" />
          <ChevronRight className="w-4 h-4 -ml-2" />
          <span className="ml-2 text-red-600 font-semibold text-sm">Slide to Dispatch</span>
        </motion.div>
      </div>

      {/* Draggable thumb */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: DISPATCH_THRESHOLD }}
        dragElastic={0.1}
        dragMomentum={false}
        dragDirectionLock={true}
        onDragEnd={handleDragEnd}
        style={{
          x: dragX,
          backgroundColor,
          scale,
        }}
        className={cn(
          'absolute left-1 top-1 bottom-1 w-12 rounded-full',
          'flex items-center justify-center',
          'cursor-grab active:cursor-grabbing',
          'shadow-lg'
        )}
        whileTap={{ cursor: 'grabbing' }}
      >
        <Phone className="w-5 h-5 text-white" />
      </motion.div>
    </div>
  );
}
