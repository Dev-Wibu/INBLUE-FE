import {
  CheckCircle as PhosphorCheckCircle,
  CircleDashed as PhosphorCircleDashed,
  XCircle as PhosphorXCircle,
} from "@phosphor-icons/react";
import { ChevronDown, ScanSearch } from "lucide-react";
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
  const Icon =
    passed === true
      ? PhosphorCheckCircle
      : passed === false
        ? PhosphorXCircle
        : PhosphorCircleDashed;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={
        passed === true
          ? "inline-flex shrink-0 leading-none text-indigo-600 dark:text-indigo-400"
          : passed === false
            ? "inline-flex shrink-0 leading-none text-red-500"
            : "inline-flex shrink-0 leading-none text-gray-400 dark:text-gray-500"
      }>
      <Icon aria-hidden="true" size={22} weight={passed == null ? "duotone" : "fill"} />
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
