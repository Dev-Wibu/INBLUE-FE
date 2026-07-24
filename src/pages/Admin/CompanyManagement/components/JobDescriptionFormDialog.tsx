import { DateTimePicker } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, DollarSign, FileCheck, Gift, Sparkles, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { JobDescriptionFormData, JobDescriptionLevel, JobDescriptionStatus } from "../types";

interface JobDescriptionFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Partial<JobDescriptionFormData>;
  onFormChange: (data: Partial<JobDescriptionFormData>) => void;
  onSubmit: () => void;
  title: string;
  description: string;
  submitLabel?: string;
  isSubmitting?: boolean;
}

const LEVEL_OPTIONS: JobDescriptionLevel[] = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE"];
const STATUS_OPTIONS: JobDescriptionStatus[] = ["OPEN", "CLOSED", "DRAFT"];

export function JobDescriptionFormDialog({
  isOpen,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  title,
  description,
  submitLabel,
  isSubmitting = false,
}: JobDescriptionFormDialogProps) {
  const { t } = useTranslation();
  const effectiveSubmitLabel = submitLabel || t("general.save", "Lưu thay đổi");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden border-slate-200 p-0 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── TWO-COLUMN FORM BODY ──────────────────────────────────────────── */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden bg-white p-6 lg:grid-cols-5 dark:bg-slate-900">
          {/* Left Column: Long Text Content Fields (Col-span 3) */}
          <ScrollArea className="max-h-[60vh] pr-3 lg:col-span-3">
            <div className="space-y-5 pb-2">
              {/* Job Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <Label
                    htmlFor="jd-description"
                    className="text-xs font-bold text-slate-900 dark:text-white">
                    {t("common.describe", "Mô tả công việc")}
                  </Label>
                </div>
                <Textarea
                  id="jd-description"
                  value={formData.description || ""}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder={t(
                    "common.jobDescription",
                    "Nhập chi tiết các nhiệm vụ và trách nhiệm công việc..."
                  )}
                  rows={5}
                  className="border-slate-200 text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-emerald-500" />
                  <Label
                    htmlFor="jd-requirements"
                    className="text-xs font-bold text-slate-900 dark:text-white">
                    {t("adminCompanymanagement.request", "Yêu cầu ứng viên")}
                  </Label>
                </div>
                <Textarea
                  id="jd-requirements"
                  value={formData.requirements || ""}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      requirements: e.target.value,
                    })
                  }
                  placeholder={t(
                    "common.candidateRequirements",
                    "Nhập các kỹ năng, kinh nghiệm và bằng cấp bắt buộc..."
                  )}
                  rows={5}
                  className="border-slate-200 text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-purple-500" />
                  <Label
                    htmlFor="jd-benefits"
                    className="text-xs font-bold text-slate-900 dark:text-white">
                    {t("common.welfare", "Phúc lợi & Đãi ngộ")}
                  </Label>
                </div>
                <Textarea
                  id="jd-benefits"
                  value={formData.benefits || ""}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      benefits: e.target.value,
                    })
                  }
                  placeholder={t(
                    "adminCompanymanagement.welfareBenefits",
                    "Nhập thông tin lương thưởng, bảo hiểm, đào tạo..."
                  )}
                  rows={4}
                  className="border-slate-200 text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </ScrollArea>

          {/* Right Column: General Job Settings Fields (Col-span 2) */}
          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 lg:col-span-2 dark:border-slate-800/80 dark:bg-slate-950/40">
            <h4 className="text-xs font-bold tracking-wider text-slate-900 uppercase dark:text-white">
              Thông số thiết lập
            </h4>

            {/* Title */}
            <div className="space-y-1.5">
              <Label
                htmlFor="jd-title"
                className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("common.title1", "Tên vị trí (Title)")}
              </Label>
              <Input
                id="jd-title"
                value={formData.title || ""}
                onChange={(e) =>
                  onFormChange({
                    ...formData,
                    title: e.target.value,
                  })
                }
                placeholder={t("adminCompanymanagement.enterJdTitle", "VD: Senior Java Engineer")}
                className="h-9 border-slate-200 text-xs font-medium focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            {/* Level & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="jd-level"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("general.level", "Cấp bậc")}
                </Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) =>
                    onFormChange({
                      ...formData,
                      level: value as JobDescriptionLevel,
                    })
                  }>
                  <SelectTrigger
                    id="jd-level"
                    className="h-9 border-slate-200 text-xs dark:border-slate-800 dark:bg-slate-900">
                    <SelectValue placeholder={t("common.chooseLevel", "Chọn level")} />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((level) => (
                      <SelectItem key={level} value={level} className="text-xs">
                        <span className="font-semibold">{level}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="jd-status"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("general.status", "Trạng thái")}
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    onFormChange({
                      ...formData,
                      status: value as JobDescriptionStatus,
                    })
                  }>
                  <SelectTrigger
                    id="jd-status"
                    className="h-9 border-slate-200 text-xs dark:border-slate-800 dark:bg-slate-900">
                    <SelectValue placeholder={t("common.selectStatus", "Trạng thái")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status} className="text-xs">
                        <Badge
                          className={
                            status === "OPEN"
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : status === "CLOSED"
                                ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                : "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                          }>
                          {status}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Salary Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="jd-salary-min"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("adminCompanymanagement.minimumWage", "Lương tối thiểu")}
                </Label>
                <div className="relative">
                  <DollarSign className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="jd-salary-min"
                    type="number"
                    min={0}
                    value={formData.salaryMin ?? ""}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        salaryMin: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="h-9 border-slate-200 pl-8 font-mono text-xs dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="jd-salary-max"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("adminCompanymanagement.maximumSalary", "Lương tối đa")}
                </Label>
                <div className="relative">
                  <DollarSign className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="jd-salary-max"
                    type="number"
                    min={0}
                    value={formData.salaryMax ?? ""}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        salaryMax: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="h-9 border-slate-200 pl-8 font-mono text-xs dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Currency & Package Price */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <Label
                  htmlFor="jd-currency"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("adminCompanymanagement.currencyUnit", "Tiền tệ")}
                </Label>
                <Input
                  id="jd-currency"
                  value={formData.currency || ""}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      currency: e.target.value,
                    })
                  }
                  placeholder="USD"
                  className="h-9 border-slate-200 font-mono text-xs dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label
                  htmlFor="jd-price"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("adminCompanymanagement.packagePrice", "Giá gói mua (VNĐ)")}
                </Label>
                <div className="relative">
                  <Tag className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="jd-price"
                    type="number"
                    min={0}
                    value={formData.price ?? ""}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        price: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="0 = Miễn phí"
                    className="h-9 border-slate-200 pl-8 font-mono text-xs dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-1.5">
              <Label
                htmlFor="jd-deadline"
                className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("adminCompanymanagement.applicationDeadline", "Hạn nộp ứng tuyển")}
              </Label>
              <DateTimePicker
                value={formData.deadlineAt ? new Date(formData.deadlineAt) : null}
                onChange={(date) =>
                  onFormChange({
                    ...formData,
                    deadlineAt: date ? date.toISOString() : undefined,
                  })
                }
                themeVariant="admin"
              />
            </div>
          </div>
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 dark:border-slate-800/80 dark:bg-slate-900/80">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
            {t("general.cancel", "Hủy bỏ")}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="h-9 bg-indigo-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
            {isSubmitting ? (
              <>
                <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("common.processing", "Đang xử lý...")}
              </>
            ) : (
              effectiveSubmitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
