/**
 * TimeAgo Component
 * Displays relative time (e.g., "2 hours ago")
 */

import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

import { formatDateTime, parseBackendDate } from "@/lib/formatting";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface TimeAgoProps {
  date: string | Date;
  className?: string;
  prefix?: boolean;
}

export function TimeAgo({ date, className, prefix = true }: TimeAgoProps) {
  const parsedDate = parseBackendDate(date);

  if (!parsedDate) {
    return <span className={cn("text-sm text-slate-500 dark:text-slate-400", className)}>—</span>;
  }

  const timeAgo = formatDistanceToNow(parsedDate, {
    addSuffix: prefix,
    locale: i18n.language === "en" ? undefined : vi,
  });
  const absoluteTime = formatDateTime(parsedDate);

  return (
    <span
      title={absoluteTime}
      className={cn("text-sm text-slate-500 dark:text-slate-400", className)}>
      {timeAgo}
    </span>
  );
}
