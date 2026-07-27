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
      {/* Left panel - Light mode: Blue gradient with white text */}
      {/* Left panel - Dark mode: Dark gradient with light text */}
      <aside className="relative hidden flex-col justify-between gap-10 bg-gradient-to-br from-[#0047AB] via-[#005FD1] to-[#007BFF] px-10 py-12 text-white md:flex">
        {/* Decorative overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.15),transparent_50%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.1),transparent_50%)]" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/20 text-base font-bold tracking-tight text-white">
            IB
          </div>
          <span className="text-sm font-medium text-white/90">INBLUE · AI Interview</span>
        </div>

        {/* Content */}
        <div className="relative space-y-6">
          {/* Step badge */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wider text-white/90 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {stepLabel}
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">{title}</h2>

          {/* Description */}
          <p className="max-w-md text-sm leading-relaxed text-white/80">{description}</p>

          {/* Highlight */}
          {highlight ? (
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/90 backdrop-blur-sm">
              {highlight}
            </div>
          ) : null}
        </div>

        {/* Step indicators */}
        <div className="relative flex items-center gap-3">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const isComplete = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                    isComplete && "border-emerald-400 bg-emerald-400 text-[#0047AB]",
                    isCurrent && "border-white bg-white text-[#0047AB]",
                    !isComplete && !isCurrent && "border-white/40 bg-transparent text-white/60"
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
                      idx < stepIndex ? "bg-emerald-400" : "bg-white/30"
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
