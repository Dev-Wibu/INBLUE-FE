import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface MatchLevelBadgeProps {
  percent: number | string;
  className?: string;
  compact?: boolean;
}

export function MatchLevelBadge({ percent, className, compact = false }: MatchLevelBadgeProps) {
  const { t } = useTranslation();
  const value = typeof percent === "number" ? `${percent.toFixed(2)}%` : percent;

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 rounded-md border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-800 shadow-none dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
        className
      )}>
      {!compact && (
        <span className="font-medium text-emerald-700 dark:text-emerald-300">
          {t("jobRecommendations.matchLevel")}
        </span>
      )}
      <span className="font-bold text-emerald-900 tabular-nums dark:text-emerald-100">{value}</span>
    </Badge>
  );
}
