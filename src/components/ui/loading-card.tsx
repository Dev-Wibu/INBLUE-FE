/**
 * LoadingCard Component
 * Skeleton loading state for cards
 */

import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface LoadingCardProps {
  className?: string;
  lines?: number;
}

export function LoadingCard({ className, lines = 3 }: LoadingCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900",
        className
      )}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface LoadingCardListProps {
  count?: number;
  className?: string;
}

export function LoadingCardList({ count = 3, className }: LoadingCardListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}
