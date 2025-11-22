import { useRef, useState, ReactNode } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Trash2, Check } from "lucide-react";

interface SwipeableCardProps {
  children: ReactNode;
  onDelete?: () => void;
  onComplete?: () => void;
  threshold?: number;
}

export const SwipeableCard = ({
  children,
  onDelete,
  onComplete,
  threshold = 100,
}: SwipeableCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const constraintsRef = useRef(null);

  const leftActionOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  const rightActionOpacity = useTransform(x, [0, threshold], [0, 1]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    setIsDragging(false);
    const offset = info.offset.x;

    // Swipe left to delete
    if (offset < -threshold && onDelete) {
      onDelete();
    }
    // Swipe right to complete
    else if (offset > threshold && onComplete) {
      onComplete();
    }
    // Reset position if threshold not met
    else {
      x.set(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-0 flex items-center justify-between px-6">
        {/* Complete action (left) */}
        {onComplete && (
          <motion.div
            style={{ opacity: leftActionOpacity }}
            className="flex items-center gap-2 text-accent"
          >
            <Check className="h-6 w-6" />
            <span className="font-semibold">Completa</span>
          </motion.div>
        )}

        {/* Delete action (right) */}
        {onDelete && (
          <motion.div
            style={{ opacity: rightActionOpacity }}
            className="flex items-center gap-2 text-destructive ml-auto"
          >
            <span className="font-semibold">Elimina</span>
            <Trash2 className="h-6 w-6" />
          </motion.div>
        )}
      </div>

      {/* Swipeable card */}
      <motion.div
        ref={constraintsRef}
        drag="x"
        dragConstraints={{ left: onDelete ? -200 : 0, right: onComplete ? 200 : 0 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`relative bg-card ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.div>
    </div>
  );
};
