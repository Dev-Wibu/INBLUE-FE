import {
  DashboardSidebar,
  getInitialSidebarCollapsed,
  type SidebarMenuGroup,
} from "@/components/shared";
import { AdminGradingTabProvider } from "@/contexts/AdminGradingTabContext";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  Bell,
  BrainCircuit,
  Briefcase,
  Building2,
  ClipboardCheck,
  Code2,
  Database,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Library,
  MessageSquare,
  Newspaper,
  Settings,
  Star,
  UserCog,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import {
  ApplicationGradingDetailPage,
  ApplicationGradingPage,
} from "../ApplicationGrading/ApplicationGradingPage";
import { CandidateProfileManagementPage } from "../CandidateProfileManagement";
import { CodeReviewProblemManagementPage } from "../CodeReviewProblemManagement";
import { CodingProblemManagementPage } from "../CodingProblemManagement";
import { CompanyManagementPage } from "../CompanyManagement";
import { DashboardOverviewPage } from "../DashboardOverview";
import { FeedbackManagementPage } from "../FeedbackManagement";
import { InterviewTemplateManagementPage } from "../InterviewTemplateManagement/InterviewTemplateManagementPage";
import { MentorManagementPage } from "../MentorManagement";
import { NotificationManagementPage } from "../NotificationManagement";
import { PostManagementPage } from "../PostManagement";
import { PracticeQuestionManagementPage } from "../PracticeQuestionManagement";
import { PracticeSetManagementPage } from "../PracticeSetManagement";
import { QuestionBankManagementPage } from "../QuestionBankManagement";
import { QuestionMajorManagementPage } from "../QuestionMajorManagement";
import { ReviewManagementPage } from "../ReviewManagement";
import { SessionManagementPage } from "../SessionManagement";
import { UserManagementPage } from "../UserManagement";
import { AdminHeader } from "./components/AdminHeader";

const getSidebarMenuGroups = (t: (key: string) => string): SidebarMenuGroup[] => [
  {
    items: [
      {
        type: "dashboard",
        icon: LayoutDashboard,
        label: t("common.dashboard"),
        color: "text-slate-400",
      },
      {
        type: "system",
        icon: Settings,
        label: t("adminAdmindashboard.administration"),
        color: "text-slate-400",
        children: [
          { type: "users", icon: Users, label: t("common.user"), color: "text-slate-400" },
          {
            type: "mentors",
            icon: UserCog,
            label: t("adminAdmindashboard.instructor"),
            color: "text-slate-400",
          },
          {
            type: "companies",
            icon: Building2,
            label: t("common.company"),
            color: "text-slate-400",
          },
          {
            type: "notifications",
            icon: Bell,
            label: t("common.notification"),
            color: "text-slate-400",
          },
        ],
      },
      {
        type: "recruitment",
        icon: Briefcase,
        label: t("adminAdmindashboard.recruitment"),
        color: "text-slate-400",
        children: [
          {
            type: "sessions",
            icon: Video,
            label: t("common.interviewSession"),
            color: "text-slate-400",
          },
          {
            type: "interviewTemplates",
            icon: LayoutTemplate,
            label: t("adminAdmindashboard.processTemplate"),
            color: "text-slate-400",
          },
          {
            type: "candidateProfiles",
            icon: FileText,
            label: t("common.candidateProfile"),
            color: "text-slate-400",
          },
          {
            type: "reviews",
            icon: Star,
            label: t("common.reviewFromMentor"),
            color: "text-slate-400",
          },
          {
            type: "feedback",
            icon: MessageSquare,
            label: t("common.feedbackFromCandidates"),
            color: "text-slate-400",
          },
          {
            type: "applicationGrading",
            icon: ClipboardCheck,
            label: t("adminAdmindashboard.candidateGrading"),
            color: "text-slate-400",
          },
        ],
      },
      {
        type: "testing",
        icon: BrainCircuit,
        label: t("adminAdmindashboard.testingAndTraining"),
        color: "text-slate-400",
        children: [
          {
            type: "questionBanks",
            icon: Database,
            label: t("common.questionBank"),
            color: "text-slate-400",
          },
          {
            type: "codeReviewProblems",
            icon: Code2,
            label: "Code Review Problems",
            color: "text-slate-400",
          },
          {
            type: "codingProblems",
            icon: Code2,
            label: "Vòng Coding",
            color: "text-slate-400",
          },
        ],
      },
      {
        type: "content",
        icon: Library,
        label: t("common.content"),
        color: "text-slate-400",
        children: [
          {
            type: "posts",
            icon: Newspaper,
            label: t("common.articlesCommunity"),
            color: "text-slate-400",
          },
        ],
      },
    ],
  },
];

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarBehavior = useSettingsStore((state) => state.sidebarBehavior);

  const sidebarMenuGroups = useMemo(() => getSidebarMenuGroups(t), [t]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    getInitialSidebarCollapsed(
      "admin_sidebar_collapsed",
      "manager_sidebar_collapsed",
      sidebarBehavior === "auto-collapse"
    )
  );

  useEffect(() => {
    setIsSidebarCollapsed(sidebarBehavior === "auto-collapse");
  }, [sidebarBehavior]);

  // Determine active tab from URL path
  const pathParts = location.pathname.split("/").filter(Boolean);
  const activeTab = pathParts.length > 1 ? pathParts[1] : "dashboard";

  const handleSidebarNavigate = (type: string) => {
    navigate(`/admin/${type === "dashboard" ? "" : type}`);
  };

  // Find current title for header
  const currentTitle = useMemo(() => {
    for (const group of sidebarMenuGroups) {
      for (const item of group.items) {
        if (item.type === activeTab) return item.label;
        if (item.children) {
          const child = item.children.find((c) => c.type === activeTab);
          if (child) return child.label;
        }
      }
    }
    return t("common.dashboard");
  }, [activeTab, sidebarMenuGroups, t]);

  const ADMIN_SIDEBAR_LOGO = useMemo(
    () => (
      <>
        <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <LayoutDashboard className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-gray-900 dark:text-white">
            {t("adminAdmindashboard.administrator")}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {t("adminAdmindashboard.systemAdministration")}
          </p>
        </div>
      </>
    ),
    [t]
  );

  const ADMIN_SIDEBAR_LOGO_COLLAPSED = useMemo(
    () => (
      <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        <LayoutDashboard className="h-6 w-6 text-white" />
      </div>
    ),
    []
  );

  return (
    <div className="isolate flex h-screen bg-gray-50 dark:bg-slate-950">
      <DashboardSidebar
        menuGroups={sidebarMenuGroups}
        activeTab={activeTab}
        onNavigate={handleSidebarNavigate}
        storageKey="admin_sidebar_collapsed"
        legacyStorageKey="manager_sidebar_collapsed"
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
        showDesktopToggle={false}
        logo={ADMIN_SIDEBAR_LOGO}
        collapsedLogo={ADMIN_SIDEBAR_LOGO_COLLAPSED}
        showSettings={false}
        theme={{
          wrapper: "h-full bg-slate-900",
          expandedWidth: "w-64",
          collapsedWidth: "w-[72px]",
          logoBorder: "border-b border-slate-800",
          logoExpandedPadding: "h-16 gap-3 px-5",
          logoCollapsedPadding: "h-16 justify-center px-2",
          navWrapper: "flex-1 space-y-1 overflow-y-auto px-4 py-5",
          navExpandedPadding: "p-0",
          navCollapsedPadding: "p-0",
          sectionLabel:
            "text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-3 mt-6 px-3",
          divider: "",
          itemPy: "py-2.5",
          activeItem:
            "bg-indigo-500/10 text-indigo-400 font-semibold rounded-xl shadow-sm ring-1 ring-indigo-500/20",
          inactiveItem:
            "text-slate-400 rounded-xl hover:bg-slate-800/60 hover:text-slate-200 transition-all",
          activeIconOverride: "text-indigo-400",
          flyoutActiveItem: "bg-indigo-500/10 text-indigo-400 font-semibold rounded-lg",
          flyoutInactiveItem:
            "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all rounded-lg",
          flyoutActiveIcon: "text-indigo-400",
          flyoutBorder: "border-slate-700/80",
          footerBorder: "border-t border-slate-800",
          footerExpandedPadding: "p-4",
          footerCollapsedPadding: "p-3",
          logoutExpandedBtn:
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400",
          logoutCollapsedBtn:
            "flex items-center justify-center rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400",
          logoutIcon: "",
          logoutLabel: t("common.logout"),
        }}
      />

      <div className="relative z-0 flex flex-1 flex-col overflow-x-hidden">
        <AdminHeader
          title={currentTitle}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <AdminGradingTabProvider openGradingTab={() => {}}>
            <Routes>
              <Route path="/" element={<DashboardOverviewPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="mentors" element={<MentorManagementPage />} />
              <Route path="sessions" element={<SessionManagementPage />} />
              <Route path="reviews" element={<ReviewManagementPage />} />
              <Route path="feedback" element={<FeedbackManagementPage />} />
              <Route path="notifications" element={<NotificationManagementPage />} />
              <Route path="questionBanks" element={<QuestionBankManagementPage />} />
              <Route path="questionMajors" element={<QuestionMajorManagementPage />} />
              <Route path="practiceSets" element={<PracticeSetManagementPage />} />
              <Route path="practiceQuestions" element={<PracticeQuestionManagementPage />} />
              <Route path="posts" element={<PostManagementPage />} />
              <Route path="companies" element={<CompanyManagementPage isActive={true} />} />
              <Route path="candidateProfiles" element={<CandidateProfileManagementPage />} />
              <Route path="interviewTemplates" element={<InterviewTemplateManagementPage />} />
              <Route
                path="applicationGrading"
                element={
                  <ApplicationGradingPage
                    onOpenGradingDetail={(appId) =>
                      navigate(`/admin/grading-detail?appId=${appId}`)
                    }
                  />
                }
              />
              <Route
                path="grading-detail"
                element={
                  <ApplicationGradingDetailPage
                    appId={new URLSearchParams(location.search).get("appId") || ""}
                  />
                }
              />
              <Route path="codeReviewProblems" element={<CodeReviewProblemManagementPage />} />
              <Route path="codingProblems" element={<CodingProblemManagementPage />} />
            </Routes>
          </AdminGradingTabProvider>
        </main>
      </div>
    </div>
  );
}
