import { ReactNode } from "react";
import { CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface RichToastProps {
  title: string;
  description?: string;
  type?: "success" | "error" | "info" | "warning";
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
}

export const RichToast = ({
  title,
  description,
  type = "info",
  action,
  icon,
}: RichToastProps) => {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-accent" />,
    error: <XCircle className="h-5 w-5 text-destructive" />,
    warning: <AlertCircle className="h-5 w-5 text-urgency-medium" />,
    info: <Info className="h-5 w-5 text-primary" />,
  };

  const bgColors = {
    success: "bg-accent/10 border-accent/20",
    error: "bg-destructive/10 border-destructive/20",
    warning: "bg-urgency-medium/10 border-urgency-medium/20",
    info: "bg-primary/10 border-primary/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`flex items-start gap-3 p-4 rounded-lg border ${bgColors[type]} shadow-medium`}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">{icon || icons[type]}</div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <p className="font-semibold text-sm">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {action && (
          <Button
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            className="h-8 px-3 mt-2"
          >
            {action.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
};
