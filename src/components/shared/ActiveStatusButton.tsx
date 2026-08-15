import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface ActiveStatusButtonProps {
  active: boolean;
  onToggle?: () => void;
  className?: string;
}

export function ActiveStatusButton({ active, onToggle, className }: ActiveStatusButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      disabled={!onToggle}
      title={
        active
          ? t("common.clickToDisable", "Nhấp để tắt")
          : t("common.clickToEnable", "Nhấp để bật")
      }
      className={cn(
        "group/status inline-flex min-w-[108px] items-center justify-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-all disabled:cursor-default",
        active
          ? "border-emerald-500/25 bg-emerald-50/80 text-emerald-700 shadow-2xs hover:bg-emerald-100/90 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:bg-emerald-950/90"
          : "border-slate-200 bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
        className
      )}>
      {active ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      ) : (
        <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
      )}
      <span>{active ? t("common.active", "Hoạt động") : t("common.shutDown", "Đã tắt")}</span>
    </button>
  );
}
