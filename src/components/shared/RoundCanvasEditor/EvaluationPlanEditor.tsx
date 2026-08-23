import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  EVALUATION_INSTRUCTION_MAX_LENGTH,
  EVALUATION_SCORE_MAX,
  METRIC_CODE_MAX_LENGTH,
  METRIC_DESCRIPTION_MAX_LENGTH,
  METRIC_NAME_MAX_LENGTH,
  validateEvaluationPlan,
  type EvaluationValidationCode,
} from "./evaluation-plan-validation";
import type { UIEvaluationMetric, UIEvaluationPlan } from "./types";

interface EvaluationPlanEditorProps {
  value?: UIEvaluationPlan;
  onChange: (_value: UIEvaluationPlan) => void;
  showAllErrors?: boolean;
}

const EMPTY_METRIC: UIEvaluationMetric = {
  code: "",
  name: "",
  description: "",
  weight: 0,
  maxScore: 100,
  required: false,
  minimumScore: 0,
};

export function EvaluationPlanEditor({
  value,
  onChange,
  showAllErrors = false,
}: EvaluationPlanEditorProps) {
  const { t } = useTranslation();
  const [touchedFields, setTouchedFields] = useState<Set<string>>(() => new Set());
  const metrics = value?.metrics ?? [];
  const validation = validateEvaluationPlan(value);
  const totalWeight = metrics.reduce((sum, metric) => sum + Number(metric.weight ?? 0), 0);
  const hasValidWeight = !validation.totalWeight;
  const hasTouchedWeight = metrics.some((_, index) => touchedFields.has(`metric.${index}.weight`));
  const showWeightError = Boolean(validation.totalWeight && (showAllErrors || hasTouchedWeight));

  useEffect(() => {
    setTouchedFields(new Set());
  }, [metrics.length]);

  const touchField = (field: string) => {
    setTouchedFields((current) => new Set(current).add(field));
  };

  const shouldShowError = (field: string, error?: EvaluationValidationCode) =>
    Boolean(error && (showAllErrors || touchedFields.has(field)));

  const getValidationMessage = (code?: EvaluationValidationCode) => {
    switch (code) {
      case "required":
        return t("roundAi.validation.required", "Trường này là bắt buộc.");
      case "invalidCode":
        return t(
          "roundAi.validation.invalidCode",
          "Mã phải có dạng UPPER_SNAKE_CASE, ví dụ TECH_DEPTH."
        );
      case "duplicateCode":
        return t(
          "roundAi.validation.duplicateCode",
          "Mã tiêu chí không được trùng trong cùng vòng."
        );
      case "tooLong":
        return t("roundAi.validation.tooLong", "Nội dung vượt quá độ dài cho phép.");
      case "invalidWeight":
        return t("roundAi.validation.invalidWeight", "Trọng số phải lớn hơn 0 và không quá 100.");
      case "invalidMaxScore":
        return t("roundAi.validation.invalidMaxScore", "Điểm tối đa phải từ trên 0 đến 100.");
      case "invalidMinimumScore":
        return t("roundAi.validation.invalidMinimumScore", "Điểm sàn phải từ 0 đến điểm tối đa.");
      case "requiredMinimumScore":
        return t(
          "roundAi.validation.requiredMinimumScore",
          "Tiêu chí bắt buộc phải có điểm sàn lớn hơn 0."
        );
      case "invalidTotalWeight":
        return t("roundAi.validation.invalidTotalWeight", "Tổng trọng số phải bằng 100%.");
      default:
        return "";
    }
  };

  const parseOptionalNumber = (rawValue: string) =>
    rawValue.trim() === "" ? undefined : Number(rawValue);

  const updateMetric = (index: number, patch: Partial<UIEvaluationMetric>) => {
    const nextMetrics = metrics.map((metric, metricIndex) =>
      metricIndex === index ? { ...metric, ...patch } : metric
    );
    onChange({ ...value, metrics: nextMetrics });
  };

  const removeMetric = (index: number) => {
    onChange({ ...value, metrics: metrics.filter((_, metricIndex) => metricIndex !== index) });
  };

  return (
    <section className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t("roundAi.evaluationPlan", "Bộ tiêu chí đánh giá")}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {t(
              "roundAi.evaluationPlanDescription",
              "Thiết lập tiêu chí, trọng số và điểm sàn riêng cho vòng này."
            )}
          </p>
        </div>
        <div
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold",
            hasValidWeight
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
              : showWeightError
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          )}>
          {hasValidWeight ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : showWeightError ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : null}
          {t("roundAi.totalWeight", "Tổng trọng số")}: {totalWeight}%
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {t("roundAi.noMetrics", "Chưa có tiêu chí đánh giá có cấu trúc")}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t("roundAi.noMetricsHint", "Thêm tiêu chí để chấm điểm nhất quán theo trọng số.")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {metrics.map((metric, index) => (
            <div
              key={`${metric.code ?? "metric"}-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t("roundAi.metricNumber", "Tiêu chí {{number}}", { number: index + 1 })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  onClick={() => removeMetric(index)}
                  title={t("roundAi.removeMetric", "Xóa tiêu chí")}
                  aria-label={t("roundAi.removeMetric", "Xóa tiêu chí")}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("roundAi.metricCode", "Mã")}</Label>
                  <Input
                    value={metric.code ?? ""}
                    onChange={(event) =>
                      updateMetric(index, {
                        code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
                      })
                    }
                    onBlur={() => touchField(`metric.${index}.code`)}
                    maxLength={METRIC_CODE_MAX_LENGTH}
                    aria-invalid={shouldShowError(
                      `metric.${index}.code`,
                      validation.metricErrors[index]?.code
                    )}
                    placeholder="TECH_DEPTH"
                    className="h-9 font-mono text-xs"
                  />
                  {shouldShowError(
                    `metric.${index}.code`,
                    validation.metricErrors[index]?.code
                  ) && (
                    <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">
                      {getValidationMessage(validation.metricErrors[index].code)}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("roundAi.metricName", "Tên")}</Label>
                  <Input
                    value={metric.name ?? ""}
                    onChange={(event) => updateMetric(index, { name: event.target.value })}
                    onBlur={() => touchField(`metric.${index}.name`)}
                    maxLength={METRIC_NAME_MAX_LENGTH}
                    aria-invalid={shouldShowError(
                      `metric.${index}.name`,
                      validation.metricErrors[index]?.name
                    )}
                    placeholder={t("roundAi.metricNamePlaceholder", "Ví dụ: Độ sâu kỹ thuật")}
                    className="h-9 text-xs"
                  />
                  {shouldShowError(
                    `metric.${index}.name`,
                    validation.metricErrors[index]?.name
                  ) && (
                    <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">
                      {getValidationMessage(validation.metricErrors[index].name)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <Label className="text-xs font-semibold">{t("common.description", "Mô tả")}</Label>
                <Textarea
                  value={metric.description ?? ""}
                  onChange={(event) => updateMetric(index, { description: event.target.value })}
                  onBlur={() => touchField(`metric.${index}.description`)}
                  maxLength={METRIC_DESCRIPTION_MAX_LENGTH}
                  aria-invalid={shouldShowError(
                    `metric.${index}.description`,
                    validation.metricErrors[index]?.description
                  )}
                  rows={2}
                  className="text-xs"
                />
                {shouldShowError(
                  `metric.${index}.description`,
                  validation.metricErrors[index]?.description
                ) && (
                  <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">
                    {getValidationMessage(validation.metricErrors[index].description)}
                  </p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {t("roundAi.weight", "Trọng số (%)")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={metric.weight ?? ""}
                    onChange={(event) =>
                      updateMetric(index, { weight: parseOptionalNumber(event.target.value) })
                    }
                    onBlur={() => touchField(`metric.${index}.weight`)}
                    aria-invalid={shouldShowError(
                      `metric.${index}.weight`,
                      validation.metricErrors[index]?.weight
                    )}
                    className="h-9 text-xs"
                  />
                  {shouldShowError(
                    `metric.${index}.weight`,
                    validation.metricErrors[index]?.weight
                  ) && (
                    <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">
                      {getValidationMessage(validation.metricErrors[index].weight)}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {t("roundAi.maxScore", "Điểm tối đa")}
                  </Label>
                  <Input
                    type="number"
                    min={0.01}
                    max={EVALUATION_SCORE_MAX}
                    step="any"
                    value={metric.maxScore ?? ""}
                    onChange={(event) =>
                      updateMetric(index, { maxScore: parseOptionalNumber(event.target.value) })
                    }
                    onBlur={() => touchField(`metric.${index}.maxScore`)}
                    aria-invalid={shouldShowError(
                      `metric.${index}.maxScore`,
                      validation.metricErrors[index]?.maxScore
                    )}
                    className="h-9 text-xs"
                  />
                  {shouldShowError(
                    `metric.${index}.maxScore`,
                    validation.metricErrors[index]?.maxScore
                  ) && (
                    <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">
                      {getValidationMessage(validation.metricErrors[index].maxScore)}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {t("roundAi.minimumScore", "Điểm sàn")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={metric.maxScore ?? EVALUATION_SCORE_MAX}
                    step="any"
                    value={metric.minimumScore ?? ""}
                    onChange={(event) =>
                      updateMetric(index, { minimumScore: parseOptionalNumber(event.target.value) })
                    }
                    onBlur={() => touchField(`metric.${index}.minimumScore`)}
                    aria-invalid={shouldShowError(
                      `metric.${index}.minimumScore`,
                      validation.metricErrors[index]?.minimumScore
                    )}
                    className="h-9 text-xs"
                  />
                  {shouldShowError(
                    `metric.${index}.minimumScore`,
                    validation.metricErrors[index]?.minimumScore
                  ) && (
                    <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">
                      {getValidationMessage(validation.metricErrors[index].minimumScore)}
                    </p>
                  )}
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <Checkbox
                      checked={metric.required ?? false}
                      onCheckedChange={(checked) => {
                        updateMetric(index, { required: checked === true });
                        if (checked === true) touchField(`metric.${index}.minimumScore`);
                      }}
                    />
                    {t("roundAi.required", "Bắt buộc đạt")}
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => onChange({ ...value, metrics: [...metrics, { ...EMPTY_METRIC }] })}>
        <Plus className="h-3.5 w-3.5" />
        {t("roundAi.addMetric", "Thêm tiêu chí")}
      </Button>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            {t("roundAi.scoringInstruction", "Hướng dẫn chấm điểm")}
          </Label>
          <Textarea
            value={value?.scoringInstruction ?? ""}
            onChange={(event) => onChange({ ...value, scoringInstruction: event.target.value })}
            onBlur={() => touchField("scoringInstruction")}
            maxLength={EVALUATION_INSTRUCTION_MAX_LENGTH}
            aria-invalid={shouldShowError("scoringInstruction", validation.scoringInstruction)}
            rows={3}
            className="text-xs"
          />
          {shouldShowError("scoringInstruction", validation.scoringInstruction) && (
            <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">
              {getValidationMessage(validation.scoringInstruction)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">{t("roundAi.passRule", "Quy tắc đạt")}</Label>
          <Textarea
            value={value?.passRule ?? ""}
            onChange={(event) => onChange({ ...value, passRule: event.target.value })}
            onBlur={() => touchField("passRule")}
            maxLength={EVALUATION_INSTRUCTION_MAX_LENGTH}
            aria-invalid={shouldShowError("passRule", validation.passRule)}
            rows={3}
            className="text-xs"
          />
          {shouldShowError("passRule", validation.passRule) && (
            <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">
              {getValidationMessage(validation.passRule)}
            </p>
          )}
        </div>
      </div>

      {showWeightError && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {getValidationMessage(validation.totalWeight)}
        </p>
      )}
    </section>
  );
}
