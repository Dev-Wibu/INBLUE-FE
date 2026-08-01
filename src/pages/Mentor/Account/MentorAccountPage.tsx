import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerBlock } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { formatCurrency } from "@/lib/formatting";
import { queryClient } from "@/lib/queryClient";
import { mentorManager } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import {
  Award,
  Briefcase,
  Camera,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Share2,
  ShieldCheck,
  Star,
  Tag,
  User,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { MentorProfileData } from "./MentorAccountTabs";

const INPUT_CLASSES =
  "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800";

type AccountSubTab = "profile" | "security";

export function MentorAccountPage() {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Resolve the current mentor record via email lookup (handles the User.id vs
  // Mentor.id PK mismatch documented in `mentor.manager.ts`).
  const { data: currentMentor, isLoading: isLoadingMentor } = useCurrentMentorProfile();

  const [profile, setProfile] = useState<MentorProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<AccountSubTab>("profile");

  // Form states for Profile
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [pricePerMinute, setPricePerMinute] = useState(0);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const passwordId = useId();

  // Sync profile state from the resolved mentor record. Falls back to the
  // logged-in user data (snapshot) if no mentor record exists yet.
  useEffect(() => {
    if (isLoadingMentor) return;

    const fallbackId = authUser?.id ? String(authUser.id) : "";
    const fallbackName = authUser?.name ?? "";
    const fallbackEmail = authUser?.email ?? "";
    const fallbackAvatar = authUser?.avatarUrl ?? null;
    const fallbackPublicId = authUser?.public_id ?? null;

    if (currentMentor) {
      const data = currentMentor;
      setProfile({
        id: String(data.id ?? fallbackId),
        name: String(data.name ?? fallbackName ?? ""),
        email: String(data.email ?? fallbackEmail ?? ""),
        avatar: data.avatarUrl ? String(data.avatarUrl) : fallbackAvatar,
        public_id: data.public_id ? String(data.public_id) : fallbackPublicId,
        bio: data.bio ?? "",
        expertise: data.expertise ?? "",
        yearsOfExperience: data.yearsOfExperience ?? 0,
        linkedInUrl: data.linkedInUrl ?? "",
        currentCompany: data.currentCompany ?? "",
        pricePerMinute: data.pricePerMinute ?? 0,
        averageRating: data.averageRating ?? 0,
        totalSession: data.totalSession ?? 0,
        active: data.active !== false,
      });
      setName(String(data.name ?? fallbackName ?? ""));
      setBio(data.bio ?? "");
      setExpertise(data.expertise ?? "");
      setYearsOfExperience(data.yearsOfExperience ?? 0);
      setLinkedInUrl(data.linkedInUrl ?? "");
      setCurrentCompany(data.currentCompany ?? "");
      setPricePerMinute(data.pricePerMinute ?? 0);
    } else {
      setProfile({
        id: fallbackId,
        name: fallbackName,
        email: fallbackEmail,
        avatar: fallbackAvatar,
        public_id: fallbackPublicId,
        bio: "",
        expertise: "",
        yearsOfExperience: 0,
        linkedInUrl: "",
        currentCompany: "",
        pricePerMinute: 0,
        averageRating: 0,
        totalSession: 0,
        active: true,
      });
      setName(fallbackName);
    }
  }, [currentMentor, isLoadingMentor, authUser]);

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
      const response = await mentorManager.update(profile.id, {
        name,
        bio,
        expertise,
        yearsOfExperience,
        linkedInUrl,
        currentCompany,
        pricePerMinute,
        ...(profile.public_id ? { public_id: profile.public_id } : {}),
        ...(avatarFile ? { avatar: avatarFile } : {}),
      });

      if (response.success) {
        toast.success(t("common.updatedInformationSuccessfully"));

        if (authUser?.id) {
          setUser({
            ...authUser,
            name: name || authUser.name,
            avatarUrl: avatarPreview || (response.data?.avatarUrl as string) || authUser.avatarUrl,
            id: authUser.id,
          });
        }

        // Invalidate the cached mentor lookup so the next render fetches
        // the freshly-saved profile.
        if (authUser?.email) {
          queryClient.invalidateQueries({
            queryKey: ["mentors", "by-email", authUser.email],
          });
        }
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

    if (!profile?.id) {
      toast.error(t("mentorAccount.mentorIdNotFound"));
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await mentorManager.changePassword(profile.id, currentPassword, newPassword);
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
      className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center justify-center rounded text-slate-500 transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:outline-none dark:text-slate-400 dark:hover:text-slate-200">
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  if (isLoadingMentor) {
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
        {/* Hero Header Card */}
        <div className="glass-card relative mb-6 overflow-hidden rounded-xl p-6">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />
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
                    <div className="flex h-full w-full items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
                      <User className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-0 bottom-2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
                <div className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-sm md:right-0 md:bottom-0 dark:border-[#1a2a3a]">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              </div>

              <div className="text-center md:text-left">
                <h1 className="text-2xl font-bold text-[#0b1c30] md:text-3xl dark:text-white">
                  {profile.name}
                </h1>
                <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                  <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="font-medium">Mentor</span>
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
                onClick={() => setActiveTab("profile")}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700">
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
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                      {t("common.role")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[#0b1c30] dark:text-white">
                      Mentor
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                      Mentor ID
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-[#0b1c30] dark:text-slate-200">
                      {summaryId}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                      {t("common.numberOfYearsOfExperience")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[#0b1c30] dark:text-white">
                      {profile.yearsOfExperience || 0} {t("common.year")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                      {t("mentorAccount.unitPricePerMinute")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[#0b1c30] dark:text-white">
                      {profile.pricePerMinute && profile.pricePerMinute > 0
                        ? t("common.var0Min", {
                            var_0: formatCurrency(profile.pricePerMinute),
                          })
                        : t("common.notUpdatedYet")}
                    </p>
                  </div>
                </div>

                {profile.averageRating !== undefined && profile.averageRating > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                        {t("common.averageRating")}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-[#0b1c30] dark:text-white">
                        {profile.averageRating.toFixed(1)} / 5.0 ({profile.totalSession || 0}{" "}
                        {t("common.session1")})
                      </p>
                    </div>
                  </div>
                )}
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
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors ${
                          isActive
                            ? "bg-emerald-100/70 font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "hover:bg-[#eff4ff] dark:hover:bg-[#1a2a3a]"
                        }`}>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              isActive
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-100 text-emerald-600 dark:bg-[#1a2a3a] dark:text-emerald-400"
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
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                          }`}
                        />
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
                  <div className="grid gap-6 md:grid-cols-2">
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

                  <div className="space-y-2">
                    <Label
                      htmlFor="bio"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("common.introduceYourself")}
                    </Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className={INPUT_CLASSES}
                      placeholder={t("mentorAccount.writeAFewLinesIntroducing")}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="expertise"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("common.expertise")}
                      </Label>
                      <Input
                        id="expertise"
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                        className={INPUT_CLASSES}
                        placeholder={t("mentorAccount.forExampleReactNodeJs")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="yearsOfExperience"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("common.numberOfYearsOfExperience")}
                      </Label>
                      <Input
                        id="yearsOfExperience"
                        type="number"
                        min="0"
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(parseInt(e.target.value, 10) || 0)}
                        className={INPUT_CLASSES}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="currentCompany"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("common.currentCompany")}
                      </Label>
                      <Input
                        id="currentCompany"
                        value={currentCompany}
                        onChange={(e) => setCurrentCompany(e.target.value)}
                        className={INPUT_CLASSES}
                        placeholder={t("mentorAccount.forExampleLargeTechnologyCorporations")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="pricePerMinute"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("mentorAccount.unitPricePerMinute")}
                      </Label>
                      <Input
                        id="pricePerMinute"
                        type="number"
                        min="0"
                        value={pricePerMinute}
                        onChange={(e) => setPricePerMinute(parseInt(e.target.value, 10) || 0)}
                        className={INPUT_CLASSES}
                        placeholder={t("mentorAccount.enterUnitPriceVnd")}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label
                        htmlFor="linkedInUrl"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("common.linkedinLink")}
                      </Label>
                      <Input
                        id="linkedInUrl"
                        value={linkedInUrl}
                        onChange={(e) => setLinkedInUrl(e.target.value)}
                        className={INPUT_CLASSES}
                        placeholder={t("common.linkedinPlaceholder")}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSavingProfile || !name.trim()}
                      className="bg-emerald-600 px-6 text-white transition-colors hover:bg-emerald-700 focus-visible:ring-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700">
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
                      className="bg-emerald-600 px-6 text-white transition-colors hover:bg-emerald-700 focus-visible:ring-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700">
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
