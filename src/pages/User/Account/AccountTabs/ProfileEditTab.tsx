import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UniversalMediaUploader } from "@/components/shared";
import { Camera, Save, ArrowLeft, Mail, Lock, User, Phone, MapPin, Linkedin } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { usersAdminManager, userManager } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import { SpinnerBlock } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";

interface ProfileEditTabProps {
  onBack: () => void;
  onSuccess: () => void;
  userProfile: any;
}

export function ProfileEditTab({ onBack, onSuccess, userProfile }: ProfileEditTabProps) {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);

  // Profile state
  const [editName, setEditName] = useState(userProfile?.name || authUser?.name || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");

  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleEditAvatarChange = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (editAvatarPreview?.startsWith("blob:")) URL.revokeObjectURL(editAvatarPreview);
    setEditAvatarPreview(URL.createObjectURL(file));
    setEditAvatarFile(file);
  };

  const handleSaveAll = async () => {
    // Assuming we save both profile and password in one go or sequentially
    setIsSaving(true);
    try {
      // 1. Save Profile
      if (userProfile?.id) {
         await usersAdminManager.update(userProfile.id, { name: editName }, editAvatarFile ?? undefined);
      }

      // 2. Save Password if changed
      if (currentPassword && newPassword && confirmPassword) {
         if (newPassword !== confirmPassword) {
            toast.error(t("changePassword.confirmPasswordDoesNotMatch"));
            return;
         }
         await userManager.updatePassword(currentPassword, newPassword);
         setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      }

      toast.success(t("adminUsermanagement.userUpdatedSuccessfully"));
      onSuccess();
    } catch (error) {
      toast.error(t("general.unableToUpdateProfile"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t("userSettings.editProfile")}
            </h2>
          </div>
        </div>

        {/* Personal Info */}
        <div className="flex items-center gap-6 mb-8">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t("common.fullName")}</Label>
            <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="pl-9 h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Số điện thoại</Label>
            <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9 h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("common.email")}</Label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input value={userProfile?.email || authUser?.email} disabled className="pl-9 h-10 bg-slate-50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-address">Địa chỉ / Thành phố</Label>
            <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} className="pl-9 h-10" />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-linkedin">LinkedIn</Label>
            <div className="relative">
                <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="edit-linkedin" value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} className="pl-9 h-10" />
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Password */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-indigo-500" /> Bảo mật
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input type="password" placeholder="Mật khẩu hiện tại" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <Input type="password" placeholder="Mật khẩu mới" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Input type="password" placeholder="Xác nhận mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>

        <div className="flex justify-end pt-6">
          <Button onClick={handleSaveAll} disabled={isSaving} className="bg-[#6366f1] hover:bg-[#4f46e5]">
            {isSaving ? <SpinnerBlock size="sm" /> : <><Save className="mr-2 h-4 w-4" /> Lưu thay đổi</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}
