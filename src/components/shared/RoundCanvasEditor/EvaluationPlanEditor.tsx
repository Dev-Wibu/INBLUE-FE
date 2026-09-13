import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
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
  maxScore: EVALUATION_SCORE_MAX,
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const metrics = value?.metrics ?? [];
  const validation = validateEvaluationPlan(value);
  const totalWeight = metrics.reduce((sum, metric) => sum + Number(metric.weight ?? 0), 0);
  const hasValidWeight = !validation.totalWeight;
  const hasTouchedWeight = metrics.some((_, index) => touchedFields.has(`metric.${index}.weight`));
  const showWeightError = Boolean(validation.totalWeight && (showAllErrors || hasTouchedWeight));
  const weightBarPercent = Math.max(0, Math.min(100, totalWeight));

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

  const metricHasVisibleError = (index: number) => {
    const errors = validation.metricErrors[index];
    if (!errors) return false;
    return (Object.keys(errors) as (keyof typeof errors)[]).some((field) =>
      shouldShowError(`metric.${index}.${field}`, errors[field])
    );
  };

  const updateMetric = (index: number, patch: Partial<UIEvaluationMetric>) => {
    const nextMetrics = metrics.map((metric, metricIndex) =>
      metricIndex === index ? { ...metric, ...patch } : metric
    );
    onChange({ ...value, metrics: nextMetrics });
  };

  const removeMetric = (index: number) => {
    onChange({ ...value, metrics: metrics.filter((_, metricIndex) => metricIndex !== index) });
    setEditingIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  };

  const toggleEdit = (index: number) => {
    setEditingIndex((current) => (current === index ? null : index));
  };

  const addMetric = () => {
    const nextIndex = metrics.length;
    onChange({ ...value, metrics: [...metrics, { ...EMPTY_METRIC }] });
    setEditingIndex(nextIndex);
  };

  const parseNumberInput = (raw: string): number | undefined => {
    if (raw.trim() === "") return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const updateWeight = (index: number, raw: string) => {
    const parsed = parseNumberInput(raw);
    updateMetric(index, {
      weight: parsed === undefined ? undefined : Math.max(0, Math.min(100, parsed)),
    });
  };

  const updateMaxScore = (index: number, raw: string) => {
    const parsed = parseNumberInput(raw);
    updateMetric(index, {
      maxScore:
        parsed === undefined ? undefined : Math.max(0, Math.min(EVALUATION_SCORE_MAX, parsed)),
    });
  };

  const handleMaxScoreBlur = (index: number, maxScore?: number) => {
    touchField(`metric.${index}.maxScore`);
    if (maxScore === undefined || maxScore === null) {
      updateMetric(index, { maxScore: EVALUATION_SCORE_MAX });
    }
  };

  const updateMinimumScore = (index: number, raw: string, maxScore: number) => {
    const parsed = parseNumberInput(raw);
    updateMetric(index, {
      minimumScore: parsed === undefined ? undefined : Math.max(0, Math.min(maxScore, parsed)),
    });
  };

  const inlineInputClass =
    "h-8 border-slate-200 bg-white text-xs transition-colors hover:border-indigo-300 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-indigo-700";

  const inlineNumberInputClass = cn(
    inlineInputClass,
    "px-2 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
  );

  return (
    <section className="min-w-0 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
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
            "flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold",
            hasValidWeight
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
          )}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          {t("roundAi.totalWeight", "Tổng trọng số")}: {totalWeight}%
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              hasValidWeight ? "bg-emerald-500" : "bg-rose-700"
            )}
            style={{ width: `${weightBarPercent}%` }}
          />
        </div>
      )}

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
        <div className="min-w-0 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("roundAi.metricCodeShort", "Code")}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("roundAi.metricNameShort", "Tên tiêu chí")}
                </TableHead>
                <TableHead className="w-24 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("roundAi.weightShort", "Weight")}
                </TableHead>
                <TableHead className="w-20 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("roundAi.maxScoreShort", "Max")}
                </TableHead>
                <TableHead className="w-20 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("roundAi.minimumScoreShort", "Min")}
                </TableHead>
                <TableHead className="w-20 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("roundAi.requiredShort", "Required")}
                </TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric, index) => {
                const isEditing = editingIndex === index;
                const hasError = metricHasVisibleError(index);
                const maxScoreForMin = metric.maxScore ?? EVALUATION_SCORE_MAX;
                return (
                  <Fragment key={index}>
                    <TableRow
                      className={cn(
                        !isEditing && "cursor-pointer",
                        isEditing && "bg-indigo-50/60 dark:bg-indigo-950/20",
                        hasError && !isEditing && "bg-red-50/60 dark:bg-red-950/10"
                      )}
                      onClick={() => !isEditing && toggleEdit(index)}>
                      <TableCell
                        className={cn("py-2.5 align-top", isEditing && "whitespace-normal")}
                        onClick={(event) => isEditing && event.stopPropagation()}>
                        {isEditing ? (
                          <>
                            <Input
                              value={metric.code ?? ""}
                              onChange={(event) =>
                                updateMetric(index, {
                                  code: event.target.value
                                    .toUpperCase()
                                    .replace(/[^A-Z0-9_]/g, "_"),
                                })
                              }
                              onBlur={() => touchField(`metric.${index}.code`)}
                              maxLength={METRIC_CODE_MAX_LENGTH}
                              aria-invalid={shouldShowError(
                                `metric.${index}.code`,
                                validation.metricErrors[index]?.code
                              )}
                              placeholder="TECH_DEPTH"
                              className={cn(inlineInputClass, "w-full font-mono")}
                            />
                            {shouldShowError(
                              `metric.${index}.code`,
                              validation.metricErrors[index]?.code
                            ) && (
                              <p className="mt-1 text-[10px] leading-tight text-red-600 dark:text-red-400">
                                {getValidationMessage(validation.metricErrors[index].code)}
                              </p>
                            )}
                          </>
                        ) : metric.code ? (
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                            {metric.code}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic dark:text-slate-500">
                            {t("roundAi.noCode", "chưa có mã")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "overflow-hidden py-2.5 align-top",
                          isEditing && "whitespace-normal"
                        )}
                        onClick={(event) => isEditing && event.stopPropagation()}>
                        {isEditing ? (
                          <>
                            <Input
                              value={metric.name ?? ""}
                              onChange={(event) =>
                                updateMetric(index, { name: event.target.value })
                              }
                              onBlur={() => touchField(`metric.${index}.name`)}
                              maxLength={METRIC_NAME_MAX_LENGTH}
                              aria-invalid={shouldShowError(
                                `metric.${index}.name`,
                                validation.metricErrors[index]?.name
                              )}
                              placeholder={t(
                                "roundAi.metricNamePlaceholder",
                                "Ví dụ: Độ sâu kỹ thuật"
                              )}
                              className={inlineInputClass}
                            />
                            {shouldShowError(
                              `metric.${index}.name`,
                              validation.metricErrors[index]?.name
                            ) && (
                              <p className="mt-1 text-[10px] leading-tight text-red-600 dark:text-red-400">
                                {getValidationMessage(validation.metricErrors[index].name)}
                              </p>
                            )}
                          </>
                        ) : (
                          <span
                            className="block truncate text-xs font-medium text-slate-700 dark:text-slate-200"
                            title={metric.name}>
                            {metric.name ||
                              t("roundAi.metricNumber", "Tiêu chí {{number}}", {
                                number: index + 1,
                              })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn("py-2.5 align-top", isEditing && "whitespace-normal")}
                        onClick={(event) => isEditing && event.stopPropagation()}>
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={100}
                              value={metric.weight ?? ""}
                              onChange={(event) => updateWeight(index, event.target.value)}
                              onBlur={() => touchField(`metric.${index}.weight`)}
                              aria-invalid={shouldShowError(
                                `metric.${index}.weight`,
                                validation.metricErrors[index]?.weight
                              )}
                              className={inlineNumberInputClass}
                            />
                            {shouldShowError(
                              `metric.${index}.weight`,
                              validation.metricErrors[index]?.weight
                            ) && (
                              <p className="mt-1 text-[10px] leading-tight text-red-600 dark:text-red-400">
                                {getValidationMessage(validation.metricErrors[index].weight)}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="block text-right text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                            {metric.weight ?? 0}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn("py-2.5 align-top", isEditing && "whitespace-normal")}
                        onClick={(event) => isEditing && event.stopPropagation()}>
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={EVALUATION_SCORE_MAX}
                              value={metric.maxScore ?? ""}
                              onChange={(event) => updateMaxScore(index, event.target.value)}
                              onBlur={() => handleMaxScoreBlur(index, metric.maxScore)}
                              aria-invalid={shouldShowError(
                                `metric.${index}.maxScore`,
                                validation.metricErrors[index]?.maxScore
                              )}
                              className={inlineNumberInputClass}
                            />
                            {shouldShowError(
                              `metric.${index}.maxScore`,
                              validation.metricErrors[index]?.maxScore
                            ) && (
                              <p className="mt-1 text-[10px] leading-tight text-red-600 dark:text-red-400">
                                {getValidationMessage(validation.metricErrors[index].maxScore)}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="block text-right text-xs text-slate-600 tabular-nums dark:text-slate-300">
                            {metric.maxScore ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn("py-2.5 align-top", isEditing && "whitespace-normal")}
                        onClick={(event) => isEditing && event.stopPropagation()}>
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={maxScoreForMin}
                              value={metric.minimumScore ?? ""}
                              onChange={(event) =>
                                updateMinimumScore(index, event.target.value, maxScoreForMin)
                              }
                              onBlur={() => touchField(`metric.${index}.minimumScore`)}
                              aria-invalid={shouldShowError(
                                `metric.${index}.minimumScore`,
                                validation.metricErrors[index]?.minimumScore
                              )}
                              className={inlineNumberInputClass}
                            />
                            {shouldShowError(
                              `metric.${index}.minimumScore`,
                              validation.metricErrors[index]?.minimumScore
                            ) && (
                              <p className="mt-1 text-[10px] leading-tight text-red-600 dark:text-red-400">
                                {getValidationMessage(validation.metricErrors[index].minimumScore)}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="block text-right text-xs text-slate-600 tabular-nums dark:text-slate-300">
                            {metric.minimumScore ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className="py-2.5 align-top"
                        onClick={(event) => isEditing && event.stopPropagation()}>
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={metric.required ?? false}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              updateMetric(index, { required: checked });
                              if (checked) touchField(`metric.${index}.minimumScore`);
                            }}
                            aria-label={t("roundAi.required", "Bắt buộc đạt")}
                            className="h-4 w-4 cursor-pointer accent-rose-600"
                          />
                        ) : metric.required ? (
                          <Check
                            className="h-4 w-4 text-rose-600 dark:text-rose-400"
                            aria-label={t("roundAi.required", "Bắt buộc đạt")}
                          />
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7",
                              isEditing
                                ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300"
                                : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleEdit(index);
                            }}
                            title={t("roundAi.editMetric", "Sửa tiêu chí")}
                            aria-label={t("roundAi.editMetric", "Sửa tiêu chí")}>
                            {isEditing ? (
                              <X className="h-3.5 w-3.5" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeMetric(index);
                            }}
                            title={t("roundAi.removeMetric", "Xóa tiêu chí")}
                            aria-label={t("roundAi.removeMetric", "Xóa tiêu chí")}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isEditing && (
                      <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-900/40">
                        <TableCell colSpan={7} className="p-4 pt-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">
                              {t("common.description", "Mô tả")}
                            </Label>
                            <Textarea
                              value={metric.description ?? ""}
                              onChange={(event) =>
                                updateMetric(index, { description: event.target.value })
                              }
                              onBlur={() => touchField(`metric.${index}.description`)}
                              maxLength={METRIC_DESCRIPTION_MAX_LENGTH}
                              aria-invalid={shouldShowError(
                                `metric.${index}.description`,
                                validation.metricErrors[index]?.description
                              )}
                              rows={2}
                              className="border-slate-200 bg-white text-xs transition-colors hover:border-indigo-300 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-indigo-700"
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

                          <div className="mt-3 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1.5 text-xs"
                              onClick={() => setEditingIndex(null)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t("roundAi.doneEditingMetric", "Xong")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={addMetric}>
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
