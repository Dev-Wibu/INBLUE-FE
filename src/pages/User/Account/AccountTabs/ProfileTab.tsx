import { MediaLightboxDialog, type MediaViewerItem } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMajorOptions } from "@/constants/majors";
import { inferFileKind, openUrlInNewTab } from "@/lib/media-file-utils";
import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  RefreshCw,
  Save,
  Upload,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserProfileData } from "./types";

interface ProfileTabProps {
  userProfile: UserProfileData;
  isEditing: boolean;
  isSaving: boolean;
  formData: Partial<UserProfileData>;
  avatarPreview: string | null;
  onRefreshData: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveProfile: () => void;
  onInputChange: (field: keyof UserProfileData, value: string) => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAvatar: () => void;
  onOpenCvModal: () => void;
}

export function ProfileTab({
  userProfile,
  isEditing,
  isSaving,
  formData,
  avatarPreview,
  onRefreshData,
  onStartEdit,
  onCancelEdit,
  onSaveProfile,
  onInputChange,
  onAvatarChange,
  onClearAvatar,
  onOpenCvModal,
}: ProfileTabProps) {
  const { t } = useTranslation();
  const majorOptions = useMajorOptions();
  const getMajorLabel = (value: string): string => {
    const major = majorOptions.find((option) => option.value === value);
    return major?.label || "";
  };
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<MediaViewerItem[]>([]);
  const handlePreviewCurrentCv = () => {
    if (!userProfile.cvUrl) {
      return;
    }
    const cvKind = inferFileKind({
      fileName: userProfile.cvUrl,
    });
    if (cvKind === "other") {
      openUrlInNewTab(userProfile.cvUrl);
      return;
    }
    setViewerItems([
      {
        id: "profile-current-cv",
        name: t("common.currentCv"),
        src: userProfile.cvUrl,
        kind: cvKind,
        requireAuth: true,
      },
    ]);
    setViewerOpen(true);
  };
  return (
    <div className="flex flex-col gap-6">
      {/* User Info Section */}
      <div className="glass-card overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-[rgba(15,23,42,0.1)] bg-gradient-to-r from-[#dae2fd] via-white to-white p-6 dark:border-[rgba(255,255,255,0.1)] dark:from-[#1a2a3a] dark:via-[#131b2e] dark:to-[#131b2e]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-[#0b1c30] dark:text-white">
                  {t("common.personalInformation")}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRefreshData}
                  title={t("common.refreshData")}
                  className="h-8 w-8 text-[#45464d] hover:bg-[#eff4ff] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-sm text-[#45464d] dark:text-[#8f9099]">
                {t("userAccount.updatedTheBasicProfileSo")}
              </p>
            </div>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onStartEdit}
                className="border-[#0058be] text-[#0058be] hover:bg-[#dae2fd] dark:border-[#66B2FF] dark:text-[#66B2FF] dark:hover:bg-[#0058be]/20">
                {t("general.edit")}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancelEdit}
                  disabled={isSaving}
                  className="border-[#c6c6cd] text-[#45464d] hover:bg-[#eff4ff] dark:border-[#3a4558] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                  <X className="mr-1 h-4 w-4" />
                  {t("general.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={onSaveProfile}
                  disabled={isSaving}
                  className="bg-[#0058be] text-white hover:bg-[#0047a8]">
                  <Save className="mr-1 h-4 w-4" />
                  {isSaving ? t("common.saving") : t("general.save")}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Avatar Card */}
            <div className="flex flex-col items-center rounded-xl border border-[rgba(15,23,42,0.1)] bg-[#f8f9ff] p-4 text-center dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a2a3a]">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm ring-4 ring-white/70 dark:bg-[#131b2e] dark:ring-[#131b2e]/80">
                  {avatarPreview || userProfile.avatar ? (
                    <img
                      src={avatarPreview || userProfile.avatar || ""}
                      alt={userProfile.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-9 w-9 text-[#0058be] dark:text-[#66B2FF]" />
                  )}
                </div>
                {/* Camera edit overlay when editing */}
                {isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                    <span className="text-xs text-white">{t("userAccount.changePhoto")}</span>
                  </div>
                )}
              </div>
              <p className="mt-4 text-sm font-semibold text-[#0b1c30] dark:text-white">
                {t("common.avatar")}
              </p>
              <p className="text-xs text-[#45464d] dark:text-[#8f9099]">
                {t("userAccount.pngOrJpgMaximum5mb")}
              </p>
              {isEditing && (
                <>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={onAvatarChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="mt-3 inline-flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#c6c6cd] bg-white px-3 py-2 text-sm font-medium text-[#45464d] transition-colors hover:bg-[#eff4ff] dark:border-[#3a4558] dark:bg-[#131b2e] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                    {t("userAccount.changePhoto")}
                  </label>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={onClearAvatar}
                      className="mt-2 text-xs font-medium text-red-500 hover:text-red-600">
                      {t("userAccount.removeSelectedPhoto")}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Full Name */}
              <div className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-white p-4 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#131b2e]">
                <div className="mb-2 flex items-center gap-2 text-[#45464d] dark:text-[#8f9099]">
                  <User className="h-4 w-4" />
                  <Label className="text-sm font-medium">{t("common.fullName")}</Label>
                </div>
                {isEditing ? (
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => onInputChange("name", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                ) : (
                  <p className="text-base font-semibold text-[#0b1c30] dark:text-white">
                    {userProfile.name}
                  </p>
                )}
              </div>

              {/* Email (read-only) */}
              <div className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-white p-4 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#131b2e]">
                <div className="mb-2 flex items-center gap-2 text-[#45464d] dark:text-[#8f9099]">
                  <Mail className="h-4 w-4" />
                  <Label className="text-sm font-medium">{t("common.email")}</Label>
                  <span className="rounded bg-[#eff4ff] px-1.5 py-0.5 text-xs text-[#45464d] dark:bg-[#1a2a3a] dark:text-[#8f9099]">
                    {t("common.cannotBeChanged")}
                  </span>
                </div>
                <p className="text-base font-semibold text-[#0b1c30] dark:text-white">
                  {userProfile.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Education & Career Section */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="mb-4 text-xl font-semibold text-[#0b1c30] dark:text-white">
          {t("userAccount.educationCareerGoals")}
        </h3>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* University */}
          <div className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-white p-4 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#131b2e]">
            <div className="mb-2 flex items-center gap-2 text-[#45464d] dark:text-[#8f9099]">
              <GraduationCap className="h-4 w-4" />
              <Label className="text-sm font-medium">{t("common.university")}</Label>
            </div>
            {isEditing ? (
              <Input
                value={formData.university || ""}
                onChange={(e) => onInputChange("university", e.target.value)}
                className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                placeholder={t("userAccount.forExampleHanoiUniversityOf")}
              />
            ) : (
              <p className="text-base font-semibold text-[#0b1c30] dark:text-white">
                {userProfile.university || t("common.notUpdatedYet")}
              </p>
            )}
          </div>

          {/* Major */}
          <div className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-white p-4 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#131b2e]">
            <div className="mb-2 flex items-center gap-2 text-[#45464d] dark:text-[#8f9099]">
              <BookOpen className="h-4 w-4" />
              <Label className="text-sm font-medium">{t("common.specialized")}</Label>
            </div>
            {isEditing ? (
              <Select
                value={formData.major || ""}
                onValueChange={(value) => onInputChange("major", value)}>
                <SelectTrigger className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white">
                  <SelectValue placeholder={t("common.chooseAMajor")} />
                </SelectTrigger>
                <SelectContent>
                  {majorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-base font-semibold text-[#0b1c30] dark:text-white">
                {getMajorLabel(userProfile.major || "") || t("common.notUpdatedYet")}
              </p>
            )}
          </div>

          {/* CV Upload */}
          <div className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-[#f8f9ff] p-4 lg:col-span-2 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a2a3a]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[#45464d] dark:text-[#8f9099]">
                  <FileText className="h-4 w-4" />
                  <Label className="text-sm font-medium">{t("common.cvResume")}</Label>
                </div>
                {userProfile.cvUrl ? (
                  <button
                    type="button"
                    onClick={handlePreviewCurrentCv}
                    className="mt-1 flex items-center gap-2 bg-transparent p-0 text-sm font-semibold text-[#0058be] hover:underline dark:text-[#66B2FF]">
                    <ExternalLink className="h-4 w-4" />
                    {t("userAccount.viewCurrentCv")}
                  </button>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-[#0b1c30] dark:text-white">
                    {t("userAccount.noCvYet")}
                  </p>
                )}
                <p className="mt-1 text-xs text-[#45464d] dark:text-[#8f9099]">
                  {t("common.onlyAcceptPdfFilesMaximum10mb")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenCvModal}
                className="border-[#0058be] text-[#0058be] hover:bg-[#dae2fd] dark:border-[#66B2FF] dark:text-[#66B2FF] dark:hover:bg-[#0058be]/20">
                <Upload className="mr-2 h-4 w-4" />
                {userProfile.cvUrl ? t("common.updateCv") : t("common.uploadCv")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <MediaLightboxDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        items={viewerItems}
        initialIndex={0}
      />
    </div>
  );
}
