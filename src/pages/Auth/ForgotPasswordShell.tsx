import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ForgotPasswordShellProps {
  stepLabel: string;
  stepIndex: number;
  totalSteps: number;
  title: ReactNode;
  description: ReactNode;
  highlight?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Editorial split-screen shell for the forgot/reset password flow.
 * Left column carries brand voice, right column carries the active step.
 * Responsive: Light mode uses light theme, Dark mode uses dark theme.
 */
export function ForgotPasswordShell({
  stepLabel,
  stepIndex,
  totalSteps,
  title,
  description,
  highlight,
  children,
  className,
}: ForgotPasswordShellProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 md:grid-cols-[1.05fr_1fr] dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/40",
        className
      )}>
      {/* Left panel - Light mode: Light gradient with dark text */}
      {/* Left panel - Dark mode: Dark gradient with light text */}
      <aside className="relative hidden flex-col justify-between gap-10 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-10 py-12 text-slate-800 md:flex dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-slate-100">
        {/* Decorative overlay - Light mode */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,71,171,0.12),transparent_60%),radial-gradient(circle_at_85%_80%,rgba(0,123,255,0.08),transparent_55%)] dark:hidden" />
        {/* Decorative overlay - Dark mode */}
        <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_15%_20%,rgba(102,178,255,0.15),transparent_60%),radial-gradient(circle_at_85%_80%,rgba(165,200,242,0.1),transparent_55%)] dark:block" />

        {/* Logo - Light mode */}
        <div className="relative flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#0047AB]/10 text-base font-bold tracking-tight text-[#0047AB] dark:bg-white/10 dark:text-white">
            IB
          </div>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">INBLUE · AI Interview</span>
        </div>

        {/* Content - Light mode */}
        <div className="relative space-y-6">
          {/* Step badge */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-semibold tracking-wider text-slate-600 backdrop-blur-sm dark:border-white/20 dark:bg-white/10 dark:text-slate-200">
            <span className="size-1.5 rounded-full bg-[#0047AB] dark:bg-emerald-400" />
            {stepLabel}
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>

          {/* Description */}
          <p className="max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {description}
          </p>

          {/* Highlight */}
          {highlight ? (
            <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 backdrop-blur-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
              {highlight}
            </div>
          ) : null}
        </div>

        {/* Step indicators - Light mode */}
        <div className="relative flex items-center gap-3">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const isComplete = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                    isComplete && "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-900",
                    isCurrent && "border-[#0047AB] bg-[#0047AB] text-white dark:border-[#66B2FF] dark:bg-[#66B2FF] dark:text-slate-900",
                    !isComplete && !isCurrent && "border-slate-300 bg-white text-slate-400 dark:border-white/30 dark:bg-transparent dark:text-white/50"
                  )}>
                  {isComplete ? (
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < totalSteps - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-8 rounded-full transition-all",
                      idx < stepIndex ? "bg-emerald-500 dark:bg-emerald-400" : "bg-slate-300 dark:bg-white/30"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Right panel - Form content */}
      <section className="flex flex-col gap-6 px-6 py-10 sm:px-10 md:py-12">
        {/* Mobile step badge */}
        <div className="md:hidden">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="size-1.5 rounded-full bg-[#0047AB]" />
            {stepLabel}
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}
