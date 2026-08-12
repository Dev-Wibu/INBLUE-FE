import {
  MediaLightboxDialog,
  UniversalMediaUploader,
  type MediaViewerItem,
} from "@/components/shared";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { inferFileKind, openUrlInNewTab } from "@/lib/media-file-utils";
import { Building2, ExternalLink, ImageIcon, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Company, CompanyFormData, CompanyStatus } from "../types";

interface CompanyFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CompanyFormData;
  onFormChange: (data: CompanyFormData) => void;
  onSubmit: () => void;
  title: string;
  description: string;
  submitLabel: string;
  selectedCompany?: Company | null;
  isSubmitting?: boolean;
}

const COMPANY_STATUSES: CompanyStatus[] = ["ACTIVE", "INACTIVE"];

export function CompanyFormDialog({
  isOpen,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  title,
  description,
  submitLabel,
  selectedCompany,
  isSubmitting = false,
}: CompanyFormDialogProps) {
  const { t } = useTranslation();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<MediaViewerItem[]>([]);

  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
      if (bannerPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [bannerPreview, logoPreview]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setLogoPreview(null);
      setBannerPreview(null);
      setViewerOpen(false);
      setViewerItems([]);
    }
    onOpenChange(open);
  };

  const handleLogoChange = (file?: File) => {
    if (!file) {
      handleClearLogo();
      return;
    }
    if (logoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(URL.createObjectURL(file));
    onFormChange({
      ...formData,
      logo: file,
    });
  };

  const handleBannerChange = (file?: File) => {
    if (!file) {
      handleClearBanner();
      return;
    }
    if (bannerPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(bannerPreview);
    }
    setBannerPreview(URL.createObjectURL(file));
    onFormChange({
      ...formData,
      banner: file,
    });
  };

  const handleClearLogo = () => {
    if (logoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(null);
    onFormChange({
      ...formData,
      logo: undefined,
    });
  };

  const handleClearBanner = () => {
    if (bannerPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(bannerPreview);
    }
    setBannerPreview(null);
    onFormChange({
      ...formData,
      banner: undefined,
    });
  };

  const displayLogoUrl = logoPreview || selectedCompany?.logoUrl;
  const displayBannerUrl = bannerPreview || selectedCompany?.bannerUrl;

  const openMediaPreview = (label: string, url?: string | null) => {
    if (!url) return;
    const kind = inferFileKind({ fileName: url });
    if (kind === "other") {
      openUrlInNewTab(url);
      return;
    }
    setViewerItems([
      {
        id: `admin-company-preview-${label}`,
        name: label,
        src: url,
        kind,
        requireAuth: !url.startsWith("blob:"),
      },
    ]);
    setViewerOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-[20px] border border-slate-200/90 bg-white p-0 shadow-2xl sm:max-w-[540px] dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <DialogHeader className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Building2 className="h-4.5 w-4.5" />
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

        {/* Scrollable Form Body */}
        <div className="space-y-4 overflow-y-auto p-5">
          {/* Company Name & Status Row */}
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-[240px] flex-1 space-y-1.5">
              <Label
                htmlFor="company-name"
                className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {t("adminCompanymanagement.companyName", "Tên công ty")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company-name"
                value={formData.name || ""}
                onChange={(e) =>
                  onFormChange({
                    ...formData,
                    name: e.target.value,
                  })
                }
                placeholder={t("adminCompanymanagement.enterTheCompanyName", "VD: VNG Corporation")}
                className="h-10 rounded-xl border border-slate-200/90 bg-slate-50/50 text-xs font-medium focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
              />
            </div>

            <div className="w-[120px] shrink-0 space-y-1.5">
              <Label
                htmlFor="company-status"
                className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {t("common.status", "Trạng thái")}
              </Label>
              <Select
                value={formData.status || "ACTIVE"}
                onValueChange={(value) =>
                  onFormChange({
                    ...formData,
                    status: value as CompanyStatus,
                  })
                }>
                <SelectTrigger
                  id="company-status"
                  className="h-10 rounded-xl border border-slate-200/90 bg-slate-50/50 text-xs font-medium dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100">
                  <SelectValue placeholder={t("common.selectStatus", "Trạng thái")} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {COMPANY_STATUSES.map((status) => (
                    <SelectItem key={status} value={status} className="text-xs font-medium">
                      {status === "ACTIVE"
                        ? t("common.active", "Hoạt động")
                        : t("common.shutDown", "Đã tắt")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="company-description"
              className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t("common.describe", "Mô tả công ty")}
            </Label>
            <Textarea
              id="company-description"
              value={formData.description || ""}
              onChange={(e) =>
                onFormChange({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder={t(
                "adminCompanymanagement.companyDescription",
                "Giới thiệu ngắn về công ty, văn hóa làm việc..."
              )}
              rows={3}
              className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 text-xs leading-relaxed font-medium focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
            />
          </div>

          {/* Media Assets Section */}
          <div className="space-y-2 pt-1">
            <h4 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("adminCompanymanagement.companyMedia", "Hình ảnh thương hiệu")}
            </h4>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Logo Upload Card */}
              <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {t("adminCompanymanagement.companyLogo", "Logo Công ty")}
                    </Label>
                    <span className="text-[10px] font-medium text-slate-400">1:1</span>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                    {displayLogoUrl ? (
                      <div className="group/logo relative">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                          <img
                            src={displayLogoUrl}
                            alt="Logo"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={handleClearLogo}
                            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                      </div>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {logoPreview
                          ? t("common.newFileSelected", "Đã chọn file")
                          : displayLogoUrl
                            ? t("common.currentImage", "Ảnh hiện tại")
                            : t("adminCompanymanagement.noLogoYet", "Chưa có logo")}
                      </span>
                      {displayLogoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            openMediaPreview(
                              t("adminCompanymanagement.companyLogo", "Logo công ty"),
                              displayLogoUrl
                            )
                          }
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                          <span>{t("common.seeFullPhoto", "Xem ảnh")}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <UniversalMediaUploader
                  preset="single-image"
                  onFilesChange={(files) => handleLogoChange(files[0])}
                  customTrigger={
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 w-full gap-1.5 rounded-lg border-slate-200/90 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      <Upload className="h-3 w-3" />
                      {t("common.uploadFile", "Tải logo mới")}
                    </Button>
                  }
                />
              </div>

              {/* Banner Upload Card */}
              <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {t("adminCompanymanagement.companyBanners", "Ảnh Banner bìa")}
                    </Label>
                    <span className="text-[10px] font-medium text-slate-400">16:9</span>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                    {displayBannerUrl ? (
                      <div className="group/banner relative">
                        <div className="h-11 w-18 shrink-0 overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                          <img
                            src={displayBannerUrl}
                            alt="Banner"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                        {bannerPreview && (
                          <button
                            type="button"
                            onClick={handleClearBanner}
                            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-11 w-18 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                      </div>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {bannerPreview
                          ? t("common.newFileSelected", "Đã chọn file")
                          : displayBannerUrl
                            ? t("common.currentImage", "Ảnh hiện tại")
                            : t("adminCompanymanagement.noBannersYet", "Chưa có banner")}
                      </span>
                      {displayBannerUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            openMediaPreview(
                              t("adminCompanymanagement.companyBanners", "Banner công ty"),
                              displayBannerUrl
                            )
                          }
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                          <span>{t("common.seeFullPhoto", "Xem ảnh")}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <UniversalMediaUploader
                  preset="single-image"
                  onFilesChange={(files) => handleBannerChange(files[0])}
                  customTrigger={
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 w-full gap-1.5 rounded-lg border-slate-200/90 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      <Upload className="h-3 w-3" />
                      {t("common.uploadFile", "Tải banner mới")}
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-800/80 dark:bg-slate-900/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {t("general.cancel", "Hủy")}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="h-9 gap-1.5 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
            {isSubmitting ? (
              <>
                <Spinner size="sm" tone="white" />
                <span>{t("common.processing", "Đang xử lý...")}</span>
              </>
            ) : (
              <span>{submitLabel}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <MediaLightboxDialog open={viewerOpen} onOpenChange={setViewerOpen} items={viewerItems} />
    </Dialog>
  );
}
