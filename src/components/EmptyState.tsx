import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  illustration,
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="shadow-soft mx-4 sm:mx-0">
        <CardContent className="text-center py-12 px-6 space-y-6">
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative"
          >
            <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-hero/10 flex items-center justify-center">
              <Icon className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
            </div>
            
            {/* Pulsating rings */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 mx-auto w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-primary"
            />
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <h3 className="text-xl sm:text-2xl font-bold">{title}</h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
              {description}
            </p>
          </motion.div>

          {/* Illustration or decorative element */}
          {illustration && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative h-32 flex items-center justify-center"
            >
              <div className="text-6xl opacity-20">{illustration}</div>
            </motion.div>
          )}

          {/* Action Button */}
          {actionLabel && onAction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="pt-2"
            >
              <Button
                onClick={onAction}
                size="lg"
                className="w-full max-w-xs h-12 sm:h-14 shadow-medium hover:shadow-strong transition-all"
              >
                {actionLabel}
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
