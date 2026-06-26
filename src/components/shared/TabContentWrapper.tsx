import { useDashboardScrollRestoration } from "@/hooks/useDashboardScrollRestoration";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface TabContentWrapperProps {
  tabId: string;
  tabType: string;
  isActive: boolean;
  onScrollTargetActive: (_el: HTMLDivElement) => void;
  children: React.ReactNode;
}

export function TabContentWrapper({
  tabId,
  tabType,
  isActive,
  onScrollTargetActive,
  children,
}: TabContentWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useDashboardScrollRestoration(containerRef, {
    enabled: isActive,
    scopeKey: tabId,
  });

  useEffect(() => {
    if (isActive && containerRef.current) {
      onScrollTargetActive(containerRef.current);
    }
  }, [isActive, onScrollTargetActive]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 h-full w-full overflow-auto", isActive ? "block" : "hidden")}
      data-testid={`tab-content-${tabType}`}>
      {children}
    </div>
  );
}
