import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
type SpinnerTone = "primary" | "muted" | "success" | "danger" | "white";

const SPINNER_SIZE_CLASS: Record<SpinnerSize, string> = {
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-8",
  xl: "size-10",
};

const SPINNER_TONE_CLASS: Record<SpinnerTone, string> = {
  primary: "[--orbit-spinner-color:#0047AB]",
  muted: "[--orbit-spinner-color:var(--muted-foreground)]",
  success: "[--orbit-spinner-color:#10b981]",
  danger: "[--orbit-spinner-color:#ef4444]",
  white: "[--orbit-spinner-color:#ffffff]",
};

interface SpinnerProps extends Omit<React.ComponentProps<"span">, "role"> {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  role?: React.AriaRole;
}

function Spinner({
  className,
  size = "md",
  tone = "primary",
  role = "status",
  "aria-label": ariaLabel,
  ...props
}: SpinnerProps) {
  const { t } = useTranslation();
  const resolvedAriaLabel = ariaLabel ?? t("compUi.loading");
  return (
    <span
      role={role}
      aria-label={resolvedAriaLabel}
      className={cn(
        "orbit-spinner relative inline-flex shrink-0 align-middle",
        SPINNER_SIZE_CLASS[size],
        SPINNER_TONE_CLASS[tone],
        className
      )}
      {...props}>
      <span className="orbit-spinner__ring" aria-hidden="true">
        <span className="orbit-spinner__dot orbit-spinner__dot--one" />
        <span className="orbit-spinner__dot orbit-spinner__dot--two" />
        <span className="orbit-spinner__dot orbit-spinner__dot--three" />
      </span>
    </span>
  );
}

interface SpinnerInlineProps extends Omit<SpinnerProps, "children"> {
  label?: string;
  labelClassName?: string;
  gapClassName?: string;
}

function SpinnerInline({
  label,
  className,
  labelClassName,
  gapClassName,
  size = "sm",
  tone = "primary",
  "aria-label": ariaLabel,
  ...props
}: SpinnerInlineProps) {
  return (
    <span className={cn("inline-flex items-center", gapClassName ?? "gap-2")}>
      <Spinner
        size={size}
        tone={tone}
        className={className}
        aria-label={ariaLabel ?? label ?? undefined}
        {...props}
      />
      {label ? <span className={labelClassName}>{label}</span> : null}
    </span>
  );
}

interface SpinnerBlockProps extends Omit<SpinnerInlineProps, "gapClassName"> {
  fullScreen?: boolean;
}

function SpinnerBlock({
  fullScreen = false,
  label,
  className,
  labelClassName,
  size = "lg",
  tone = "primary",
  "aria-label": ariaLabel,
  ...props
}: SpinnerBlockProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3",
        fullScreen ? "min-h-screen" : "min-h-[180px]"
      )}>
      <Spinner
        size={size}
        tone={tone}
        className={className}
        aria-label={ariaLabel ?? label ?? t("compUi.loading")}
        {...props}
      />
      {label ? (
        <span className={cn("text-muted-foreground text-sm", labelClassName)}>{label}</span>
      ) : null}
    </div>
  );
}

interface SpinnerButtonProps extends SpinnerInlineProps {
  containerClassName?: string;
}

function SpinnerButton({
  label,
  className,
  labelClassName,
  containerClassName,
  size = "sm",
  tone = "white",
  "aria-label": ariaLabel,
  ...props
}: SpinnerButtonProps) {
  const { t } = useTranslation();
  return (
    <SpinnerInline
      size={size}
      tone={tone}
      className={className}
      label={label}
      labelClassName={cn("text-current", labelClassName)}
      gapClassName={cn("gap-2", containerClassName)}
      aria-label={ariaLabel ?? label ?? t("compUi.loading")}
      {...props}
    />
  );
}

export { Spinner, SpinnerBlock, SpinnerButton, SpinnerInline };
