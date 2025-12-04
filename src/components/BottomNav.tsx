import { Home, Camera, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const BottomNav = () => {
  const location = useLocation();
  const [isTechnician, setIsTechnician] = useState<boolean | null>(null);

  useEffect(() => {
    checkTechnicianStatus();
  }, []);

  const checkTechnicianStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('is_technician')
        .eq('id', user.id)
        .single();
      
      setIsTechnician(data?.is_technician || false);
    }
  };

  const getProfilePath = () => {
    if (isTechnician) {
      return "/technician-dashboard?tab=profile";
    }
    return "/profile";
  };

  const isProfileActive = () => {
    return location.pathname === "/profile" || 
           (location.pathname === "/technician-dashboard" && location.search.includes("tab=profile"));
  };

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Home", isActive: location.pathname === "/dashboard" },
    { path: "/diagnose", icon: Camera, label: "Diagnosi", isActive: location.pathname === "/diagnose" },
    { path: getProfilePath(), icon: User, label: "Profilo", isActive: isProfileActive() },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-strong z-50 pb-safe">
      <div className="flex justify-around items-center h-16 sm:h-20">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all touch-manipulation",
                "active:scale-95 active:bg-muted/50",
                item.isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon 
                className={cn(
                  "transition-all",
                  item.isActive ? "h-7 w-7 sm:h-8 sm:w-8" : "h-6 w-6 sm:h-7 sm:w-7"
                )} 
              />
              <span 
                className={cn(
                  "text-xs sm:text-sm mt-1 font-medium transition-all",
                  item.isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
