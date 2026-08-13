import icon2 from "@/assets/icon2.svg";
import type { SidebarMenuGroup } from "@/components/shared";
import { DashboardSidebar, getInitialSidebarCollapsed } from "@/components/shared";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { useDashboardScrollRestoration } from "@/hooks/useDashboardScrollRestoration";
import { useTabsState } from "@/hooks/useTabsState";
import { getDashboardTabFromPath } from "@/lib/dashboard-breadcrumb";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import type { TFunction } from "i18next";
import {
  Bell,
  Briefcase,
  Building2,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  ReceiptText,
  Search,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { AIInterviewListPage } from "../AIInterview";
import { ApplicationHistoryPage } from "../ApplicationHistory";
import { UserCompaniesTab } from "../Companies/UserCompaniesTab";
import { HomeFeedPage } from "../HomeFeed";
import { JobSearchTab } from "../JobSearch";
import { MentorListPage } from "../MentorList/MentorListPage";
import { MessengerPage } from "../Messenger";
import { UserNotificationsPage } from "../Notifications";
import { OverviewPage } from "../Overview";
import { UserHeader } from "./components/UserHeader";

type TabType =
  | "homeFeed"
  | "jobSearch"
  | "companies"
  | "overview"
  | "mentors"
  | "applicationHistory"
  | "aiInterview"
  | "notifications"
  | "messenger";

const isValidTabType = (value: string): value is TabType => {
  return [
    "homeFeed",
    "jobSearch",
    "companies",
    "overview",
    "mentors",
    "applicationHistory",
    "aiInterview",
    "notifications",
    "messenger",
  ].includes(value as TabType);
};

const getAvailableTabs = (
  t: TFunction
): Array<{
  type: TabType;
  label: string;
}> => [
  {
    type: "homeFeed",
    label: t("common.home"),
  },
  {
    type: "jobSearch",
    label: t("userDashboard.jobSearch", { defaultValue: "Việc làm" }),
  },
  {
    type: "companies",
    label: t("common.companies", { defaultValue: "Công ty" }),
  },
  {
    type: "overview",
    label: t("common.overview"),
  },
  {
    type: "mentors",
    label: t("common.mentors"),
  },
  {
    type: "applicationHistory",
    label: t("common.application"),
  },
  {
    type: "aiInterview",
    label: t("common.aiInterview1"),
  },
  {
    type: "notifications",
    label: t("common.notification"),
  },
  {
    type: "messenger",
    label: t("common.messages"),
  },
];

const getSidebarMenuGroups = (t: TFunction): SidebarMenuGroup[] => [
  {
    label: t("common.home"),
    items: [
      {
        type: "homeFeed",
        icon: Newspaper,
        label: t("common.home"),
        color: "text-orange-600 dark:text-orange-500",
      },
      {
        type: "jobSearch",
        icon: Search,
        label: t("userDashboard.jobSearch", { defaultValue: "Việc làm" }),
        color: "text-[#0047AB] dark:text-[#66B2FF]",
      },
      {
        type: "companies",
        icon: Building2,
        label: t("common.companies", { defaultValue: "Công ty" }),
        color: "text-indigo-600 dark:text-indigo-400",
      },
    ],
  },
  {
    label: t("common.interview"),
    items: [
      {
        type: "overview",
        icon: LayoutDashboard,
        label: t("common.overview"),
        color: "text-blue-600 dark:text-blue-500",
      },
      {
        type: "applicationHistory",
        icon: Briefcase,
        label: t("common.application"),
        color: "text-teal-600 dark:text-teal-500",
      },
    ],
  },
  {
    label: t("common.individual"),
    items: [
      {
        type: "messenger",
        icon: MessageSquare,
        label: t("common.messages"),
        color: "text-cyan-600 dark:text-cyan-500",
      },
      {
        type: "accountCandidateProfile",
        icon: UserRound,
        label: t("common.candidateProfile", "Hồ sơ ứng viên"),
        color: "text-indigo-600 dark:text-indigo-400",
      },
      {
        type: "accountTransactions",
        icon: ReceiptText,
        label: t("userAccount.transactionHistory"),
        color: "text-amber-600 dark:text-amber-400",
      },
      {
        type: "accountNotifications",
        icon: Bell,
        label: t("common.notification", "Thông báo"),
        color: "text-violet-600 dark:text-violet-400",
      },
    ],
  },
];

const DEFAULT_TAB: TabType = "homeFeed";

export function UserDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarBehavior = useSettingsStore((state) => state.sidebarBehavior);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollTarget, setScrollTarget] = useState<HTMLDivElement | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    getInitialSidebarCollapsed(
      "user_dashboard_sidebar_collapsed",
      undefined,
      sidebarBehavior === "auto-collapse"
    )
  );

  const availableTabs = useMemo(() => getAvailableTabs(t), [t]);
  const sidebarMenuGroups = useMemo(() => getSidebarMenuGroups(t), [t]);
  const { activeTab, openTab } = useTabsState({
    storageKey: "user",
    defaultTab: DEFAULT_TAB,
    availableTabs: availableTabs,
  });
  const outlet = useOutlet();
  const routedTab = getDashboardTabFromPath({
    role: "user",
    pathname: location.pathname,
    defaultTab: DEFAULT_TAB,
    t,
  });

  // When on a nested outlet route, derive active tab from the pathname
  const typedActiveTab: TabType = outlet
    ? isValidTabType(routedTab)
      ? routedTab
      : DEFAULT_TAB
    : isValidTabType(activeTab)
      ? activeTab
      : DEFAULT_TAB;

  // Find current title, parent title, and category for header (Admin style with dynamic subtabs & drill-down details)
  const { currentTitle, parentTitle, currentCategory } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);

    const homeGroupLabel = t("common.home", "Trang chủ");
    const individualGroupLabel = t("common.individual", "Cá nhân");

    // 1. Account Subtabs & Change Password (under "Cá nhân")
    if (location.pathname.startsWith("/user/account/change-password")) {
      return {
        currentTitle: t("common.changePassword", "Đổi mật khẩu"),
        parentTitle: t("common.account", "Tài khoản"),
        currentCategory: individualGroupLabel,
      };
    }

    if (location.pathname.startsWith("/user/account")) {
      const subtab = searchParams.get("subtab");
      const accountParent = t("common.account", "Tài khoản");

      if (subtab === "notifications") {
        return {
          currentTitle: t("common.notification", "Thông báo"),
          parentTitle: accountParent,
          currentCategory: individualGroupLabel,
        };
      }
      if (subtab === "jdPurchases") {
        return {
          currentTitle: t("payment.jdPurchaseHistory", "Lịch sử mua gói JD"),
          parentTitle: accountParent,
          currentCategory: individualGroupLabel,
        };
      }
      if (subtab === "editProfile") {
        return {
          currentTitle: t("userAccount.editProfile", "Chỉnh sửa hồ sơ"),
          parentTitle: accountParent,
          currentCategory: individualGroupLabel,
        };
      }
      if (subtab === "settings") {
        return {
          currentTitle: t("userAccount.quickSettings", "Cài đặt"),
          parentTitle: accountParent,
          currentCategory: individualGroupLabel,
        };
      }
      return {
        currentTitle: t("common.candidateProfile", "Hồ sơ ứng viên"),
        parentTitle: accountParent,
        currentCategory: individualGroupLabel,
      };
    }

    if (location.pathname.startsWith("/user/settings")) {
      return {
        currentTitle: t("common.settings", "Cài đặt"),
        parentTitle: t("common.account", "Tài khoản"),
        currentCategory: individualGroupLabel,
      };
    }

    // 2. Mock Interview Session History (under "Interview")
    if (location.pathname.startsWith("/user/mock-interview/history")) {
      return {
        currentTitle: t("common.interviewSession"),
        parentTitle: t("common.mockInterview"),
        currentCategory: t("common.interview"),
      };
    }

    // 3. AI Interview Session Routes (under "Interview")
    if (location.pathname.startsWith("/user/ai-interview/session")) {
      return {
        currentTitle: t("common.interviewSession"),
        parentTitle: t("common.aiInterview1"),
        currentCategory: t("common.interview"),
      };
    }

    // 3. Tab-based Drill Down Details (Company Detail & Job Detail under "Trang chủ")
    if (typedActiveTab === "companies" && searchParams.get("companyId")) {
      return {
        currentTitle: t("common.companyDetails", "Chi tiết công ty"),
        parentTitle: t("common.companies", "Công ty"),
        currentCategory: homeGroupLabel,
      };
    }

    if (typedActiveTab === "jobSearch" && searchParams.get("jobId")) {
      return {
        currentTitle: t("common.jobDetails", "Chi tiết việc làm"),
        parentTitle: t("userDashboard.jobSearch", "Việc làm"),
        currentCategory: homeGroupLabel,
      };
    }

    // 4. Default Sidebar Tabs
    for (const group of sidebarMenuGroups) {
      for (const item of group.items) {
        if (item.type === typedActiveTab) {
          return {
            currentTitle: item.label,
            parentTitle: undefined,
            currentCategory: group.label,
          };
        }
      }
    }
    return {
      currentTitle: t("common.overview", "Tổng quan"),
      parentTitle: undefined,
      currentCategory: homeGroupLabel,
    };
  }, [typedActiveTab, sidebarMenuGroups, t, location.pathname, location.search]);

  const USER_SIDEBAR_LOGO = useMemo(
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

  const USER_SIDEBAR_LOGO_COLLAPSED = useMemo(
    () => (
      <a href="/" className="flex items-center justify-center">
        <img src={icon2} alt="INBLUE AI" className="h-8 w-8 shrink-0 object-contain" />
      </a>
    ),
    []
  );

  const shouldHideScrollButton =
    location.pathname.startsWith("/user/ai-interview/session") ||
    location.pathname.startsWith("/user/mock-interview/room/");

  const handleContentRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    setScrollTarget(node);
  }, []);

  useDashboardScrollRestoration(contentRef, {
    enabled: typedActiveTab !== "messenger",
  });

  useEffect(() => {
    setIsSidebarCollapsed(sidebarBehavior === "auto-collapse");
  }, [sidebarBehavior]);

  // When on a nested route (outlet), navigate back to the dashboard base with the tab param
  const handleNavigate = useCallback(
    (type: string) => {
      const accountSubtabs: Record<string, string> = {
        accountCandidateProfile: "candidateProfile",
        accountTransactions: "jdPurchases",
        accountNotifications: "notifications",
      };
      const accountSubtab = accountSubtabs[type];
      if (accountSubtab) {
        navigate(`/user/account?subtab=${accountSubtab}`);
        return;
      }
      if (outlet) {
        navigate(`/user?tab=${type}`);
      } else {
        openTab(type);
      }
    },
    [outlet, openTab, navigate]
  );

  const sidebarActiveTab = location.pathname.startsWith("/user/account")
    ? {
        candidateProfile: "accountCandidateProfile",
        notifications: "accountNotifications",
        jdPurchases: "accountTransactions",
      }[new URLSearchParams(location.search).get("subtab") || "candidateProfile"] ||
      "accountCandidateProfile"
    : typedActiveTab;

  const renderContent = () => {
    switch (typedActiveTab) {
      case "homeFeed":
        return <HomeFeedPage />;
      case "jobSearch":
        return <JobSearchTab />;
      case "companies":
        return <UserCompaniesTab />;
      case "overview":
        return <OverviewPage />;
      case "mentors":
        return <MentorListPage />;
      case "applicationHistory":
        return <ApplicationHistoryPage />;
      case "aiInterview":
        return <AIInterviewListPage />;
      case "notifications":
        return <UserNotificationsPage />;
      case "messenger":
        return <MessengerPage />;
      default:
        return <div>{t("common.invalidTabType")}</div>;
    }
  };

  return (
    <div className="isolate flex h-screen bg-gray-50 dark:bg-slate-950">
      <DashboardSidebar
        menuGroups={sidebarMenuGroups}
        activeTab={sidebarActiveTab}
        onNavigate={handleNavigate}
        onProfileClick={() => navigate("/user/account")}
        storageKey="user_dashboard_sidebar_collapsed"
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
        logo={USER_SIDEBAR_LOGO}
        collapsedLogo={USER_SIDEBAR_LOGO_COLLAPSED}
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
        <UserHeader
          title={currentTitle}
          parentTitle={parentTitle}
          category={currentCategory}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <div
          ref={handleContentRef}
          className={cn(
            "flex-1 overflow-hidden",
            // Home feed detail page is its own two-column layout that must
            // fill the content area edge-to-edge with no padding and no
            // page-level scroll. h-full inside the page depends on this.
            location.pathname.startsWith("/user/home-feed/")
              ? "overflow-hidden p-0"
              : typedActiveTab === "overview"
                ? "overflow-auto"
                : typedActiveTab === "messenger" ||
                    typedActiveTab === "mentors" ||
                    typedActiveTab === "jobSearch" ||
                    typedActiveTab === "companies" ||
                    typedActiveTab === "applicationHistory" ||
                    typedActiveTab === "aiInterview" ||
                    location.pathname.startsWith("/user/application")
                  ? "overflow-auto p-0"
                  : location.pathname.startsWith("/user/account") ||
                      location.pathname.startsWith("/user/settings")
                    ? "overflow-auto p-0"
                    : "overflow-auto p-4 md:p-6 lg:p-8"
          )}>
          {outlet ?? renderContent()}
        </div>
        <ScrollToTopButton target={scrollTarget} threshold={600} hidden={shouldHideScrollButton} />
      </div>
    </div>
  );
}
