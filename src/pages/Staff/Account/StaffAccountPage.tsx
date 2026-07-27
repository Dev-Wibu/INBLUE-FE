import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerBlock } from "@/components/ui/spinner";
import { userManager, usersAdminManager } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import {
  Briefcase,
  Camera,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Share2,
  ShieldCheck,
  User,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const INPUT_CLASSES =
  "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#0058be] focus-visible:ring-2 focus-visible:ring-[#0058be]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800";

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
        setProfile({
          id: String(authUser.id),
          name: authUser.name || "",
          email: authUser.email || "",
          avatar: authUser?.avatarUrl ?? null,
          public_id: authUser?.public_id ?? null,
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

        const profileResponse = await userManager.getProfile();
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
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-[#0b1c30]">
      <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-12 lg:px-6">
        {/* Hero Header */}
        <div className="glass-card relative mb-6 overflow-hidden rounded-xl p-6">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#0058be]/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
              <div className="relative shrink-0">
                <div className="h-32 w-32 overflow-hidden rounded-2xl border-4 border-white shadow-xl md:h-40 md:w-40">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#e5eeff] dark:bg-[#1a2a3a]">
                      <User className="h-12 w-12 text-[#0058be] dark:text-[#66B2FF]" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-0 bottom-2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-[#0058be] focus-visible:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
                <div className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-400 shadow-sm md:right-0 md:bottom-0 dark:border-[#1a2a3a]">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              </div>

              <div className="text-center md:text-left">
                <h1 className="text-2xl font-bold text-[#0b1c30] md:text-3xl dark:text-white">
                  {profile.name}
                </h1>
                <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                  <p className="flex items-center gap-1.5 text-[#0058be] dark:text-[#66B2FF]">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="font-medium">Staff Administrator</span>
                  </p>
                  <span className="hidden h-1.5 w-1.5 rounded-full bg-slate-300 sm:block dark:bg-slate-600" />
                  <p className="flex items-center gap-1.5 text-[#45464d] dark:text-[#8f9099]">
                    <Mail className="h-3.5 w-3.5" />
                    {summaryEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-3">
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2 rounded-lg bg-[#0058be] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#0047a8]">
                <Edit className="h-4 w-4" />
                {t("general.edit")}
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c6c6cd] text-[#45464d] transition-colors hover:bg-[#eff4ff] dark:border-[#3a4558] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                <Lock className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c6c6cd] text-[#45464d] transition-colors hover:bg-[#eff4ff] dark:border-[#3a4558] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Sidebar */}
          <aside className="flex flex-col gap-6 lg:col-span-4">
            <div className="glass-card rounded-xl p-5">
              <h3 className="mb-4 text-base font-semibold text-[#0b1c30] dark:text-white">
                {t("userAccount.personalInfo")}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e5eeff] dark:bg-[#1a2a3a]">
                    <Briefcase className="h-4 w-4 text-[#0058be] dark:text-[#66B2FF]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                      {t("common.role")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[#0b1c30] dark:text-white">
                      Staff Administrator
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e5eeff] dark:bg-[#1a2a3a]">
                    <Mail className="h-4 w-4 text-[#0058be] dark:text-[#66B2FF]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                      {t("common.email")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[#0b1c30] dark:text-white">
                      {summaryEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e5eeff] dark:bg-[#1a2a3a]">
                    <FileText className="h-4 w-4 text-[#0058be] dark:text-[#66B2FF]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                      Staff ID
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-[#0b1c30] dark:text-slate-200">
                      {summaryId}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <h3 className="mb-4 text-base font-semibold text-[#0b1c30] dark:text-white">
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
                        className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                          isActive
                            ? "bg-[#dae2fd] dark:bg-[#0058be]/30"
                            : "hover:bg-[#eff4ff] dark:hover:bg-[#1a2a3a]"
                        }`}>
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isActive
                              ? "bg-[#0058be] text-white"
                              : "bg-[#e5eeff] text-[#0058be] dark:bg-[#1a2a3a] dark:text-[#66B2FF]"
                          }`}>
                          <TabIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0b1c30] dark:text-white">
                            {tab.label}
                          </p>
                          <p className="text-xs text-[#45464d] dark:text-[#8f9099]">
                            {tab.description}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-8">
            {activeTab === "profile" ? (
              <Card className="glass-card border-slate-200/60 p-6 dark:border-slate-700/60">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
                    {t("common.personalInformation")}
                  </h2>
                  <p className="mt-1 text-sm text-[#45464d] dark:text-[#8f9099]">
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
                      className="bg-[#0058be] px-6 text-white transition-colors hover:bg-[#0047a8] focus-visible:ring-[#0058be] dark:bg-[#0058be] dark:hover:bg-[#0047a8]">
                      {isSavingProfile ? (
                        <SpinnerBlock size="sm" className="mr-2 text-white/70" />
                      ) : null}
                      {t("general.save")}
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card className="glass-card border-slate-200/60 p-6 dark:border-slate-700/60">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
                    {t("common.changePassword")}
                  </h2>
                  <p className="mt-1 text-sm text-[#45464d] dark:text-[#8f9099]">
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
                      className="bg-[#0058be] px-6 text-white transition-colors hover:bg-[#0047a8] focus-visible:ring-[#0058be] dark:bg-[#0058be] dark:hover:bg-[#0047a8]">
                      {isSavingPassword ? (
                        <SpinnerBlock size="sm" className="mr-2 text-white/70" />
                      ) : null}
                      {t("changePassword.saveChanges")}
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
