import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw } from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
type ReloadAction = () => void | Promise<unknown>;
export type ReloadButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  onReload: ReloadAction;
  isLoading?: boolean;
  tooltip?: string;
  label?: string;
  showLabel?: boolean;
  hideTooltip?: boolean;
};
export function ReloadButton({
  onReload,
  isLoading,
  tooltip,
  label,
  showLabel = false,
  hideTooltip = false,
  disabled,
  size,
  variant = "outline",
  type = "button",
  ...buttonProps
}: ReloadButtonProps) {
  const { t } = useTranslation();
  const resolvedTooltip = tooltip ?? t("compShared.reloadList");
  const resolvedLabel = label ?? t("common.reload");
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isLoading ?? internalLoading;
  const computedSize = size ?? (showLabel ? "sm" : "icon-sm");
  const handleReload = useCallback(async () => {
    if (loading || disabled) {
      return;
    }
    if (isLoading !== undefined) {
      await onReload();
      return;
    }
    setInternalLoading(true);
    try {
      await onReload();
    } finally {
      setInternalLoading(false);
    }
  }, [loading, disabled, isLoading, onReload]);
  const content = (
    <Button
      type={type}
      variant={variant}
      size={computedSize}
      disabled={disabled || loading}
      aria-label={showLabel ? resolvedLabel : resolvedTooltip}
      aria-busy={loading}
      onClick={handleReload}
      {...buttonProps}>
      {loading ? (
        <Spinner className="size-4" aria-label={t("compShared.reloading")} />
      ) : (
        <RefreshCw className="size-4" />
      )}
      {showLabel ? <span>{resolvedLabel}</span> : null}
    </Button>
  );
  if (hideTooltip) {
    return content;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{content}</span>
      </TooltipTrigger>
      <TooltipContent>{resolvedTooltip}</TooltipContent>
    </Tooltip>
  );
}
