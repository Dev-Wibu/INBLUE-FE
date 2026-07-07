import { UniversalMediaUploader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Camera,
  ChevronLeft,
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

export interface ExtendedUserFormData extends Partial<UserFormData> {
  avatar?: File;
}

interface UserEditFormProps {
  formData: ExtendedUserFormData;
  onFormChange: (data: ExtendedUserFormData) => void;
  onSubmit: () => void;
  title: string;
  description: string;
  submitLabel: string;
  selectedUser?: User | null;
  onCancel: () => void;
}

export function UserEditForm({
  formData,
  onFormChange,
  onSubmit,
  title,
  description,
  submitLabel,
  selectedUser,
  onCancel,
}: UserEditFormProps) {
  const { t } = useTranslation();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarChange = (file?: File) => {
    if (file) {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      onFormChange({ ...formData, avatar: file });
    } else {
      handleClearAvatar();
    }
  };

  const handleClearAvatar = () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    onFormChange({ ...formData, avatar: undefined });
  };

  const displayAvatarUrl = avatarPreview || selectedUser?.avatarUrl;

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* Toolbar */}
      <div className="flex flex-none items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4 md:col-span-1">
              <UniversalMediaUploader
                preset="single-image"
                hideFileList={true}
                onFilesChange={(files) => handleAvatarChange(files[0])}
                customTrigger={
                  <div className="group relative mx-auto h-40 w-40 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500">
                    {displayAvatarUrl ? (
                      <img
                        src={displayAvatarUrl}
                        alt="Avatar Preview"
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="mb-2 h-8 w-8 text-white" />
                      <span className="text-sm font-medium text-white">{t("common.avatar")}</span>
                    </div>
                  </div>
                }
              />
              <div className="flex w-full flex-col items-center gap-2 text-sm">
                {avatarPreview ? (
                  <div className="flex flex-col items-center">
                    <span className="mb-1 text-xs text-green-600">
                      {t("common.newFileSelected")}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAvatar}
                      className="h-8 text-red-500">
                      <X className="mr-1 h-3 w-3" /> {t("adminUsermanagement.deleteNewAvatar")}
                    </Button>
                  </div>
                ) : (
                  !displayAvatarUrl && (
                    <span className="flex items-center text-xs text-slate-400">
                      <ImageIcon className="mr-1 h-3 w-3" />{" "}
                      {t("common.noProfilePictureHasBeenSelectedYet")}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Form Fields Section */}
            <div className="space-y-4 md:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("common.fullName1")}</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
                    placeholder={t("adminUsermanagement.enterTheUserSFull")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("common.email")} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
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
                    onChange={(e) => onFormChange({ ...formData, password: e.target.value })}
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
                      role: value as "STAFF" | "MENTOR" | "ADMIN" | "USER",
                    })
                  }
                  className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                    <RadioGroupItem value="MENTOR" id="role-mentor" className="peer sr-only" />
                    <Label
                      htmlFor="role-mentor"
                      className="flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 border-slate-200 bg-transparent p-4 transition-all peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:peer-data-[state=checked]:border-green-600 dark:peer-data-[state=checked]:bg-green-900/20 dark:peer-data-[state=checked]:text-green-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                      <Shield className="mb-2 h-6 w-6" />
                      <span className="text-sm font-semibold">{t("common.mentor")}</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="STAFF" id="role-staff" className="peer sr-only" />
                    <Label
                      htmlFor="role-staff"
                      className="flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 border-slate-200 bg-transparent p-4 transition-all peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-50 peer-data-[state=checked]:text-purple-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:peer-data-[state=checked]:border-purple-600 dark:peer-data-[state=checked]:bg-purple-900/20 dark:peer-data-[state=checked]:text-purple-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                      <Shield className="mb-2 h-6 w-6" />
                      <span className="text-sm font-semibold">
                        {t("adminAdmindashboard.staff")}
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="ADMIN" id="role-admin" className="peer sr-only" />
                    <Label
                      htmlFor="role-admin"
                      className="flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 border-slate-200 bg-transparent p-4 transition-all peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 peer-data-[state=checked]:text-red-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:peer-data-[state=checked]:border-red-600 dark:peer-data-[state=checked]:bg-red-900/20 dark:peer-data-[state=checked]:text-red-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                      <Shield className="mb-2 h-6 w-6" />
                      <span className="text-sm font-semibold">{t("common.admin")}</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
                <Button variant="outline" type="button" onClick={onCancel}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={onSubmit}>{submitLabel}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
