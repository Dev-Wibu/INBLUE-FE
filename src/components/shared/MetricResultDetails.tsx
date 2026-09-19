import { ChevronDown, CircleHelp, ScanSearch, ShieldCheck, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MetricCodeBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex h-8 min-w-10 shrink-0 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-2 font-mono text-xs font-bold text-indigo-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      {code}
    </span>
  );
}

export function MetricResultIcon({ passed }: { passed: boolean | null | undefined }) {
  const { t } = useTranslation();
  const label = t(
    passed === true
      ? "structuredAiFeedback.passed"
      : passed === false
        ? "structuredAiFeedback.failed"
        : "structuredAiFeedback.notAssessed"
  );
  const Icon = passed === true ? ShieldCheck : passed === false ? ShieldX : CircleHelp;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={
        passed === true
          ? "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 py-1 pr-2.5 pl-1 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-300"
          : passed === false
            ? "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 py-1 pr-2.5 pl-1 text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/15 dark:text-rose-300"
            : "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 py-1 pr-2.5 pl-1 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }>
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current/25 bg-white/70 dark:bg-slate-950/35">
        <Icon aria-hidden="true" className="h-4 w-4 stroke-[2.25]" />
      </span>
      <span className="text-[11px] font-bold tracking-wide whitespace-nowrap">{label}</span>
    </span>
  );
}

export function MetricEvidence({ evidence }: { evidence: string }) {
  const { t } = useTranslation();
  return (
    <details className="group mt-3 text-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-800 shadow-xs transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <ScanSearch aria-hidden="true" className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
          {t("structuredAiFeedback.evidence")}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400"
        />
      </summary>
      <p className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 font-medium whitespace-pre-wrap text-slate-700 shadow-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        {evidence}
      </p>
    </details>
  );
}
