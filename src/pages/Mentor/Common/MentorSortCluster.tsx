/**
 * MentorSortCluster — inline sort label + a row of sort buttons. Tiny
 * shared component so each list page renders sort the same way.
 */

import { Filter } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface MentorSortClusterProps {
  children: ReactNode;
  className?: string;
}

export function MentorSortCluster({ children, className }: MentorSortClusterProps) {
  const { t } = useTranslation();
  return (
    <div
      className={
        "flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-700/70 " +
        (className ?? "")
      }>
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Filter className="h-3.5 w-3.5" aria-hidden />
        {t("common.sortBy")}
      </span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}
