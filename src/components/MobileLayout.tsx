import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export const MobileLayout = ({ children, showBottomNav = true }: MobileLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className={cn("flex-1", showBottomNav && "pb-20 sm:pb-24")}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
};
