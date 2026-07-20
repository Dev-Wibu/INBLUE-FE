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

interface AdminProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  public_id: string | null;
}

export function AdminAccountPage() {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile Form State
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      console.error("Error fetching admin profile:", error);
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

    if (!newPassword) {
      toast.error(t("changePassword.newPasswordMinLength"));
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

    if (!profile?.id) {
      toast.error("Profile ID not found");
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await usersAdminManager.update(profile.id, { password: newPassword });
      if (result.success) {
        toast.success(t("changePassword.passwordUpdatedSuccessfully"));
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Cover Profile Section */}
      <Card className="glass-card mb-8 overflow-hidden border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/80">
        {/* Cover Banner */}
        <div className="h-20 bg-gradient-to-r from-blue-600 to-blue-800 sm:h-25 dark:from-slate-800 dark:to-slate-900"></div>

        <div className="relative px-6 pb-4 sm:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
              <div className="relative -mt-12 sm:-mt-16">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-md ring-4 ring-white sm:h-32 sm:w-32 dark:bg-slate-900 dark:ring-slate-900">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt={profile.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-indigo-400 sm:h-16 sm:w-16 dark:text-slate-500" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-0 bottom-2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  aria-label="Change avatar">
                  <Camera className="h-5 w-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>

              <div className="text-center sm:mb-2 sm:text-left">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                  {profile.name}
                </h2>
                <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                  <p className="text-slate-600 dark:text-slate-400">{profile.email}</p>
                  <span className="hidden h-1.5 w-1.5 rounded-full bg-slate-300 sm:block dark:bg-slate-600"></span>
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="font-medium">Staff Administrator</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Extra Info (ID) */}
            <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 px-6 py-4 sm:mb-2 dark:border-slate-800/50 dark:bg-slate-900/20">
              <div className="flex flex-col items-center sm:items-end">
                <span className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-500">
                  Staff ID
                </span>
                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-200">
                  {profile.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Forms Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Column 1: Personal Information Form */}
        <section className="flex flex-col space-y-4">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            {t("common.personalInformation")}
          </h3>
          <Card className="flex flex-1 flex-col border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <form onSubmit={handleSaveProfile} className="flex flex-1 flex-col p-6 sm:p-8">
              <div className="flex-1 space-y-6">
                <div className="space-y-2">
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

                <div className="space-y-2">
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

        {/* Column 2: Change Password Form */}
        <section className="flex flex-col space-y-4">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            {t("common.changePassword")}
          </h3>
          <Card className="flex flex-1 flex-col border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <form onSubmit={handleSavePassword} className="flex flex-1 flex-col p-6 sm:p-8">
              <div className="flex-1 space-y-6">
                {" "}
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
  );
}
