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
import { Building2, Camera, ExternalLink, ImageIcon, X } from "lucide-react";
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
      <DialogContent className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[24px] border border-slate-200/90 bg-white p-0 shadow-2xl sm:max-w-[560px] dark:border-slate-800 dark:bg-slate-900">
        {/* Header Bar */}
        <DialogHeader className="border-b border-slate-200/90 bg-slate-100/90 px-5 py-3.5 dark:border-slate-800/90 dark:bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400 dark:ring-indigo-400/30">
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

        {/* Scrollable Content Body */}
        <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Banner & Logo Visual Header Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
            {/* Banner Cover Image Container */}
            <div className="relative h-28 w-full overflow-hidden bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-900">
              {displayBannerUrl ? (
                <img
                  src={displayBannerUrl}
                  alt="Company Banner"
                  className="h-full w-full object-cover opacity-90 transition-opacity hover:opacity-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-600 dark:text-slate-500">
                  <ImageIcon className="h-8 w-8 opacity-40" />
                </div>
              )}

              {/* Banner Action Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
                {displayBannerUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      openMediaPreview(
                        t("adminCompanymanagement.companyBanners", "Banner công ty"),
                        displayBannerUrl
                      )
                    }
                    className="flex h-7 items-center gap-1 rounded-lg bg-black/50 px-2 text-[11px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/70">
                    <ExternalLink className="h-3 w-3" />
                    <span>Xem ảnh</span>
                  </button>
                )}

                <UniversalMediaUploader
                  preset="single-image"
                  onFilesChange={(files) => handleBannerChange(files[0])}
                  customTrigger={
                    <button
                      type="button"
                      className="flex h-7 items-center gap-1.5 rounded-lg bg-indigo-600/90 px-2.5 text-[11px] font-semibold text-white shadow-xs backdrop-blur-md transition-all hover:bg-indigo-600">
                      <Camera className="h-3.5 w-3.5" />
                      <span>{displayBannerUrl ? "Đổi banner" : "Tải banner"}</span>
                    </button>
                  }
                />
                {bannerPreview && (
                  <button
                    type="button"
                    onClick={handleClearBanner}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/80 text-white backdrop-blur-md hover:bg-red-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Overlapping Logo Container & Meta */}
            <div className="relative px-4 pb-3">
              <div className="-mt-8 flex items-end justify-between">
                <div className="group/logo relative">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md dark:border-slate-900 dark:bg-slate-900">
                    {displayLogoUrl ? (
                      <img
                        src={displayLogoUrl}
                        alt="Company Logo"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <Building2 className="h-7 w-7" />
                      </div>
                    )}
                  </div>

                  <UniversalMediaUploader
                    preset="single-image"
                    onFilesChange={(files) => handleLogoChange(files[0])}
                    customTrigger={
                      <button
                        type="button"
                        title={t("adminCompanymanagement.companyLogo", "Đổi logo")}
                        className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs transition-transform hover:scale-105">
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    }
                  />

                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-white shadow-xs hover:bg-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {displayLogoUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      openMediaPreview(
                        t("adminCompanymanagement.companyLogo", "Logo công ty"),
                        displayLogoUrl
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                    <span>Xem phóng to logo</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Section */}
          <div className="space-y-4">
            {/* Row 1: Company Name & Status */}
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-[240px] flex-1 space-y-1.5">
                <Label
                  htmlFor="company-name"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200">
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
                  placeholder={t(
                    "adminCompanymanagement.enterTheCompanyName",
                    "VD: VNG Corporation"
                  )}
                  className="h-10.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-400 dark:focus-visible:bg-slate-950"
                />
              </div>

              <div className="w-[130px] shrink-0 space-y-1.5">
                <Label
                  htmlFor="company-status"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200">
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
                    className="h-10.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
                    <SelectValue placeholder={t("common.selectStatus", "Trạng thái")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {COMPANY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="text-xs font-semibold">
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
                className="text-xs font-bold text-slate-800 dark:text-slate-200">
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
                  "Giới thiệu ngắn về công ty, lĩnh vực hoạt động, văn hóa..."
                )}
                rows={3.5}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs leading-relaxed font-medium focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-400 dark:focus-visible:bg-slate-950"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-slate-200/90 bg-slate-100/90 px-5 py-3 dark:border-slate-800/90 dark:bg-slate-950/90">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            {t("general.cancel", "Hủy")}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="h-10 gap-2 rounded-xl bg-indigo-600 px-6 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-98 dark:bg-indigo-600 dark:hover:bg-indigo-500">
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
