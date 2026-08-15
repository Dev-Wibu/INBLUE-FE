import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerBlock } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { userManager, usersAdminManager } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import {
  Camera,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Pencil,
  ShieldCheck,
  User,
} from "lucide-react";
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

type AccountSubTab = "profile" | "security";

export function AdminAccountPage() {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<AccountSubTab>("profile");

  // Profile Form State
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
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
      const response = await userManager.getProfile(authUser.id);
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
    } catch {
      // Intentionally ignored.
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

        if (authUser?.id) {
          const profileResponse = await userManager.getProfile(authUser.id);
          if (profileResponse.success && profileResponse.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setUser(profileResponse.data as any);
          }
        }

        await fetchProfile();
        setAvatarFile(null);
        setAvatarPreview(null);
        setIsEditingProfile(false);
      } else {
        toast.error(response.error || t("common.updateFailedPleaseTryAgain"));
      }
    } catch {
      toast.error(t("common.updateFailedPleaseTryAgain"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelProfile = () => {
    setName(profile?.name || "");
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsEditingProfile(false);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error(t("changePassword.currentPasswordIsRequired"));
      return;
    }
    if (!newPassword) {
      toast.error(t("changePassword.newPasswordIsRequired"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("changePassword.newPasswordMinLength"));
      return;
    }
    if (newPassword === currentPassword) {
      toast.error(t("changePassword.newPasswordMustBeDifferent"));
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
      aria-label={t(visible ? "common.hidePassword" : "common.showPassword")}
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

  const tabItems = [
    {
      id: "profile" as const,
      label: t("common.personalInformation"),
      description: t("userAccount.updateYourProfileEducationAnd"),
      icon: User,
    },
    {
      id: "security" as const,
      label: t("common.changePassword"),
      description: t("common.updateYourSecuritySettings"),
      icon: Lock,
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="w-full px-4 pt-4 pb-8 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Left Sidebar: Profile Card + Tabs */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-4 lg:col-span-3 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="relative h-24 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-blue-500/15 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-blue-500/10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  title={isEditingProfile ? t("general.cancel") : t("general.edit")}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative px-5 pb-5 text-center">
                <div className="-mt-12 mb-3 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md dark:border-slate-900 dark:bg-slate-800">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-9 w-9 text-slate-400" />
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {profile.name}
                </h3>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {profile.email}
                  </span>
                </div>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-2 px-1">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <span className="truncate font-medium">
                      {t("adminAccount.accountRoleAdmin", "Platform Administrator")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
                {t("userAccount.quickSettings")}
              </h3>
              <ul className="space-y-1">
                {tabItems.map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <li key={tab.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors",
                          isActive
                            ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                            : "text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                        )}>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                              isActive
                                ? "bg-indigo-600 text-white dark:bg-indigo-500"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            )}>
                            <TabIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tab.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {tab.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Right Content */}
          <div className={cn("lg:col-span-9")}>
            {activeTab === "profile" ? (
              <Card className="border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                        {t("common.personalInformation")}
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        {t("userAccount.updateYourProfileEducationAnd")}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                      <div className="relative">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md dark:border-slate-900 dark:bg-slate-800">
                          {currentAvatar ? (
                            <img
                              src={currentAvatar}
                              alt={profile.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-10 w-10 text-slate-400" />
                          )}
                        </div>
                        {isEditingProfile && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute right-0 bottom-0 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            aria-label="Change avatar">
                            <Camera className="h-4 w-4" />
                          </button>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleAvatarChange}
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                        />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {profile.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {profile.email}
                        </p>
                        {isEditingProfile && (
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {t("adminAccount.avatarHint", "JPG, PNG or WebP. Max 5MB.")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                          disabled={!isEditingProfile}
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
                        <Input
                          id="email"
                          value={profile.email}
                          disabled
                          className={INPUT_CLASSES}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("userAccount.emailCannotBeChanged")}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                      {isEditingProfile && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelProfile}
                          disabled={isSavingProfile}>
                          {t("general.cancel")}
                        </Button>
                      )}
                      <Button
                        type="submit"
                        disabled={isSavingProfile || !isEditingProfile || !name.trim()}
                        className="bg-indigo-600 px-6 text-white transition-colors hover:bg-indigo-700 focus-visible:ring-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700">
                        {isSavingProfile ? (
                          <SpinnerBlock size="sm" className="mr-2 text-white/70" />
                        ) : (
                          <Edit className="mr-2 h-4 w-4" />
                        )}
                        {t("general.save")}
                      </Button>
                    </div>
                  </form>
                </div>
              </Card>
            ) : (
              <Card className="border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                        {t("common.changePassword")}
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        {t("common.updateYourSecuritySettings")}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSavePassword} className="space-y-6">
                    <div className="space-y-2">
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
                          className={cn(INPUT_CLASSES, "pr-10")}
                          placeholder={t("changePassword.currentPasswordPlaceholder")}
                          autoComplete="current-password"
                          required
                        />
                        {renderPasswordToggle(
                          () => setShowCurrentPassword(!showCurrentPassword),
                          showCurrentPassword
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                            className={cn(INPUT_CLASSES, "pr-10")}
                            placeholder={t("changePassword.newPasswordPlaceholder")}
                            autoComplete="new-password"
                            minLength={8}
                            required
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
                            className={cn(INPUT_CLASSES, "pr-10")}
                            placeholder={t("changePassword.confirmPasswordPlaceholder")}
                            autoComplete="new-password"
                            minLength={8}
                            required
                          />
                          {renderPasswordToggle(
                            () => setShowConfirmPassword(!showConfirmPassword),
                            showConfirmPassword
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
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
                </div>
              </Card>
            )}

            {/* ID Card */}
            <Card className="mt-6 border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="flex items-center gap-4 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-500">
                    {t("adminAccount.adminId", "Admin ID")}
                  </p>
                  <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-200">
                    {profile.id}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
