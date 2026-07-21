import {
  DashboardSidebar,
  getInitialSidebarCollapsed,
  type SidebarMenuGroup,
} from "@/components/shared";
import { AdminGradingTabProvider } from "@/contexts/AdminGradingTabContext";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  Code2,
  Database,
  LayoutDashboard,
  LayoutTemplate,
  MessageSquare,
  Newspaper,
  Star,
  UserCheck,
  UserCog,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { MentorReviewAssignmentPage } from "@/pages/Admin/MentorReviewAssignment";
import { AdminAccountPage } from "../Account/AdminAccountPage";
import {
  ApplicationGradingDetailPage,
  ApplicationGradingPage,
} from "../ApplicationGrading/ApplicationGradingPage";
import { CodeReviewProblemManagementPage } from "../CodeReviewProblemManagement";
import { CodingProblemManagementPage } from "../CodingProblemManagement";
import { CompanyManagementPage } from "../CompanyManagement";
import { DashboardOverviewPage } from "../DashboardOverview";
import { FeedbackManagementPage } from "../FeedbackManagement";
import { InterviewTemplateDetailPage } from "../InterviewTemplateManagement/InterviewTemplateDetailPage";
import { InterviewTemplateManagementPage } from "../InterviewTemplateManagement/InterviewTemplateManagementPage";
import { KioskBookingManagementPage } from "../KioskBookingManagement";
import { KioskManagementPage, KioskSchedulePage } from "../KioskManagement";
import { MentorManagementPage } from "../MentorManagement";
import { NotificationManagementPage } from "../NotificationManagement";
import { PostManagementPage } from "../PostManagement";
import { PracticeQuestionManagementPage } from "../PracticeQuestionManagement";
import { PracticeSetManagementPage } from "../PracticeSetManagement";
import { QuestionBankManagementPage } from "../QuestionBankManagement";
import { QuestionMajorManagementPage } from "../QuestionMajorManagement";
import { ReviewManagementPage } from "../ReviewManagement";
import { SessionFormPage, SessionManagementPage } from "../SessionManagement";
import { UserManagementPage } from "../UserManagement";
import { AdminHeader } from "./components/AdminHeader";

const getSidebarMenuGroups = (t: (key: string) => string): SidebarMenuGroup[] => [
  {
    items: [
      {
        type: "dashboard",
        icon: LayoutDashboard,
        label: t("common.dashboard"),
        color: "text-blue-600 dark:text-blue-500",
      },
    ],
  },
  {
    label: t("adminAdmindashboard.administration"),
    items: [
      {
        type: "users",
        icon: Users,
        label: t("common.user"),
        color: "text-purple-600 dark:text-purple-500",
      },
      {
        type: "mentors",
        icon: UserCog,
        label: t("adminAdmindashboard.instructor"),
        color: "text-orange-600 dark:text-orange-500",
      },
      {
        type: "companies",
        icon: Building2,
        label: t("common.company"),
        color: "text-indigo-600 dark:text-indigo-500",
      },
      {
        type: "notifications",
        icon: Bell,
        label: t("common.notification"),
        color: "text-red-500 dark:text-red-400",
      },
    ],
  },
  {
    label: t("adminAdmindashboard.recruitment"),
    items: [
      {
        type: "sessions",
        icon: Video,
        label: t("common.interviewSession"),
        color: "text-rose-600 dark:text-rose-500",
      },
      {
        type: "interviewTemplates",
        icon: LayoutTemplate,
        label: t("adminAdmindashboard.processTemplate"),
        color: "text-teal-600 dark:text-teal-500",
      },
      {
        type: "reviews",
        icon: Star,
        label: t("common.reviewFromMentor"),
        color: "text-yellow-600 dark:text-yellow-500",
      },
      {
        type: "feedback",
        icon: MessageSquare,
        label: t("common.feedbackFromCandidates"),
        color: "text-cyan-600 dark:text-cyan-500",
      },
      {
        type: "mentor-review-assignment",
        icon: UserCheck,
        label: t("adminMentorReviewAssignment.sidebarLabel"),
        color: "text-blue-600 dark:text-blue-500",
      },
      {
        type: "kiosk-bookings",
        icon: CalendarClock,
        label: t("adminKiosk.bookingRequests"),
        color: "text-amber-600 dark:text-amber-500",
      },
      {
        type: "kiosk-management",
        icon: CalendarDays,
        label: t("adminKioskManagement.title"),
        color: "text-pink-600 dark:text-pink-500",
      },
    ],
  },
  {
    label: t("adminAdmindashboard.testingAndTraining"),
    items: [
      {
        type: "questionBanks",
        icon: Database,
        label: t("common.questionBank"),
        color: "text-indigo-600 dark:text-indigo-500",
      },
      {
        type: "codeReviewProblems",
        icon: Code2,
        label: t("adminAdmindashboard.codeReviewProblems"),
        color: "text-emerald-600 dark:text-emerald-500",
      },
      {
        type: "codingProblems",
        icon: Code2,
        label: t("adminAdmindashboard.codingProblems"),
        color: "text-cyan-600 dark:text-cyan-500",
      },
    ],
  },
  {
    label: t("common.content"),
    items: [
      {
        type: "posts",
        icon: Newspaper,
        label: t("common.articlesCommunity"),
        color: "text-orange-600 dark:text-orange-500",
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

  // Find current title and category for header
  const { currentTitle, currentCategory } = useMemo(() => {
    for (const group of sidebarMenuGroups) {
      for (const item of group.items) {
        if (item.type === activeTab) {
          return { currentTitle: item.label, currentCategory: group.label };
        }
        if (item.children) {
          const child = item.children.find((c) => c.type === activeTab);
          if (child) {
            return { currentTitle: child.label, currentCategory: group.label };
          }
        }
      }
    }
    return { currentTitle: t("common.dashboard"), currentCategory: undefined };
  }, [activeTab, sidebarMenuGroups, t]);

  const ADMIN_SIDEBAR_LOGO = useMemo(
    () => (
      <>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0047AB] shadow-sm">
          <span className="text-base font-bold text-white">IB</span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-widest text-[#0047AB] dark:text-[#66B2FF]">
            INBLUE
          </h1>
        </div>
      </>
    ),
    []
  );

  const ADMIN_SIDEBAR_LOGO_COLLAPSED = useMemo(
    () => (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0047AB] shadow-sm">
        <span className="text-base font-bold text-white">IB</span>
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
        onProfileClick={() => navigate("/admin/account")}
        storageKey="admin_sidebar_collapsed"
        legacyStorageKey="manager_sidebar_collapsed"
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
        showDesktopToggle={false}
        logo={ADMIN_SIDEBAR_LOGO}
        collapsedLogo={ADMIN_SIDEBAR_LOGO_COLLAPSED}
        showSettings={false}
        theme={{
          wrapper:
            "h-full border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900",
          expandedWidth: "w-64",
          collapsedWidth: "w-[72px]",
          logoBorder: "border-b border-gray-200 dark:border-slate-800",
          logoExpandedPadding: "h-16 gap-3 px-8",
          logoCollapsedPadding: "h-16 justify-center px-2",
          navWrapper: "flex-1 space-y-1 overflow-y-auto scrollbar-hide",
          navExpandedPadding: "px-5 py-4",
          navCollapsedPadding: "px-2 py-4",
          sectionLabel:
            "text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-3 mt-6 px-3 dark:text-slate-400",
          divider: "border-gray-200 dark:border-slate-800",
          itemPy: "py-2.5",
          activeItem:
            "bg-indigo-50 text-indigo-700 font-semibold rounded-xl shadow-sm ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20",
          inactiveItem:
            "text-slate-600 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200",
          activeIconOverride: "text-indigo-600 dark:text-indigo-400",
          footerBorder: "border-t border-gray-200 dark:border-slate-800",
          footerExpandedPadding: "p-4",
          footerCollapsedPadding: "p-3",
          logoutExpandedBtn:
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400",
          logoutCollapsedBtn:
            "flex items-center justify-center rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400",
          logoutIcon: "",
          logoutLabel: t("common.logout"),
        }}
      />

      <div className="relative z-0 flex flex-1 flex-col overflow-x-hidden">
        <AdminHeader
          title={currentTitle}
          category={currentCategory}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <AdminGradingTabProvider openGradingTab={() => {}}>
            <Routes>
              <Route path="/" element={<DashboardOverviewPage />} />
              <Route path="account" element={<AdminAccountPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="mentors" element={<MentorManagementPage />} />
              <Route path="sessions" element={<SessionManagementPage />} />
              <Route path="sessions/create" element={<SessionFormPage />} />
              <Route path="sessions/:id" element={<SessionFormPage />} />
              <Route path="reviews" element={<ReviewManagementPage />} />
              <Route path="feedback" element={<FeedbackManagementPage />} />
              <Route path="notifications" element={<NotificationManagementPage />} />
              <Route path="questionBanks" element={<QuestionBankManagementPage />} />
              <Route path="questionMajors" element={<QuestionMajorManagementPage />} />
              <Route path="practiceSets" element={<PracticeSetManagementPage />} />
              <Route path="practiceQuestions" element={<PracticeQuestionManagementPage />} />
              <Route path="posts" element={<PostManagementPage />} />
              <Route path="companies" element={<CompanyManagementPage />} />
              <Route path="companies/:companyId" element={<CompanyManagementPage />} />
              <Route path="interviewTemplates" element={<InterviewTemplateManagementPage />} />
              <Route path="interviewTemplates/:id" element={<InterviewTemplateDetailPage />} />
              <Route
                path="applicationGrading"
                element={
                  <ApplicationGradingPage
                    onOpenGradingDetail={(appId, extra) =>
                      navigate(
                        `/admin/grading-detail?appId=${appId}${
                          extra?.candidateName
                            ? `&name=${encodeURIComponent(extra.candidateName)}`
                            : ""
                        }${extra?.jdId ? `&jdId=${encodeURIComponent(extra.jdId)}` : ""}`
                      )
                    }
                  />
                }
              />
              <Route path="mentor-review-assignment" element={<MentorReviewAssignmentPage />} />
              <Route
                path="grading-detail"
                element={
                  <ApplicationGradingDetailPage
                    appId={new URLSearchParams(location.search).get("appId") || ""}
                    candidateName={new URLSearchParams(location.search).get("name") || undefined}
                    jdId={new URLSearchParams(location.search).get("jdId") || undefined}
                  />
                }
              />
              <Route path="kiosk-bookings" element={<KioskBookingManagementPage />} />
              <Route path="kiosk-management" element={<KioskManagementPage />} />
              <Route path="kiosk-management/:kioskId/schedules" element={<KioskSchedulePage />} />
              <Route path="codeReviewProblems" element={<CodeReviewProblemManagementPage />} />
              <Route path="codingProblems" element={<CodingProblemManagementPage />} />
            </Routes>
          </AdminGradingTabProvider>
        </main>
      </div>
    </div>
  );
}
