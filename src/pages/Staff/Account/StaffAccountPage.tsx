import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerBlock } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { userManager, usersAdminManager } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import { ChevronRight, Edit, Eye, EyeOff, FileText, Lock, Mail, User } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const INPUT_CLASSES =
  "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800";

interface StaffProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  public_id: string | null;
}

type AccountSubTab = "profile" | "security";

export function StaffAccountPage() {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [profile, setProfile] = useState<StaffProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<AccountSubTab>("profile");

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
        setProfile({
          id: String(authUser.id),
          name: authUser.name || "",
          email: authUser.email || "",
          avatar: authUser?.avatarUrl ?? null,
          public_id: authUser?.public_id ?? null,
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

  const handleStartEdit = () => setActiveTab("profile");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setIsSavingProfile(true);
    try {
      const response = await usersAdminManager.update(
        profile.id,
        {
          name,
          ...(profile.public_id ? { public_id: profile.public_id } : {}),
        },
        avatarFile || undefined
      );

      if (response.success) {
        toast.success(t("common.updatedInformationSuccessfully"));

        if (!authUser?.id) {
          await fetchProfile();
          return;
        }
        const profileResponse = await userManager.getProfile(authUser.id);
        if (profileResponse.success && profileResponse.data) {
          const profileData = profileResponse.data as Record<string, unknown>;
          // Map userId to id if needed (backend may return userId instead of id)
          const userId = (profileData.userId as number) ?? profileData.id;
          if (userId) {
            setUser({
              id: userId as number,
              name: (profileData.name as string) || authUser?.name,
              email: (profileData.email as string) || authUser?.email,
              role: authUser?.role,
              avatarUrl: (profileData.avatarUrl as string) || authUser?.avatarUrl,
            });
          }
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
      className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center justify-center rounded text-slate-500 transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#0058be]/40 focus-visible:outline-none dark:text-slate-400 dark:hover:text-slate-200">
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
  const summaryEmail = profile.email || "—";
  const summaryId = profile.id;

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
          {/* Sidebar */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-4 lg:col-span-3 lg:self-start">
            {/* Profile Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="relative h-24 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-blue-500/15 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-blue-500/10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleStartEdit}
                  className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  title={t("general.edit")}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative px-5 pb-5 text-center">
                <div className="relative -mt-12 mb-3 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md dark:border-slate-900 dark:bg-slate-800">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-9 w-9 text-slate-400" />
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow-sm transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:border-slate-900 dark:bg-indigo-600"
                    aria-label="Change avatar">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {profile.name}
                </h3>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {t("common.staff")}
                  </span>
                  <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    {t("common.staff")}
                  </span>
                </div>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-2 px-1">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <span className="truncate">{summaryEmail}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 px-1">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="truncate font-mono text-[11px] font-semibold">
                      {t("common.id")}: {summaryId}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Settings Nav */}
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

          {/* Main Content */}
          <div className="lg:col-span-9">
            {activeTab === "profile" ? (
              <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t("common.personalInformation")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {t("userAccount.updateYourProfileEducationAnd")}
                  </p>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-6">
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

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSavingProfile || !name.trim()}
                      className="bg-indigo-600 px-6 text-white transition-colors hover:bg-indigo-700 focus-visible:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700">
                      {isSavingProfile ? (
                        <SpinnerBlock size="sm" className="mr-2 text-white/70" />
                      ) : null}
                      {t("general.save")}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t("common.changePassword")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {t("common.updateYourSecuritySettings")}
                  </p>
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
                        className={INPUT_CLASSES}
                        placeholder={t("changePassword.currentPasswordPlaceholder")}
                      />
                      {renderPasswordToggle(
                        () => setShowCurrentPassword(!showCurrentPassword),
                        showCurrentPassword
                      )}
                    </div>
                  </div>

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

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={
                        isSavingPassword || !currentPassword || !newPassword || !confirmPassword
                      }
                      className="bg-indigo-600 px-6 text-white transition-colors hover:bg-indigo-700 focus-visible:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700">
                      {isSavingPassword ? (
                        <SpinnerBlock size="sm" className="mr-2 text-white/70" />
                      ) : null}
                      {t("changePassword.saveChanges")}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
