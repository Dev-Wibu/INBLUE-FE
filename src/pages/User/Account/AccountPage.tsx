import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CVUploadModal from "@/components/ui/cv-upload-modal";
import { Progress } from "@/components/ui/progress";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useMajorOptions } from "@/constants/majors";
import { formatDate } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { usersAdminManager } from "@/services";
import {
  getLatestCandidateProfile,
  useCandidateProfile,
} from "@/services/candidate-profile.manager";
import { useAuthStore } from "@/stores/authStore";
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  Lightbulb,
  ListOrdered,
  Mail,
  Pencil,
  Receipt,
  Settings,
  User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { UserNotificationsPage } from "../Notifications";
import { JdPurchaseHistoryTab, ProfileEditTab, SettingsTab } from "./AccountTabs";
import type { UserProfileData } from "./AccountTabs/types";
import { CandidateProfileTab } from "./CandidateProfile";

type AccountSubTab =
  | "candidateProfile"
  | "notifications"
  | "jdPurchases"
  | "editProfile"
  | "settings";

const parseAccountSubTab = (value?: string | null): AccountSubTab | null => {
  if (
    value === "candidateProfile" ||
    value === "notifications" ||
    value === "jdPurchases" ||
    value === "editProfile" ||
    value === "settings"
  ) {
    return value as AccountSubTab;
  }
  return null;
};

export function AccountPage() {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const authUserId = authUser?.id;
  const { data: candidateProfileData } = useCandidateProfile(authUserId || 0);
  const candidateProfile = getLatestCandidateProfile(candidateProfileData);
  const [searchParams, setSearchParams] = useSearchParams();
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<AccountSubTab>(
    parseAccountSubTab(searchParams.get("subtab")) || "candidateProfile"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isCvModalOpen, setIsCvModalOpen] = useState(false);
  const [isCvUploading, setIsCvUploading] = useState(false);
  const hasLoadedUserDataRef = useRef(false);

  const fetchUserData = useCallback(async () => {
    const currentAuthUser = useAuthStore.getState().user;
    if (!authUserId || !currentAuthUser) {
      setIsLoading(false);
      return;
    }
    if (!hasLoadedUserDataRef.current) {
      setIsLoading(true);
    }
    try {
      const response = await usersAdminManager.getById(authUserId);
      if (response.success && response.data) {
        const userData = response.data;
        setUserProfile({
          id: String(userData.id || authUserId),
          name: userData.name || currentAuthUser.name || "",
          email: userData.email || currentAuthUser.email || "",
          avatar: userData.avatarUrl || null,
          public_id: userData.public_id || null,
          // @ts-expect-error: Backend Swagger schema mismatch - university not in User type
          university: userData.university || "",
          major: userData.major || "",
          cvUrl: userData.cvUrl || null,
          cv_public_id: userData.cv_public_id || null,
          phone: userData.phone || "",
          address: userData.address || "",
          linkedInUrl: userData.linkedInUrl || "",
          githubUrl: userData.githubUrl || "",
          createdAt: new Date().toISOString(),
        });
      } else {
        setUserProfile({
          id: String(authUserId),
          name: currentAuthUser.name || "",
          email: currentAuthUser.email || "",
          avatar: currentAuthUser.avatarUrl || null,
          public_id: currentAuthUser.public_id || null,
          university: "",
          major: "",
          cvUrl: null,
          cv_public_id: null,
          phone: "",
          address: "",
          linkedInUrl: "",
          githubUrl: "",
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      if (currentAuthUser) {
        setUserProfile({
          id: String(currentAuthUser.id),
          name: currentAuthUser.name || "",
          email: currentAuthUser.email || "",
          avatar: currentAuthUser.avatarUrl || null,
          public_id: currentAuthUser.public_id || null,
          university: "",
          major: "",
          cvUrl: null,
          cv_public_id: null,
          phone: "",
          address: "",
          linkedInUrl: "",
          githubUrl: "",
          createdAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsLoading(false);
      hasLoadedUserDataRef.current = true;
    }
  }, [authUserId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    const nextTab = parseAccountSubTab(searchParams.get("subtab")) || "candidateProfile";
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [searchParams]);

  const handleSwitchTab = useCallback(
    (nextTab: AccountSubTab) => {
      setActiveTab(nextTab);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("subtab", nextTab);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCvUpload = async (file: File) => {
    if (!userProfile?.id) {
      toast.error(t("userAccount.userIdNotFound"));
      return;
    }
    setIsCvUploading(true);
    try {
      const response = await usersAdminManager.uploadCv(userProfile.id, file);
      if (response.success) {
        await fetchUserData();
        toast.success(t("common.uploadCvSuccessfully"));
      } else {
        toast.error(response.error || t("common.uploadCvFailed"));
        throw new Error(response.error);
      }
    } catch {
      throw new Error(t("common.uploadCvFailed"));
    } finally {
      setIsCvUploading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "candidateProfile":
        return <CandidateProfileTab />;
      case "editProfile":
        return (
          <ProfileEditTab
            onBack={() => handleSwitchTab("candidateProfile")}
            onSuccess={() => {
              fetchUserData();
              handleSwitchTab("candidateProfile");
            }}
            userProfile={userProfile!}
          />
        );
      case "notifications":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <UserNotificationsPage />
          </div>
        );
      case "jdPurchases":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <JdPurchaseHistoryTab />
          </div>
        );
      case "settings":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SettingsTab />
          </div>
        );
      default:
        return <CandidateProfileTab />;
    }
  };

  const renderRightWidget = () => {
    const fields = [
      !!userProfile?.name && !!userProfile?.email,
      !!userProfile?.phone && !!userProfile?.address,
      !!userProfile?.linkedInUrl && !!userProfile?.githubUrl,
    ];
    const completedCount = fields.filter(Boolean).length;
    const percentage = Math.round((completedCount / fields.length) * 100);

    return (
      <div className="hidden space-y-6 lg:sticky lg:top-4 lg:col-span-3 lg:block">
        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
            {t("userAccount.profileCompleteness")}
          </h4>
          <div className="mb-4 flex items-center gap-3">
            <Progress value={percentage} className="h-2" />
            <span className="text-sm font-bold text-indigo-600">{percentage}%</span>
          </div>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              {fields[0] ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300" />
              )}
              {t("userAccount.profileBasicInfo")}
            </li>
            <li className="flex items-center gap-2">
              {fields[1] ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300" />
              )}
              {t("userAccount.profilePhoneAndAddress")}
            </li>
            <li className="flex items-center gap-2">
              {fields[2] ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300" />
              )}
              LinkedIn / GitHub
            </li>
          </ul>
        </Card>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/40">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-300">
            <Lightbulb className="h-4 w-4 text-amber-500" /> {t("userAccount.profileAiTipTitle")}
          </h4>
          <p className="text-xs leading-relaxed text-indigo-700 dark:text-indigo-400">
            {t("userAccount.profileAiTipContent")}
          </p>
        </div>
      </div>
    );
  };

  const summaryAvatar = userProfile?.avatar || authUser?.avatarUrl || null;
  const summaryName = userProfile?.name || authUser?.name || t("common.account");
  const summaryEmail = userProfile?.email || authUser?.email || "—";
  const summaryJoinedAt = userProfile?.createdAt ? formatDate(userProfile.createdAt) : "—";

  const candidateSchool = candidateProfile?.educations?.[0]?.school || "";
  const candidateTargetRole = candidateProfile?.targetRole || "";
  const candidateEducationMajor = candidateProfile?.educations?.[0]?.major || "";

  const summaryUniversity =
    userProfile?.university ||
    ((authUser as Record<string, unknown>)?.university as string) ||
    candidateSchool ||
    "";
  const summaryMajor =
    candidateTargetRole ||
    candidateEducationMajor ||
    userProfile?.major ||
    ((authUser as Record<string, unknown>)?.major as string) ||
    "";

  const majorOptions = useMajorOptions();
  const getMajorLabel = (value: string): string => {
    if (!value) return "";
    const major = majorOptions.find((option) => option.value === value);
    return major?.label || value;
  };

  const tabItems: Array<{
    id: AccountSubTab;
    label: string;
    description: string;
    icon: React.ElementType;
  }> = [
    {
      id: "candidateProfile",
      label: t("common.candidateProfile"),
      description: t("userAccount.managePersonalRecruitmentRecords"),
      icon: FileText,
    },
    {
      id: "notifications",
      label: t("common.notification", "Thông báo"),
      description: t("common.manageAllYourNotifications", "Xem và quản lý tất cả thông báo"),
      icon: Bell,
    },
    {
      id: "jdPurchases",
      label: t("payment.jdPurchaseHistory"),
      description: t("payment.jdPurchaseNoPurchases"),
      icon: Receipt,
    },
    {
      id: "settings",
      label: t("userAccount.quickSettings", { defaultValue: "Cài đặt" }),
      description: t("userAccount.quickSettingsDescription", {
        defaultValue: "Giao diện, ngôn ngữ, cài đặt hệ thống",
      }),
      icon: Settings,
    },
  ];

  const summaryMajorLabel = getMajorLabel(summaryMajor);
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="w-full px-4 pt-4 pb-8 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <aside className="sticky top-4 z-20 flex flex-col gap-6 self-start lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
              <div className="relative h-24 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-blue-500/15 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-blue-500/10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSwitchTab("editProfile")}
                  className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  title={t("general.edit")}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative px-5 pb-5 text-center">
                <div className="-mt-12 mb-3 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md dark:border-slate-900 dark:bg-slate-800">
                  {summaryAvatar ? (
                    <img
                      src={summaryAvatar}
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
                  {summaryUniversity && (
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {summaryUniversity}
                    </span>
                  )}
                  {summaryUniversity && summaryMajorLabel && (
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                  )}
                  {summaryMajorLabel && (
                    <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      {summaryMajorLabel}
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-2 px-1">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <span className="truncate">{summaryEmail}</span>
                  </div>
                  {summaryJoinedAt && (
                    <div className="flex items-center justify-center gap-2 px-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">
                        {t("userAccount.joinDate")} {summaryJoinedAt}
                      </span>
                    </div>
                  )}
                  {candidateProfile?.targetLevel && (
                    <div className="flex items-center justify-center gap-2 px-1 pt-1">
                      <Badge variant="secondary" className="px-2 py-0.5 text-[11px] font-medium">
                        {candidateProfile.targetLevel}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table of Contents / Account Management Navigation Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                {t("userAccount.quickSettings")}
              </h3>
              <ul className="space-y-1.5">
                {tabItems.map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => handleSwitchTab(tab.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl p-3 text-left transition-all",
                          isActive
                            ? "border border-indigo-200/80 bg-indigo-50/80 font-medium text-indigo-700 shadow-2xs dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300"
                            : "border border-transparent text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                        )}>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                              isActive
                                ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            )}>
                            <TabIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{tab.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {tab.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform",
                            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <button
              onClick={() => setIsCvModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>{userProfile?.cvUrl ? t("common.updateCv") : t("common.uploadCv")}</span>
            </button>
          </aside>

          <div
            className={cn(
              activeTab === "candidateProfile" || activeTab === "editProfile"
                ? "lg:col-span-7"
                : "lg:col-span-9"
            )}>
            {isLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200/60 bg-white p-12 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <SpinnerBlock size="lg" />
              </div>
            ) : (
              renderTabContent()
            )}
          </div>

          {/* Right Column: Table of Contents / Dynamic Widget */}
          <div className="z-10 hidden lg:sticky lg:top-6 lg:col-span-2 lg:block lg:self-start">
            {activeTab === "candidateProfile" && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800/80">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <ListOrdered className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs font-bold tracking-wider text-slate-900 uppercase dark:text-white">
                    {t("userAccount.contents")}
                  </h4>
                </div>
                <nav className="space-y-1">
                  {[
                    {
                      id: "intro",
                      label: t("common.introduce"),
                      show: !!candidateProfile?.introduction,
                    },
                    { id: "skills", label: t("common.technicalSkills"), show: true },
                    { id: "experience", label: t("common.workExperience"), show: true },
                    { id: "projects", label: t("common.project"), show: true },
                    { id: "education", label: t("common.education"), show: true },
                    { id: "certifications", label: t("common.certifications"), show: true },
                    { id: "achievements", label: t("common.achievements"), show: true },
                  ]
                    .filter((item) => item.show)
                    .map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => scrollToSection(e, item.id)}
                        className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-indigo-50/80 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 transition-colors group-hover:bg-indigo-600 dark:bg-slate-700 dark:group-hover:bg-indigo-400" />
                        <span className="flex-1 truncate">{item.label}</span>
                      </a>
                    ))}
                </nav>
              </div>
            )}

            {activeTab === "editProfile" && renderRightWidget()}
          </div>
        </div>
      </div>
      <CVUploadModal
        isOpen={isCvModalOpen}
        onOpenChange={setIsCvModalOpen}
        currentCvUrl={userProfile?.cvUrl}
        onUpload={handleCvUpload}
        isUploading={isCvUploading}
        title={t("common.uploadCv")}
        description={t("userAccount.uploadYourCvSoThe")}
      />
    </div>
  );
}
