import { cn } from "@/lib/utils";

type ScoreRingProps = {
  value: number;
  maximum?: number;
  label: string;
  className?: string;
  size?: "md" | "lg";
};

export function ScoreRing({ value, maximum = 100, label, className, size = "lg" }: ScoreRingProps) {
  const normalizedMaximum = maximum > 0 ? maximum : 100;
  const percent = Math.min(100, Math.max(0, (value / normalizedMaximum) * 100));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const scoreClass =
    percent >= 70 ? "text-emerald-500" : percent >= 40 ? "text-amber-500" : "text-rose-500";

  return (
    <figure
      className={cn(
        "relative grid shrink-0 place-items-center",
        size === "lg" ? "h-28 w-28" : "h-24 w-24",
        className
      )}
      aria-label={`${label}: ${formatScore(value)} / ${formatScore(normalizedMaximum)}`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-200 dark:text-slate-800"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(scoreClass, "transition-[stroke-dashoffset] duration-700 ease-out")}
        />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
        <strong
          className={cn(
            "leading-none font-bold tracking-normal text-slate-950 tabular-nums dark:text-white",
            size === "lg" ? "text-2xl" : "text-xl"
          )}>
          {formatScore(value)}
        </strong>
        <span className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          / {formatScore(normalizedMaximum)}
        </span>
      </figcaption>
    </figure>
  );
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
