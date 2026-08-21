import icon2 from "@/assets/icon2.svg";
import {
  DashboardSidebar,
  getInitialSidebarCollapsed,
  type SidebarMenuGroup,
} from "@/components/shared";
import { useSettingsStore } from "@/stores/settingsStore";
import type { TFunction } from "i18next";
import {
  Bell,
  Building2,
  CalendarDays,
  Code2,
  Database,
  FileCheck2,
  FileInput,
  LayoutDashboard,
  LayoutTemplate,
  Newspaper,
  Star,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { MentorReviewAssignmentPage } from "@/pages/Admin/MentorReviewAssignment";
import { AdminAccountPage } from "../Account/AdminAccountPage";
import { AdminApplicationDetailPage } from "../ApplicationManagement/AdminApplicationDetailPage";
import { AdminApplicationManagementPage } from "../ApplicationManagement/AdminApplicationManagementPage";
import { CodeReviewProblemManagementPage } from "../CodeReviewProblemManagement";
import { CodingProblemManagementPage } from "../CodingProblemManagement";
import { CompanyManagementPage } from "../CompanyManagement";
import { DashboardOverviewPage } from "../DashboardOverview";
import { FeedbackManagementPage } from "../FeedbackManagement";
import { InterviewTemplateDetailPage } from "../InterviewTemplateManagement/InterviewTemplateDetailPage";
import { InterviewTemplateManagementPage } from "../InterviewTemplateManagement/InterviewTemplateManagementPage";
import { KioskDetailPage, KioskManagementPage } from "../KioskManagement";
import { MentorManagementPage } from "../MentorManagement";
import { NotificationManagementPage } from "../NotificationManagement";
import { PostManagementPage } from "../PostManagement";
import { PracticeQuestionManagementPage } from "../PracticeQuestionManagement";
import { PracticeSetManagementPage } from "../PracticeSetManagement";
import { QuestionBankManagementPage } from "../QuestionBankManagement";
import { QuestionMajorManagementPage } from "../QuestionMajorManagement";
import { ReviewManagementPage } from "../ReviewManagement";
import { SessionFormPage, SessionManagementPage } from "../SessionManagement";
import { TopDevJobImportPage } from "../TopDevJobImport";
import { UserManagementPage } from "../UserManagement";
import { AdminHeader } from "./components/AdminHeader";

// Local helper accepts the i18next TFunction. The full TFunction type has many
// overloads (with/without default value, with/without options, key arrays, etc.)
// so we expose only the parts the sidebar actually uses.
type TranslateFn = TFunction;
const getSidebarMenuGroups = (t: TranslateFn): SidebarMenuGroup[] => [
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
        type: "kiosk-management",
        icon: CalendarDays,
        label: t("adminKioskManagement.title"),
        color: "text-pink-600 dark:text-pink-500",
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
        type: "applications",
        icon: FileCheck2,
        label: t("adminApplicationManagement.title"),
        color: "text-indigo-600 dark:text-indigo-500",
      },
      {
        type: "topdev-job-import",
        icon: FileInput,
        label: t("adminTopDevImport.sidebarLabel", "Import JD"),
        color: "text-emerald-600 dark:text-emerald-500",
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
        label: t("common.reviewAndFeedback", "Đánh giá & Phản hồi"),
        color: "text-yellow-600 dark:text-yellow-500",
      },
      {
        type: "mentor-review-assignment",
        icon: UserCheck,
        label: t("adminMentorReviewAssignment.sidebarLabel"),
        color: "text-blue-600 dark:text-blue-500",
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

  const [searchParams] = useSearchParams();
  // Find current title and category for header
  const { currentTitle, currentCategory, parentTitle } = useMemo(() => {
    for (const group of sidebarMenuGroups) {
      for (const item of group.items) {
        if (item.type === activeTab) {
          if (pathParts.length > 2) {
            if (activeTab === "users") {
              return {
                currentTitle: t("adminUsermanagement.userDetail", "Chi tiết người dùng"),
                currentCategory: group.label,
                parentTitle: item.label,
              };
            }
            if (activeTab === "mentors") {
              return {
                currentTitle: t("adminMentormanagement.mentorDetail", "Chi tiết Mentor"),
                currentCategory: group.label,
                parentTitle: item.label,
              };
            }
            if (activeTab === "kiosk-management") {
              return {
                currentTitle: t("adminKioskManagement.kioskDetail", "Chi tiết Kiosk"),
                currentCategory: group.label,
                parentTitle: item.label,
              };
            }
            if (activeTab === "interviewTemplates") {
              return {
                currentTitle: t("adminInterviewTemplate.templateDetail", "Chi tiết kịch bản"),
                currentCategory: group.label,
                parentTitle: item.label,
              };
            }
            if (activeTab === "reviews") {
              return {
                currentTitle: t("adminReviewmanagement.reviewDetail", "Chi tiết đánh giá"),
                currentCategory: group.label,
                parentTitle: item.label,
              };
            }
          }
          // companies: detect drill-down via query params
          if (activeTab === "companies") {
            const companyId = searchParams.get("companyId");
            const jdId = searchParams.get("jdId");
            if (jdId) {
              return {
                currentTitle: t("adminCompanymanagement.jdDetail", "Chi tiết JD"),
                currentCategory: group.label,
                parentTitle: item.label,
              };
            }
            if (companyId) {
              return {
                currentTitle: t("adminCompanymanagement.companyDetail", "Chi tiết công ty"),
                currentCategory: group.label,
                parentTitle: item.label,
              };
            }
          }
          return { currentTitle: item.label, currentCategory: group.label, parentTitle: undefined };
        }
        if (item.children) {
          const child = item.children.find((c) => c.type === activeTab);
          if (child) {
            return {
              currentTitle: child.label,
              currentCategory: group.label,
              parentTitle: item.label,
            };
          }
        }
      }
    }
    return {
      currentTitle: t("common.dashboard"),
      currentCategory: undefined,
      parentTitle: undefined,
    };
  }, [activeTab, pathParts, sidebarMenuGroups, t]);

  const ADMIN_SIDEBAR_LOGO = useMemo(
    () => (
      <a href="/" className="flex items-center gap-2.5">
        <img src={icon2} alt="INBLUE AI" className="h-8 w-8 shrink-0 object-contain" />
        <span className="text-lg font-bold tracking-wide text-[#002654] dark:text-white">
          INBLUE AI
        </span>
      </a>
    ),
    []
  );

  const ADMIN_SIDEBAR_LOGO_COLLAPSED = useMemo(
    () => (
      <a href="/" className="flex items-center justify-center">
        <img src={icon2} alt="INBLUE AI" className="h-8 w-8 shrink-0 object-contain" />
      </a>
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
        showDesktopToggle
        logo={ADMIN_SIDEBAR_LOGO}
        collapsedLogo={ADMIN_SIDEBAR_LOGO_COLLAPSED}
        showSettings={false}
        theme={{
          wrapper:
            "h-full border-r border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95",
          expandedWidth: "w-64",
          collapsedWidth: "w-[72px]",
          logoBorder: "border-b border-slate-200/80 dark:border-slate-800/80",
          logoExpandedPadding: "h-16 gap-3 px-6",
          logoCollapsedPadding: "h-16 justify-center px-2",
          navWrapper: "flex-1 space-y-1 overflow-y-auto scrollbar-hide",
          navExpandedPadding: "px-4 py-4",
          navCollapsedPadding: "px-2 py-4",
          sectionLabel:
            "text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-2.5 mt-5 px-3 dark:text-slate-500",
          divider: "border-slate-200/80 dark:border-slate-800/80",
          itemPy: "py-2.5",
          activeItem:
            "border border-indigo-200/80 bg-indigo-50/80 font-semibold text-indigo-700 shadow-2xs dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300",
          inactiveItem:
            "border border-transparent text-slate-600 rounded-xl hover:bg-slate-100/80 hover:text-slate-900 transition-all dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200",
          activeIconOverride: "text-indigo-600 dark:text-indigo-400",
          footerBorder: "border-t border-slate-200/80 dark:border-slate-800/80",
          footerExpandedPadding: "p-4",
          footerCollapsedPadding: "p-3",
          logoutExpandedBtn:
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-rose-50/80 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400",
          logoutCollapsedBtn:
            "flex items-center justify-center rounded-xl p-2.5 text-slate-600 transition-all hover:bg-rose-50/80 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400",
          logoutIcon: "",
          logoutLabel: t("common.logout"),
        }}
      />

      <div className="relative z-0 flex flex-1 flex-col overflow-x-hidden">
        <AdminHeader
          title={currentTitle}
          parentTitle={parentTitle}
          category={currentCategory}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<DashboardOverviewPage />} />
            <Route path="account" element={<AdminAccountPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="users/:userId" element={<UserManagementPage />} />
            <Route path="mentors" element={<MentorManagementPage />} />
            <Route path="mentors/:mentorId" element={<MentorManagementPage />} />
            <Route path="sessions" element={<SessionManagementPage />} />
            <Route path="sessions/create" element={<SessionFormPage />} />
            <Route path="sessions/:id" element={<SessionFormPage />} />
            <Route path="reviews" element={<ReviewManagementPage />} />
            <Route path="reviews/:id" element={<ReviewManagementPage />} />
            <Route path="feedback" element={<FeedbackManagementPage />} />
            <Route path="notifications" element={<NotificationManagementPage />} />
            <Route path="questionBanks" element={<QuestionBankManagementPage />} />
            <Route path="questionMajors" element={<QuestionMajorManagementPage />} />
            <Route path="practiceSets" element={<PracticeSetManagementPage />} />
            <Route path="practiceQuestions" element={<PracticeQuestionManagementPage />} />
            <Route path="posts" element={<PostManagementPage />} />
            <Route path="companies" element={<CompanyManagementPage />} />
            <Route path="companies/:companyId" element={<CompanyManagementPage />} />
            <Route path="applications" element={<AdminApplicationManagementPage />} />
            <Route path="topdev-job-import" element={<TopDevJobImportPage />} />
            <Route
              path="applications/:applicationId/details"
              element={<AdminApplicationDetailPage />}
            />
            <Route path="interviewTemplates" element={<InterviewTemplateManagementPage />} />
            <Route path="interviewTemplates/:id" element={<InterviewTemplateDetailPage />} />
            <Route path="mentor-review-assignment" element={<MentorReviewAssignmentPage />} />
            <Route path="kiosk-management" element={<KioskManagementPage />} />
            <Route path="kiosk-management/:kioskId" element={<KioskDetailPage />} />
            <Route path="codeReviewProblems" element={<CodeReviewProblemManagementPage />} />
            <Route path="codingProblems" element={<CodingProblemManagementPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
