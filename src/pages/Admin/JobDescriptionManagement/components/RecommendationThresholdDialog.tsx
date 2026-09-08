import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  jobRecommendationAdminManager,
  parseRecommendationThreshold,
} from "@/services/job-recommendation-admin.manager";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BriefcaseBusiness,
  Check,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface RecommendationThresholdDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
}

const THRESHOLD_PRESETS = [
  { value: 50, labelKey: "jobRecommendationThreshold.presets.broad" },
  { value: 70, labelKey: "jobRecommendationThreshold.presets.balanced" },
  { value: 85, labelKey: "jobRecommendationThreshold.presets.strict" },
] as const;

export function RecommendationThresholdDialog({
  open,
  onOpenChange,
}: RecommendationThresholdDialogProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [validationError, setValidationError] = useState("");

  const mutation = useMutation({
    mutationFn: async (thresholdPercent: number) => {
      const result = await jobRecommendationAdminManager.updateThreshold(thresholdPercent);
      if (!result.success || result.data?.thresholdPercent === undefined) {
        throw new Error(result.error || t("common.updateFailed"));
      }
      return result.data;
    },
    onSuccess: ({ thresholdPercent }) => {
      toast.success(t("jobRecommendationThreshold.success", { value: thresholdPercent }));
      setInputValue(String(thresholdPercent));
      setValidationError("");
      onOpenChange(false);
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (mutation.isPending) return;
    if (nextOpen && !open) {
      setInputValue("");
      setValidationError("");
      mutation.reset();
    }
    onOpenChange(nextOpen);
  };

  const setThreshold = (value: string) => {
    setInputValue(value);
    setValidationError("");
    mutation.reset();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = parseRecommendationThreshold(inputValue);
    if (value === null) {
      setValidationError(t("jobRecommendationThreshold.validation"));
      return;
    }
    setValidationError("");
    mutation.mutate(value);
  };

  const parsedValue = parseRecommendationThreshold(inputValue);
  const inputError =
    inputValue.trim() !== "" && parsedValue === null
      ? t("jobRecommendationThreshold.validation")
      : "";
  const displayedError = validationError || inputError || mutation.error?.message;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[20px] border-slate-200/90 bg-white !p-0 shadow-2xl md:w-[880px] md:max-w-[880px] dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <DialogHeader className="shrink-0 border-b border-slate-200/90 bg-slate-100/90 px-6 py-4 pr-14 text-left dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400 dark:ring-indigo-400/30">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {t("jobRecommendationThreshold.title")}
                </DialogTitle>
                <DialogDescription className="mt-0.5 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {t("jobRecommendationThreshold.description")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 overflow-y-auto bg-white md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] dark:bg-slate-900">
            <section
              className="px-6 py-6 md:px-7 md:py-7"
              aria-labelledby="threshold-input-heading">
              <h3
                id="threshold-input-heading"
                className="text-base font-semibold text-slate-950 dark:text-white">
                {t("jobRecommendationThreshold.inputTitle")}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("jobRecommendationThreshold.inputDescription")}
              </p>

              <div className="mt-6">
                <label
                  htmlFor="recommendation-threshold"
                  className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t("jobRecommendationThreshold.label")}
                </label>
                <div className="relative mt-2">
                  <Input
                    id="recommendation-threshold"
                    type="text"
                    inputMode="decimal"
                    maxLength={6}
                    pattern="\d{1,3}(\.\d{1,2})?"
                    value={inputValue}
                    onChange={(event) => setThreshold(event.target.value)}
                    placeholder="0"
                    aria-invalid={Boolean(displayedError)}
                    aria-describedby="recommendation-threshold-message"
                    disabled={mutation.isPending}
                    className="h-14 rounded-xl border-slate-200 bg-slate-50/50 pr-16 text-xl font-bold text-slate-950 placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/80 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-400 dark:focus-visible:bg-slate-950 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-lg font-semibold text-slate-500 dark:text-slate-400">
                    %
                  </span>
                </div>
                <p
                  id="recommendation-threshold-message"
                  role={displayedError ? "alert" : undefined}
                  className={`mt-2 min-h-5 text-xs leading-5 ${displayedError ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {displayedError || t("jobRecommendationThreshold.inputHint")}
                </p>
              </div>

              <fieldset className="mt-5">
                <legend className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t("jobRecommendationThreshold.quickSelect")}
                </legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {THRESHOLD_PRESETS.map((preset) => {
                    const isSelected = parsedValue === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setThreshold(String(preset.value))}
                        disabled={mutation.isPending}
                        className={`relative min-h-16 rounded-xl border px-2 py-2 text-center transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-900 ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-2xs dark:border-indigo-400 dark:bg-indigo-500/15 dark:text-indigo-200"
                            : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-indigo-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:bg-slate-950"
                        }`}>
                        {isSelected && <Check className="absolute top-1.5 right-1.5 h-3.5 w-3.5" />}
                        <span className="block text-base font-bold">{preset.value}%</span>
                        <span className="mt-0.5 block text-[11px] font-medium">
                          {t(preset.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <aside className="border-t border-slate-200 bg-white px-6 py-6 md:border-t-0 md:border-l md:px-7 md:py-7 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                {t("jobRecommendationThreshold.guideTitle")}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("jobRecommendationThreshold.guideDescription")}
              </p>

              <div className="mt-5 flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-950/50">
                <div className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <UserRound className="h-5 w-5 text-indigo-500" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {t("jobRecommendationThreshold.flow.profile")}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {t("jobRecommendationThreshold.flow.compare")}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <BriefcaseBusiness className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {t("jobRecommendationThreshold.flow.recommend")}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex gap-3">
                  <ArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm leading-5 text-slate-700 dark:text-slate-200">
                    {t("jobRecommendationThreshold.higherEffect")}
                  </p>
                </div>
                <div className="flex gap-3">
                  <ArrowDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm leading-5 text-slate-700 dark:text-slate-200">
                    {t("jobRecommendationThreshold.lowerEffect")}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  {parsedValue === null
                    ? t("jobRecommendationThreshold.previewEmpty")
                    : t("jobRecommendationThreshold.preview", { value: parsedValue })}
                </p>
                <p className="mt-1 text-xs leading-5 text-indigo-800 dark:text-indigo-300">
                  {t("jobRecommendationThreshold.scopeNote")}
                </p>
              </div>
            </aside>
          </div>

          <DialogFooter className="w-full shrink-0 gap-2 border-t border-slate-200/90 bg-slate-100/90 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
              className="h-9.5 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || parsedValue === null}
              className="h-9.5 min-w-32 gap-2 rounded-xl bg-indigo-600 px-6 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("jobRecommendationThreshold.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
