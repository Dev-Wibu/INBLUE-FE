import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UniversalMediaUploader } from "@/components/shared";
import { Camera, Save, ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { usersAdminManager } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import { SpinnerBlock } from "@/components/ui/spinner";

interface ProfileEditTabProps {
  onBack: () => void;
  onSuccess: () => void;
  userProfile: any;
}

export function ProfileEditTab({ onBack, onSuccess, userProfile }: ProfileEditTabProps) {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);

  const [editName, setEditName] = useState(userProfile?.name || authUser?.name || "");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditAvatarChange = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (editAvatarPreview?.startsWith("blob:")) URL.revokeObjectURL(editAvatarPreview);
    setEditAvatarPreview(URL.createObjectURL(file));
    setEditAvatarFile(file);
  };

  const handleSave = async () => {
    if (!userProfile?.id) return;
    setIsSaving(true);
    try {
      const response = await usersAdminManager.update(
        userProfile.id,
        { name: editName },
        editAvatarFile ?? undefined
      );
      if (response.success) {
        toast.success(t("adminUsermanagement.userUpdatedSuccessfully"));
        onSuccess();
      } else {
        toast.error(response.error || t("general.unableToUpdateProfile"));
      }
    } catch {
      toast.error(t("general.unableToUpdateProfile"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("userSettings.editProfile")}
        </h2>
      </div>

      <div className="space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-24 w-24">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md dark:border-slate-900 dark:bg-slate-800">
              <img
                src={editAvatarPreview || userProfile?.avatar || authUser?.avatarUrl || ""}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <UniversalMediaUploader
            preset="single-image"
            enableWebcam={true}
            onFilesChange={handleEditAvatarChange}
            customTrigger={
              <div className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                <Camera className="h-4 w-4" />
                {t("userAccount.changePhoto")}
              </div>
            }
          />
        </div>

        {/* Info Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t("common.fullName")}</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("common.email")}</Label>
            <div className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              <Mail className="h-4 w-4" />
              {userProfile?.email || authUser?.email}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving || !editName.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {isSaving ? <SpinnerBlock size="sm" /> : <><Save className="mr-2 h-4 w-4" /> {t("general.save")}</>}
          </Button>
        </div>
      </div>
    </Card>
  );
}
