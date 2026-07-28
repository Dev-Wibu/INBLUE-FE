import icon2 from "@/assets/icon2.svg";
import type { SidebarMenuGroup } from "@/components/shared";
import { DashboardSidebar, getInitialSidebarCollapsed } from "@/components/shared";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { useDashboardScrollRestoration } from "@/hooks/useDashboardScrollRestoration";
import { useTabsState } from "@/hooks/useTabsState";
import { getDashboardTabFromPath } from "@/lib/dashboard-breadcrumb";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  Bot,
  Briefcase,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  User as UserIcon,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { AIInterviewListPage } from "../AIInterview";
import { ApplicationHistoryPage } from "../ApplicationHistory";
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
    "overview",
    "mentors",
    "applicationHistory",
    "aiInterview",
    "notifications",
    "messenger",
  ].includes(value as TabType);
};

const getAvailableTabs = (
  t: (_key: string) => string
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
    label: t("enterpriseJobsearchpage.searchButton"),
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

const getSidebarMenuGroups = (t: (_key: string) => string): SidebarMenuGroup[] => [
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
        label: t("enterpriseJobsearchpage.searchButton"),
        color: "text-[#0047AB] dark:text-[#66B2FF]",
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
      {
        type: "mentors",
        icon: UserIcon,
        label: t("common.mentors"),
        color: "text-indigo-600 dark:text-indigo-500",
      },
    ],
  },
  {
    label: t("common.aiLearning"),
    items: [
      {
        type: "aiInterview",
        icon: Bot,
        label: t("common.aiInterview1"),
        color: "text-green-600 dark:text-green-500",
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

  // Find current title and category for header (Admin style)
  const { currentTitle, currentCategory } = useMemo(() => {
    // Pathname-specific overrides for outlet routes that aren't in sidebar
    if (location.pathname.startsWith("/user/account/change-password")) {
      return { currentTitle: t("common.changePassword"), currentCategory: t("common.account") };
    }
    if (location.pathname.startsWith("/user/account")) {
      return { currentTitle: t("common.account"), currentCategory: t("common.overview") };
    }
    if (location.pathname.startsWith("/user/settings")) {
      return { currentTitle: t("common.settings"), currentCategory: t("common.account") };
    }
    for (const group of sidebarMenuGroups) {
      for (const item of group.items) {
        if (item.type === typedActiveTab) {
          return { currentTitle: item.label, currentCategory: group.label };
        }
      }
    }
    return { currentTitle: t("common.overview"), currentCategory: undefined };
  }, [typedActiveTab, sidebarMenuGroups, t, location.pathname]);

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
      if (outlet) {
        navigate(`/user?tab=${type}`);
      } else {
        openTab(type);
      }
    },
    [outlet, openTab, navigate]
  );

  const renderContent = () => {
    switch (typedActiveTab) {
      case "homeFeed":
        return <HomeFeedPage />;
      case "jobSearch":
        return <JobSearchTab />;
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
        activeTab={typedActiveTab}
        onNavigate={handleNavigate}
        onProfileClick={() => navigate("/user/account")}
        storageKey="user_dashboard_sidebar_collapsed"
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
        showDesktopToggle={false}
        logo={USER_SIDEBAR_LOGO}
        collapsedLogo={USER_SIDEBAR_LOGO_COLLAPSED}
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
        <UserHeader
          title={currentTitle}
          category={currentCategory}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <div
          ref={handleContentRef}
          className={cn(
            "flex-1 overflow-hidden",
            typedActiveTab === "messenger" || typedActiveTab === "mentors"
              ? "p-0"
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
