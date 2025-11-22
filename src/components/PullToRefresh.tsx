import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY.current === 0 || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const distance = Math.min(
      Math.max(currentY.current - startY.current, 0),
      MAX_PULL
    );
    
    if (distance > 0) {
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchmove", handleTouchMove);
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  const rotation = useTransform(
    useMotionValue(pullDistance),
    [0, PULL_THRESHOLD],
    [0, 360]
  );

  const opacity = pullDistance / PULL_THRESHOLD;
  const scale = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center"
        style={{
          height: Math.max(pullDistance, 0),
          opacity: opacity,
        }}
      >
        <motion.div
          className="bg-primary text-primary-foreground rounded-full p-2 shadow-medium"
          style={{
            scale: scale,
            rotate: isRefreshing ? rotation : pullDistance * 4,
          }}
          animate={
            isRefreshing
              ? {
                  rotate: [0, 360],
                  transition: {
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  },
                }
              : {}
          }
        >
          <RefreshCw className="h-5 w-5" />
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{
          y: Math.min(pullDistance * 0.5, MAX_PULL * 0.5),
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
