import { BadgeCheck, ChevronRight, GraduationCap, Route, Sparkles, UserRound } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router-dom";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { DashboardBreadcrumbItem } from "@/lib/dashboard-breadcrumb";
import { cn } from "@/lib/utils";

interface DashboardBreadcrumbProps {
  items: DashboardBreadcrumbItem[];
  className?: string;
}

export function DashboardBreadcrumb({ items, className }: DashboardBreadcrumbProps) {
  if (!items.length) {
    return null;
  }

  const getItemIcon = (label: string, index: number, isCurrent: boolean) => {
    if (index === 0) {
      if (label.trim().toLowerCase() === "mentor") {
        return <GraduationCap className="h-3.5 w-3.5" />;
      }

      return <UserRound className="h-3.5 w-3.5" />;
    }

    if (isCurrent) {
      return <Sparkles className="h-3.5 w-3.5" />;
    }

    if (index === 1) {
      return <Route className="h-3.5 w-3.5" />;
    }

    return <BadgeCheck className="h-3.5 w-3.5" />;
  };

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="min-w-0 flex-nowrap gap-1 text-sm sm:gap-1.5">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          const icon = getItemIcon(item.label, index, isCurrent);

          return (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem className="min-w-0">
                {item.href && !isCurrent ? (
                  <BreadcrumbLink asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        "inline-flex max-w-[17rem] items-center gap-1.5 truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors",
                        "hover:border-slate-300 hover:bg-white hover:text-slate-900",
                        "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
                      )}>
                      <span className="shrink-0">{icon}</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage
                    className={cn(
                      "inline-flex max-w-[17rem] items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-xs font-semibold",
                      "border-[#0047AB]/25 bg-[#0047AB]/10 text-[#003A8C]",
                      "dark:border-[#66B2FF]/30 dark:bg-[#132544] dark:text-[#A9D1FF]"
                    )}>
                    <span className="shrink-0">{icon}</span>
                    <span className="truncate">{item.label}</span>
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isCurrent && (
                <BreadcrumbSeparator className="text-slate-300 dark:text-slate-600">
                  <ChevronRight className="h-3 w-3" />
                </BreadcrumbSeparator>
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
