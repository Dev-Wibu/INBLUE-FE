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
  Briefcase,
  Camera,
  CheckCircle2,
  ChevronRight,
  Circle,
  Lightbulb,
  Lock,
  Mail,
  ShieldCheck,
  Star,
  Tag,
  User,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { MentorProfileData } from "./MentorAccountTabs";

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
  const summaryName = profile.name || t("common.account");
  const summaryExpertise = profile.expertise || t("mentorAccount.notUpdatedYet");
  const summaryYears = profile.yearsOfExperience || 0;
  const summaryPrice =
    profile.pricePerMinute && profile.pricePerMinute > 0
      ? formatCurrency(profile.pricePerMinute)
      : t("common.notUpdatedYet");
  const summaryRating =
    profile.averageRating && profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "—";

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

  // Completion percentage for right widget — matches Candidate AccountPage
  const completionFields = [
    !!profile.name && !!profile.email,
    !!profile.bio,
    !!profile.expertise,
    !!profile.yearsOfExperience && profile.yearsOfExperience > 0,
    !!profile.linkedInUrl,
    !!profile.currentCompany,
    profile.pricePerMinute !== undefined && profile.pricePerMinute > 0,
  ];
  const completedCount = completionFields.filter(Boolean).length;
  const completionPercentage = Math.round((completedCount / completionFields.length) * 100);

  const renderRightWidget = () => (
    <div className="hidden space-y-6 lg:sticky lg:top-4 lg:col-span-2 lg:block">
      <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <h4 className="mb-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
          {t("userAccount.profileCompletion", { defaultValue: "Độ hoàn thiện hồ sơ" })}
        </h4>
        <div className="mb-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {completionPercentage}%
          </span>
        </div>
        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
          {[
            {
              done: completionFields[0],
              label: t("userAccount.basicInfo", { defaultValue: "Thông tin cơ bản" }),
            },
            {
              done: completionFields[1],
              label: t("userAccount.bio", { defaultValue: "Giới thiệu bản thân" }),
            },
            { done: completionFields[2], label: t("common.expertise") },
            { done: completionFields[3], label: t("common.numberOfYearsOfExperience") },
            {
              done: completionFields[4],
              label: t("userAccount.socialLinks", { defaultValue: "LinkedIn" }),
            },
          ].map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300" />
              )}
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-300">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          {t("userAccount.aiOptimizationTips", { defaultValue: "Mẹo tối ưu từ AI" })}
        </h4>
        <p className="text-xs leading-relaxed text-indigo-700 dark:text-indigo-400">
          {t("userAccount.completeProfileTip", {
            defaultValue:
              "Hồ sơ đầy đủ thông tin giúp học viên tin tưởng và đặt lịch phỏng vấn với bạn nhiều hơn.",
          })}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="w-full px-4 pt-4 pb-8 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <aside className="flex flex-col gap-6 lg:sticky lg:top-4 lg:col-span-3 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="relative h-24 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-blue-500/15 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-blue-500/10">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  title={t("general.edit") || "Chỉnh sửa"}>
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
              <div className="relative px-5 pb-5 text-center">
                <div className="-mt-12 mb-3 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md dark:border-slate-900 dark:bg-slate-800">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt={summaryName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-9 w-9 text-slate-400" />
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {summaryName}
                </h3>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Mentor
                  </span>
                  {summaryExpertise && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                        {summaryExpertise}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-2 px-1">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <span className="truncate">{summaryEmail}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 px-1">
                    <Briefcase className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="truncate">
                      {summaryYears} {t("common.year")}
                    </span>
                  </div>
                  {profile.averageRating && profile.averageRating > 0 && (
                    <div className="flex items-center justify-center gap-2 px-1 pt-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {summaryRating} / 5.0 ({profile.totalSession || 0} {t("common.session1")})
                      </span>
                    </div>
                  )}
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
                        className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors ${
                          isActive
                            ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                            : "text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                        }`}>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              isActive
                                ? "bg-indigo-600 text-white dark:bg-indigo-500"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
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
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                          }`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                <Tag className="h-3.5 w-3.5" />
                {t("mentorAccount.unitPricePerMinute")}
              </h4>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{summaryPrice}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("mentorAccount.priceHint", {
                  defaultValue: "Học viên sẽ trả theo đơn vị/phút cho mỗi phiên.",
                })}
              </p>
            </div>
          </aside>

          <div className="lg:col-span-7">
            {activeTab === "profile" ? (
              <Card className="rounded-2xl border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t("common.personalInformation")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
                        className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
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
                        className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("userAccount.emailCannotBeChanged")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2" id="bio">
                    <Label
                      htmlFor="bio"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("common.introduceYourself")}
                    </Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                      placeholder={t("mentorAccount.writeAFewLinesIntroducing")}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2" id="expertise">
                      <Label
                        htmlFor="expertise"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("common.expertise")}
                      </Label>
                      <Input
                        id="expertise"
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                        className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                        placeholder={t("mentorAccount.forExampleReactNodeJs")}
                      />
                    </div>

                    <div className="space-y-2" id="yearsOfExperience">
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
                        className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                      />
                    </div>

                    <div className="space-y-2" id="currentCompany">
                      <Label
                        htmlFor="currentCompany"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("common.currentCompany")}
                      </Label>
                      <Input
                        id="currentCompany"
                        value={currentCompany}
                        onChange={(e) => setCurrentCompany(e.target.value)}
                        className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                        placeholder={t("mentorAccount.forExampleLargeTechnologyCorporations")}
                      />
                    </div>

                    <div className="space-y-2" id="pricePerMinute">
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
                        className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                        placeholder={t("mentorAccount.enterUnitPriceVnd")}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2" id="linkedInUrl">
                      <Label
                        htmlFor="linkedInUrl"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("common.linkedinLink")}
                      </Label>
                      <Input
                        id="linkedInUrl"
                        value={linkedInUrl}
                        onChange={(e) => setLinkedInUrl(e.target.value)}
                        className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                        placeholder={t("common.linkedinPlaceholder")}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
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
            ) : (
              <Card className="rounded-2xl border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t("common.changePassword")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
                        className="border-slate-200 bg-white pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                        placeholder={t("changePassword.currentPasswordPlaceholder")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center justify-center rounded text-slate-500 transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-600/40 focus-visible:outline-none dark:text-slate-400 dark:hover:text-slate-200">
                        {showCurrentPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                            <line x1="2" y1="2" x2="22" y2="22" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
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
                        className="border-slate-200 bg-white pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                        placeholder={t("changePassword.newPasswordPlaceholder")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center justify-center rounded text-slate-500 transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-600/40 focus-visible:outline-none dark:text-slate-400 dark:hover:text-slate-200">
                        {showNewPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                            <line x1="2" y1="2" x2="22" y2="22" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
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
                        className="border-slate-200 bg-white pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20 disabled:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                        placeholder={t("changePassword.confirmPasswordPlaceholder")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center justify-center rounded text-slate-500 transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-600/40 focus-visible:outline-none dark:text-slate-400 dark:hover:text-slate-200">
                        {showConfirmPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                            <line x1="2" y1="2" x2="22" y2="22" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
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
            )}
          </div>

          {/* Right Column: Dynamic Widget — matches Candidate AccountPage */}
          <div className="hidden lg:col-span-2 lg:block">{renderRightWidget()}</div>
        </div>
      </div>
    </div>
  );
}
