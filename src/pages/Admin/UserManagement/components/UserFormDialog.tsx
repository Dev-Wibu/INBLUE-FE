import { MediaLightboxDialog, type MediaViewerItem } from "@/components/shared";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { inferFileKind, openUrlInNewTab } from "@/lib/media-file-utils";
import {
  Camera,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User, UserFormData } from "../types";

/**
 * Extended form data type to include file uploads
 * Based on schema-from-be.d.ts createUser operation which requires:
 * - data: UserInfo (JSON)
 * - avatar?: File (binary)
 */
interface ExtendedUserFormData extends Partial<UserFormData> {
  avatar?: File;
}
interface UserFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: ExtendedUserFormData;
  onFormChange: (data: ExtendedUserFormData) => void;
  onSubmit: () => void;
  title: string;
  description: string;
  submitLabel: string;
  /** User being edited (optional, for showing existing avatar/cv URLs) */
  selectedUser?: User | null;
}
export function UserFormDialog({
  isOpen,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  title,
  description,
  submitLabel,
  selectedUser,
}: UserFormDialogProps) {
  const { t } = useTranslation();
  // State for local file previews (blob URLs for new file uploads)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<MediaViewerItem[]>([]);

  // Clean up blob URLs when component unmounts or when files change
  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // Handle dialog open/close with preview reset
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset previews when closing
      setAvatarPreview(null);
      setShowPassword(false);
      setViewerOpen(false);
      setViewerItems([]);
    }
    onOpenChange(open);
  };

  // Handle file input change for avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL for the selected file
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      onFormChange({
        ...formData,
        avatar: file,
      });
    }
  };

  // Clear avatar selection
  const handleClearAvatar = () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    onFormChange({
      ...formData,
      avatar: undefined,
    });
    // Reset file input value
    const fileInput = document.getElementById("avatar-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // Get the display image URL - prioritize new upload preview over existing URL
  const displayAvatarUrl = avatarPreview || selectedUser?.avatarUrl;

  const handlePreviewAvatar = () => {
    if (!displayAvatarUrl) {
      return;
    }
    const avatarKind = inferFileKind({
      fileName: displayAvatarUrl,
    });
    if (avatarKind === "other") {
      openUrlInNewTab(displayAvatarUrl);
      return;
    }
    setViewerItems([
      {
        id: "admin-user-avatar-preview",
        name: t("common.avatar"),
        src: displayAvatarUrl,
        kind: avatarKind,
        requireAuth: !displayAvatarUrl.startsWith("blob:"),
      },
    ]);
    setViewerOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-8 py-4 md:grid-cols-3">
          {/* Avatar Section (Left) */}
          <div className="flex flex-col items-center space-y-4 md:col-span-1">
            <div className="group relative mx-auto h-40 w-40 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500">
              {displayAvatarUrl ? (
                <img
                  src={displayAvatarUrl}
                  alt={t("adminUsermanagement.previewYourProfilePicture")}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <UserIcon className="h-16 w-16 opacity-50" />
                </div>
              )}

              {/* Hover Overlay */}
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="mb-2 h-8 w-8 text-white" />
                <span className="text-sm font-medium text-white">{t("common.avatar")}</span>
              </label>

              {/* Hidden File Input */}
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Action buttons under avatar */}
            <div className="flex w-full flex-col items-center gap-2 text-sm">
              {avatarPreview ? (
                <div className="flex flex-col items-center">
                  <span className="mb-1 text-xs text-green-600">{t("common.newFileSelected")}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAvatar}
                    className="h-8 text-red-500">
                    <X className="mr-1 h-3 w-3" /> {t("adminUsermanagement.deleteNewAvatar")}
                  </Button>
                </div>
              ) : displayAvatarUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviewAvatar}
                  className="h-8 text-blue-500 dark:text-blue-400">
                  <ExternalLink className="mr-1 h-3 w-3" /> {t("common.seeFullPhoto")}
                </Button>
              ) : (
                <span className="flex items-center text-xs text-slate-400">
                  <ImageIcon className="mr-1 h-3 w-3" />{" "}
                  {t("common.noProfilePictureHasBeenSelectedYet")}
                </span>
              )}
            </div>
          </div>

          {/* Form Fields Section (Right) */}
          <div className="space-y-4 md:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("common.fullName1")}</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  placeholder={t("adminUsermanagement.enterTheUserSFull")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("common.email")} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  placeholder={t("common.emailPlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("adminUsermanagement.passwordLeaveBlankIfNot")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password || ""}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      password: e.target.value,
                    })
                  }
                  placeholder={t("adminUsermanagement.enterThePasswordForThe")}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label>{t("common.role")}</Label>
              <RadioGroup
                value={formData.role || "USER"}
                onValueChange={(value) =>
                  onFormChange({
                    ...formData,
                    role: value as "STAFF" | "USER",
                  })
                }
                className="grid grid-cols-2 gap-3">
                <div>
                  <RadioGroupItem value="USER" id="role-user" className="peer sr-only" />
                  <Label
                    htmlFor="role-user"
                    className="flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 border-slate-200 bg-transparent p-4 transition-all peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 peer-data-[state=checked]:text-blue-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:peer-data-[state=checked]:border-blue-600 dark:peer-data-[state=checked]:bg-blue-900/20 dark:peer-data-[state=checked]:text-blue-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <UserIcon className="mb-2 h-6 w-6" />
                    <span className="text-sm font-semibold">{t("common.user")}</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="STAFF" id="role-staff" className="peer sr-only" />
                  <Label
                    htmlFor="role-staff"
                    className="flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 border-slate-200 bg-transparent p-4 transition-all peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 peer-data-[state=checked]:text-blue-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:peer-data-[state=checked]:border-blue-600 dark:peer-data-[state=checked]:bg-blue-900/20 dark:peer-data-[state=checked]:text-blue-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <Shield className="mb-2 h-6 w-6" />
                    <span className="text-sm font-semibold">{t("common.staff")}</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4 border-t pt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("general.cancel")}
          </Button>
          <Button onClick={onSubmit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>

      <MediaLightboxDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        items={viewerItems}
        initialIndex={0}
      />
    </Dialog>
  );
}
