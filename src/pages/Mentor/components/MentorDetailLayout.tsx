import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface MentorDetailPageProps {
  children: ReactNode;
  className?: string;
}

export function MentorDetailPage({ children, className }: MentorDetailPageProps) {
  return (
    <div className="-m-4 min-h-[calc(100%+32px)] bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div
        className={cn(
          "animate-in fade-in slide-in-from-bottom-2 mx-auto w-full max-w-[1800px] space-y-6 overflow-auto p-5 duration-300 sm:p-6 md:px-8",
          className
        )}>
        {children}
      </div>
    </div>
  );
}

interface MentorDetailHeaderProps {
  onBack: () => void;
  backLabel: string;
  parentLabel: string;
  title: string;
  leading?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  description?: ReactNode;
}

export function MentorDetailHeader({
  onBack,
  backLabel,
  parentLabel,
  title,
  leading,
  subtitle,
  badge,
  actions,
  description,
}: MentorDetailHeaderProps) {
  return (
    <section className="rounded-[20px] border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 shrink-0 rounded-xl border-slate-200 bg-white px-3 font-semibold shadow-2xs dark:border-slate-700 dark:bg-slate-900">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
          <div className="hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <span className="hidden text-sm font-medium text-slate-500 sm:block dark:text-slate-400">
            {parentLabel}
          </span>
          <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
          {leading}
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold text-slate-950 dark:text-white">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {description && (
        <div className="mt-5 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {description}
        </div>
      )}
    </section>
  );
}

interface MentorDetailPanelProps {
  children: ReactNode;
  className?: string;
}

export function MentorDetailPanel({ children, className }: MentorDetailPanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900",
        className
      )}>
      {children}
    </section>
  );
}

interface MentorPanelHeadingProps {
  icon?: ReactNode;
  title: string;
  aside?: ReactNode;
  description?: string;
}

export function MentorPanelHeading({ icon, title, aside, description }: MentorPanelHeadingProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {icon}
            </span>
          )}
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">{title}</h2>
        </div>
        {description && (
          <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
