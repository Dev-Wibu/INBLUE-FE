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
 * Light mode: Clean white/blue theme with bold text.
 * Dark mode: Deep gradient with bright accents.
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
        "grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-[1.05fr_1fr] dark:border-slate-800 dark:bg-slate-950",
        className
      )}>
      {/* Left panel - Light mode: Clean white with blue accents */}
      {/* Left panel - Dark mode: Dark gradient with neon accents */}
      <aside className="relative hidden flex-col justify-between gap-10 bg-white px-10 py-12 text-slate-900 md:flex dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 dark:text-white">
        {/* Light mode decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-transparent dark:hidden" />
        <div className="absolute right-0 bottom-0 size-64 rounded-full bg-blue-100/60 blur-3xl dark:hidden" />
        <div className="absolute top-20 right-10 size-32 rounded-full bg-indigo-100/40 blur-2xl dark:hidden" />

        {/* Dark mode decorative elements */}
        <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.15),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.1),transparent_50%)] dark:block" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#0047AB] text-base font-bold tracking-tight text-white shadow-lg shadow-blue-500/30">
            IB
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-slate-900 dark:text-white">INBLUE</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              AI Interview
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-6">
          {/* Step badge */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold tracking-wider text-[#0047AB] uppercase dark:border-indigo-500/50 dark:bg-indigo-500/20 dark:text-indigo-300">
            <span className="size-1.5 rounded-full bg-[#0047AB] dark:bg-indigo-400" />
            {stepLabel}
          </div>

          {/* Title */}
          <h2 className="text-4xl leading-tight font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>

          {/* Description */}
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {description}
          </p>

          {/* Highlight */}
          {highlight ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-slate-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-slate-200">
              {highlight}
            </div>
          ) : null}
        </div>

        {/* Step indicators */}
        <div className="relative z-10 flex items-center gap-3">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const isComplete = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 font-bold transition-all",
                    isComplete &&
                      "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-900",
                    isCurrent &&
                      "border-[#0047AB] bg-[#0047AB] text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-slate-900",
                    !isComplete &&
                      !isCurrent &&
                      "border-slate-200 bg-white text-slate-400 dark:border-white/20 dark:bg-white/5 dark:text-white/40"
                  )}>
                  {isComplete ? (
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < totalSteps - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-10 rounded-full transition-all",
                      idx < stepIndex
                        ? "bg-emerald-500 dark:bg-emerald-400"
                        : "bg-slate-200 dark:bg-white/20"
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
