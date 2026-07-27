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
      <aside className="relative hidden flex-col justify-between gap-10 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-10 py-12 text-slate-700 md:flex dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,71,171,0.15),transparent_60%),radial-gradient(circle_at_85%_80%,rgba(0,123,255,0.1),transparent_55%)] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(102,178,255,0.18),transparent_60%),radial-gradient(circle_at_85%_80%,rgba(165,200,242,0.15),transparent_55%)]" />

        <div className="relative flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-lg bg-[#0047AB]/10 text-base font-semibold tracking-tight text-[#0047AB] dark:bg-white/10 dark:text-white">
            IB
          </span>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">INBLUE · AI Interview</span>
        </div>

        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/50 px-3 py-1 text-xs font-medium tracking-[0.18em] text-slate-600 uppercase dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
            <span className="size-1.5 rounded-full bg-[#0047AB] dark:bg-[#66B2FF]" />
            {stepLabel}
          </div>

          <h2 className="text-3xl leading-[1.15] font-semibold tracking-tight text-slate-800 dark:text-white">
            {title}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
          {highlight ? (
            <div className="rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              {highlight}
            </div>
          ) : null}
        </div>

        <div className="relative space-y-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            {Array.from({ length: totalSteps }).map((_, idx) => {
              const isComplete = idx < stepIndex;
              const isCurrent = idx === stepIndex;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border text-[11px] font-semibold",
                      isComplete && "border-emerald-500 bg-emerald-100 text-emerald-700 dark:border-emerald-300 dark:bg-emerald-400/15 dark:text-emerald-200",
                      isCurrent && "border-[#0047AB] bg-blue-100 text-[#0047AB] dark:border-[#66B2FF] dark:bg-[#66B2FF]/15 dark:text-[#A5C8F2]",
                      !isComplete && !isCurrent && "border-slate-300 bg-white text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
                    )}>
                    {idx + 1}
                  </span>
                  {idx < totalSteps - 1 ? (
                    <span
                      className={cn(
                        "h-px w-8",
                        idx < stepIndex ? "bg-emerald-500/50 dark:bg-emerald-300/50" : "bg-slate-300 dark:bg-white/15"
                      )}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="flex flex-col gap-6 px-6 py-10 sm:px-10 md:py-12">
        <div className="md:hidden">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="size-1.5 rounded-full bg-[#0047AB]" />
            {stepLabel}
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}
