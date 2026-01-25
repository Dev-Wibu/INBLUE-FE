/**
 * TimeAgo Component
 * Displays relative time (e.g., "2 hours ago")
 */

import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

import { cn } from "@/lib/utils";

interface TimeAgoProps {
  date: string | Date;
  className?: string;
  prefix?: boolean;
}

export function TimeAgo({ date, className, prefix = true }: TimeAgoProps) {
  const timeAgo = formatDistanceToNow(new Date(date), {
    addSuffix: prefix,
    locale: vi,
  });

  return (
    <span className={cn("text-sm text-slate-500 dark:text-slate-400", className)}>{timeAgo}</span>
  );
}
