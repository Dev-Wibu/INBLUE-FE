import { UniversalMediaUploader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SpinnerBlock } from "@/components/ui/spinner";
import { userManager, usersAdminManager } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, Camera, Github, Linkedin, Lock, Mail, MapPin, Phone, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { UserProfileData } from "./types";

interface ProfileEditTabProps {
  onBack: () => void;
  onSuccess: () => void;
  userProfile: UserProfileData;
}

export function ProfileEditTab({ onBack, onSuccess, userProfile }: ProfileEditTabProps) {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  // Profile state
  const [editName, setEditName] = useState(userProfile?.name || authUser?.name || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [address, setAddress] = useState(userProfile?.address || "");
  const [linkedInUrl, setLinkedInUrl] = useState(userProfile?.linkedInUrl || "");
  const [githubUrl, setGithubUrl] = useState(userProfile?.githubUrl || "");

  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleEditAvatarChange = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (editAvatarPreview?.startsWith("blob:")) URL.revokeObjectURL(editAvatarPreview);
    setEditAvatarPreview(URL.createObjectURL(file));
    setEditAvatarFile(file);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      if (userProfile?.id) {
        await usersAdminManager.update(
          userProfile.id,
          {
            name: editName,
            phone,
            address,
            linkedInUrl,
            githubUrl,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          editAvatarFile ?? undefined
        );
      }

      if (currentPassword && newPassword && confirmPassword) {
        if (newPassword !== confirmPassword) {
          toast.error(t("changePassword.confirmPasswordDoesNotMatch"));
          setIsSaving(false);
          return;
        }
        await userManager.updatePassword(currentPassword, newPassword);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      toast.success(t("adminUsermanagement.userUpdatedSuccessfully"));
      onSuccess();
    } catch {
      toast.error(t("general.unableToUpdateProfile"));
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("userSettings.editProfile")}
        </h2>
      </div>

      <Card className="border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column: Avatar */}
          <div className="col-span-12 flex flex-col items-center space-y-4 text-center md:col-span-4">
            <div className="relative h-28 w-28">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md dark:border-slate-900 dark:bg-slate-800">
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
                <Button variant="outline" size="sm" className="gap-2">
                  <Camera className="h-4 w-4" /> Đổi ảnh
                </Button>
              }
            />
            <p className="max-w-[200px] text-xs text-slate-500">
              Tải lên ảnh chân dung rõ mặt. Định dạng JPG, PNG tối đa 5MB.
            </p>
          </div>

          {/* Right Column: Form */}
          <div className="col-span-12 space-y-6 md:col-span-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Họ và tên</Label>
                <div className="relative">
                  <User className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Số điện thoại</Label>
                <div className="relative">
                  <Phone className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="edit-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <Input
                    value={userProfile?.email || authUser?.email}
                    disabled
                    className="h-9 bg-slate-50 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Địa chỉ / Thành phố</Label>
                <div className="relative">
                  <MapPin className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="edit-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-linkedin">LinkedIn URL</Label>
                <div className="relative">
                  <Linkedin className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="edit-linkedin"
                    value={linkedInUrl}
                    onChange={(e) => setLinkedInUrl(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-github">GitHub URL</Label>
                <div className="relative">
                  <Github className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="edit-github"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Lock className="h-4 w-4" /> Bảo mật
              </h3>
              <Input
                type="password"
                placeholder="Mật khẩu hiện tại"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-9"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="password"
                  placeholder="Mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9"
                />
                <Input
                  type="password"
                  placeholder="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="bg-[#6366f1] hover:bg-[#4f46e5]">
                {isSaving ? <SpinnerBlock size="sm" /> : <>Lưu thay đổi</>}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
