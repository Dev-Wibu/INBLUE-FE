import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerBlock } from "@/components/ui/spinner";
import { userManager, usersAdminManager } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import { Camera, Eye, EyeOff, ShieldCheck, User } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const INPUT_CLASSES =
  "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800";

interface StaffProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  public_id: string | null;
}

export function StaffAccountPage() {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [profile, setProfile] = useState<StaffProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile Form State
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const passwordId = useId();

  const fetchProfile = useCallback(async () => {
    if (!authUser?.id) return;
    setIsLoading(true);
    try {
      const response = await userManager.getProfile();
      if (response.success && response.data) {
        const data = response.data;
        setProfile({
          id: String(data.id || authUser.id),
          name: String(data.name || authUser.name || ""),
          email: String(data.email || authUser.email || ""),
          avatar: data.avatarUrl ? String(data.avatarUrl) : null,
          public_id: data.public_id ? String(data.public_id) : null,
        });
        setName(String(data.name || authUser.name || ""));
      } else {
        // Fallback to auth store
        setProfile({
          id: String(authUser.id),
          name: authUser.name || "",
          email: authUser.email || "",
          avatar: authUser.avatarUrl || null,
          public_id: authUser.public_id || null,
        });
        setName(authUser.name || "");
      }
    } catch (error) {
      console.error("Error fetching staff profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(URL.createObjectURL(file));
      setAvatarFile(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setIsSavingProfile(true);
    try {
      const response = await usersAdminManager.update(
        profile.id,
        {
          name: name,
          ...(profile.public_id ? { public_id: profile.public_id } : {}),
        },
        avatarFile || undefined
      );

      if (response.success) {
        toast.success(t("common.updatedInformationSuccessfully"));

        // Refresh local auth state
        const profileResponse = await userManager.getProfile();
        if (profileResponse.success && profileResponse.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setUser(profileResponse.data as any);
        }

        await fetchProfile();
        setAvatarFile(null);
        setAvatarPreview(null);
      } else {
        toast.error(response.error || t("common.updateFailedPleaseTryAgain"));
      }
    } catch {
      toast.error(t("common.updateFailedPleaseTryAgain"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error(t("changePassword.currentPasswordIsRequired"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("changePassword.newPasswordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("changePassword.confirmPasswordDoesNotMatch"));
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await userManager.updatePassword(currentPassword, newPassword);
      if (result.success) {
        toast.success(t("changePassword.passwordUpdatedSuccessfully"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error || t("changePassword.unableToUpdatePassword"));
      }
    } catch {
      toast.error(t("changePassword.unableToUpdatePassword"));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const renderPasswordToggle = (onClick: () => void, visible: boolean) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center justify-center rounded text-slate-500 transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-600/40 focus-visible:outline-none dark:text-slate-400 dark:hover:text-slate-200">
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <SpinnerBlock size="lg" />
      </div>
    );
  }

  if (!profile) return null;

  const currentAvatar = avatarPreview || profile.avatar;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("userAccount.personalInfo")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("userAccount.updateYourProfileEducationAnd")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Profile Summary */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Banner */}
            <div className="h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 dark:from-indigo-600 dark:via-purple-700 dark:to-indigo-800"></div>

            <div className="relative px-6 pb-6 text-center">
              {/* Avatar position offset */}
              <div className="relative mx-auto -mt-14 h-28 w-28 rounded-full border-4 border-white bg-slate-50 shadow-sm dark:border-slate-900 dark:bg-slate-800">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={profile.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo-50 dark:bg-slate-800">
                    <User className="h-10 w-10 text-indigo-300 dark:text-slate-500" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  aria-label="Change avatar">
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>

              <div className="mt-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-medium">Staff Administrator</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Forms */}
        <div className="space-y-8 lg:col-span-2">
          {/* Personal Information Form */}
          <section className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              {t("common.personalInformation")}
            </h3>
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <form onSubmit={handleSaveProfile} className="p-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("common.fullName")}
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={INPUT_CLASSES}
                      placeholder={t("common.fullName")}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("common.email")}
                    </Label>
                    <Input id="email" value={profile.email} disabled className={INPUT_CLASSES} />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("userAccount.emailCannotBeChanged")}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingProfile || !name.trim()}
                    className="bg-indigo-600 px-6 text-white transition-colors hover:bg-indigo-700 focus-visible:ring-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700">
                    {isSavingProfile ? (
                      <SpinnerBlock size="sm" className="mr-2 text-white/70" />
                    ) : null}
                    {t("general.save")}
                  </Button>
                </div>
              </form>
            </Card>
          </section>

          {/* Change Password Form */}
          <section className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              {t("common.changePassword")}
            </h3>
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <form onSubmit={handleSavePassword} className="p-6">
                <div className="space-y-6">
                  <div className="max-w-md space-y-2">
                    <Label
                      htmlFor={`${passwordId}-current`}
                      className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("changePassword.currentPassword")}
                    </Label>
                    <div className="relative">
                      <Input
                        id={`${passwordId}-current`}
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={INPUT_CLASSES}
                        placeholder={t("changePassword.currentPasswordPlaceholder")}
                      />
                      {renderPasswordToggle(
                        () => setShowCurrentPassword(!showCurrentPassword),
                        showCurrentPassword
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${passwordId}-new`}
                        className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("changePassword.newPassword")}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`${passwordId}-new`}
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={INPUT_CLASSES}
                          placeholder={t("changePassword.newPasswordPlaceholder")}
                        />
                        {renderPasswordToggle(
                          () => setShowNewPassword(!showNewPassword),
                          showNewPassword
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor={`${passwordId}-confirm`}
                        className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("changePassword.confirmPassword")}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`${passwordId}-confirm`}
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={INPUT_CLASSES}
                          placeholder={t("changePassword.confirmPasswordPlaceholder")}
                        />
                        {renderPasswordToggle(
                          () => setShowConfirmPassword(!showConfirmPassword),
                          showConfirmPassword
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      isSavingPassword || !currentPassword || !newPassword || !confirmPassword
                    }
                    className="bg-indigo-600 px-6 text-white transition-colors hover:bg-indigo-700 focus-visible:ring-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700">
                    {isSavingPassword ? (
                      <SpinnerBlock size="sm" className="mr-2 text-white/70" />
                    ) : null}
                    {t("changePassword.saveChanges")}
                  </Button>
                </div>
              </form>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
