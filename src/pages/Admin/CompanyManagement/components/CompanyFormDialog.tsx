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
      <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col overflow-hidden border border-slate-200/90 p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <DialogHeader className="border-b border-slate-100 bg-slate-50/70 px-6 py-5 dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs dark:bg-indigo-950 dark:text-indigo-400">
              <Building2 className="h-5.5 w-5.5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="space-y-6 overflow-y-auto p-6">
          {/* Main Info Section */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
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
                className="h-11 rounded-xl border border-slate-200/90 bg-slate-50/70 text-sm font-medium focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
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
                  className="h-11 rounded-xl border border-slate-200/90 bg-slate-50/70 text-sm font-medium dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
                  <SelectValue placeholder={t("common.selectStatus", "Chọn trạng thái")} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {COMPANY_STATUSES.map((status) => (
                    <SelectItem key={status} value={status} className="text-sm font-medium">
                      {status === "ACTIVE"
                        ? t("common.active", "Hoạt động (Active)")
                        : t("common.shutDown", "Đã tắt (Inactive)")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
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
              rows={4}
              className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 text-sm leading-relaxed font-medium focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Media Assets Section (Logo & Banner Upload Cards) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("adminCompanymanagement.companyMedia", "Hình ảnh thương hiệu")}
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Logo Upload Card */}
              <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div>
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t("adminCompanymanagement.companyLogo", "Logo Công ty")}
                  </Label>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Khuyên dùng ảnh vuông 1:1 (PNG, JPG)
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    {displayLogoUrl ? (
                      <div className="group/logo relative">
                        <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                          <img
                            src={displayLogoUrl}
                            alt={t("adminCompanymanagement.companyLogo", "Logo")}
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
                            title={t("adminCompanymanagement.deleteLogo", "Xóa logo")}
                            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-xs hover:bg-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                        <ImageIcon className="h-6 w-6 text-slate-400" />
                      </div>
                    )}

                    <div className="flex-1 space-y-1">
                      {displayLogoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            openMediaPreview(
                              t("adminCompanymanagement.companyLogo", "Logo công ty"),
                              displayLogoUrl
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                          <span>{t("common.seeFullPhoto", "Xem phóng to")}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                      <p className="text-[11px] text-slate-400">
                        {logoPreview
                          ? t("common.newFileSelected", "Đã chọn file mới")
                          : displayLogoUrl
                            ? t("common.currentImage", "Ảnh hiện tại")
                            : t("adminCompanymanagement.noLogoYet", "Chưa có logo")}
                      </p>
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
                      className="h-9 w-full gap-2 rounded-xl border-slate-200/90 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      <Upload className="h-3.5 w-3.5" />
                      {t("common.uploadFile", "Tải ảnh mới")}
                    </Button>
                  }
                />
              </div>

              {/* Banner Upload Card */}
              <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div>
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t("adminCompanymanagement.companyBanners", "Ảnh Banner bìa")}
                  </Label>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Khuyên dùng ảnh tỷ lệ 16:9
                  </p>

                  <div className="mt-3 space-y-2">
                    {displayBannerUrl ? (
                      <div className="group/banner relative">
                        <div className="h-16 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                          <img
                            src={displayBannerUrl}
                            alt={t("adminCompanymanagement.companyBanners", "Banner")}
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
                            title={t("adminCompanymanagement.deleteBanners", "Xóa banner")}
                            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-xs hover:bg-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-16 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                        <ImageIcon className="h-6 w-6 text-slate-400" />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {displayBannerUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            openMediaPreview(
                              t("adminCompanymanagement.companyBanners", "Banner công ty"),
                              displayBannerUrl
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                          <span>{t("common.seeFullPhoto", "Xem phóng to")}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {t("adminCompanymanagement.noBannersYet", "Chưa có banner")}
                        </span>
                      )}
                      {bannerPreview && (
                        <span className="text-[11px] font-medium text-emerald-600">
                          {t("common.newFileSelected", "Đã chọn file mới")}
                        </span>
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
                      className="h-9 w-full gap-2 rounded-xl border-slate-200/90 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      <Upload className="h-3.5 w-3.5" />
                      {t("common.uploadFile", "Tải ảnh mới")}
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-900/80">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {t("general.cancel", "Hủy")}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="h-10 gap-2 rounded-xl bg-indigo-600 px-6 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
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
