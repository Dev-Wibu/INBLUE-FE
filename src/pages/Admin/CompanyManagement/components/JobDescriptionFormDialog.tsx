import { DateTimePicker } from "@/components/shared";
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
  const effectiveSubmitLabel = submitLabel || t("general.save", "Lưu");
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-border/10 border-b px-6 pt-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Two-Column Form Layout */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden p-6 lg:grid-cols-5">
          {/* Left Column: Large text editing fields (Col-span 3) */}
          <ScrollArea className="max-h-[55vh] pr-2 lg:col-span-3">
            <div className="space-y-4 pb-2">
              <div className="space-y-1.5">
                <Label htmlFor="jd-description" className="font-semibold">
                  {t("common.describe")}
                </Label>
                <Textarea
                  id="jd-description"
                  value={formData.description || ""}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder={t("common.jobDescription")}
                  rows={6}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jd-requirements" className="font-semibold">
                  {t("adminCompanymanagement.request")}
                </Label>
                <Textarea
                  id="jd-requirements"
                  value={formData.requirements || ""}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      requirements: e.target.value,
                    })
                  }
                  placeholder={t("common.candidateRequirements")}
                  rows={6}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jd-benefits" className="font-semibold">
                  {t("common.welfare")}
                </Label>
                <Textarea
                  id="jd-benefits"
                  value={formData.benefits || ""}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      benefits: e.target.value,
                    })
                  }
                  placeholder={t("adminCompanymanagement.welfareBenefits")}
                  rows={6}
                />
              </div>
            </div>
          </ScrollArea>

          {/* Right Column: General form settings fields (Col-span 2) */}
          <div className="space-y-4 lg:col-span-2">
            <div className="space-y-1.5">
              <Label htmlFor="jd-title" className="font-semibold">
                {t("common.title1")}
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
                placeholder={t("adminCompanymanagement.enterJdTitle")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="jd-level" className="font-semibold">
                  {t("general.level")}
                </Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) =>
                    onFormChange({
                      ...formData,
                      level: value as JobDescriptionLevel,
                    })
                  }>
                  <SelectTrigger id="jd-level">
                    <SelectValue placeholder={t("common.chooseLevel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jd-status" className="font-semibold">
                  {t("general.status")}
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    onFormChange({
                      ...formData,
                      status: value as JobDescriptionStatus,
                    })
                  }>
                  <SelectTrigger id="jd-status">
                    <SelectValue placeholder={t("common.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="jd-salary-min" className="font-semibold">
                  {t("adminCompanymanagement.minimumWage")}
                </Label>
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
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jd-salary-max" className="font-semibold">
                  {t("adminCompanymanagement.maximumSalary")}
                </Label>
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
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jd-price" className="font-semibold">
                {t("adminCompanymanagement.packagePrice", "Giá gói mua JD (VNĐ)")}
              </Label>
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
                placeholder={t(
                  "adminCompanymanagement.packagePricePlaceholder",
                  "Nhập giá gói (0 = miễn phí)"
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="jd-currency" className="font-semibold">
                  {t("adminCompanymanagement.currencyUnit")}
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
                  placeholder={t("common.currency")}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="jd-deadline" className="font-semibold">
                  {t("adminCompanymanagement.applicationDeadline")}
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
        </div>

        <DialogFooter className="border-border/50 bg-card/30 flex shrink-0 justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("general.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
