import icon2 from "@/assets/icon2.svg";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationBell } from "@/components/notification";
import type { SidebarMenuGroup } from "@/components/shared";
import {
  DashboardBreadcrumb,
  DashboardSidebar,
  DashboardSidebarToggle,
  getInitialSidebarCollapsed,
  SettingsModal,
} from "@/components/shared";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { useDashboardBreadcrumb } from "@/hooks/useDashboardBreadcrumb";
import { useDashboardScrollRestoration } from "@/hooks/useDashboardScrollRestoration";
import { useTabsState } from "@/hooks/useTabsState";
import { getDashboardTabFromPath } from "@/lib/dashboard-breadcrumb";
import { cn } from "@/lib/utils";
import { mentorManager } from "@/services/mentor.manager";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Calendar, LayoutDashboard, MessageSquare, Newspaper, Star, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { MentorAccountPage } from "../Account";
import { GivenFeedbackListPage } from "../Feedback";
import { MentorHomeFeedPage } from "../HomeFeed";
import { MentorKioskEntryPage } from "../MentorKioskEntryPage";
import { MessengerPage } from "../Messenger";
import { MentorNotificationsPage } from "../Notifications";
import { MentorOverviewPage } from "../Overview";
import { MentorReviewsPage } from "../Reviews";
import { MentorSessionsPage } from "../Sessions";
import { StudentsListPage } from "../Students";
type TabType =
  | "homeFeed"
  | "overview"
  | "sessions"
  | "students"
  | "reviews"
  | "feedback"
  | "kioskEntry"
  | "notifications"
  | "messenger"
  | "account";

const VALID_TAB_TYPES: TabType[] = [
  "homeFeed",
  "overview",
  "sessions",
  "students",
  "reviews",
  "feedback",
  "kioskEntry",
  "notifications",
  "messenger",
  "account",
];

const isValidTabType = (value: string): value is TabType => {
  return VALID_TAB_TYPES.includes(value as TabType);
};
const getAvailableTabs = (
  _t: (_key: string) => string
): Array<{
  type: TabType;
  label: string;
}> => [
  {
    type: "homeFeed",
    label: _t("common.home"),
  },
  {
    type: "overview",
    label: _t("common.overview"),
  },
  {
    type: "sessions",
    label: _t("common.interviewSession"),
  },
  {
    type: "students",
    label: _t("common.students"),
  },
  {
    type: "reviews",
    label: _t("mentorMentordashboard.reviewSent"),
  },
  {
    type: "feedback",
    label: _t("common.responseReceived"),
  },
  {
    type: "kioskEntry",
    label: _t("common.joinInterview"),
  },
  {
    type: "notifications",
    label: _t("common.notification"),
  },
  {
    type: "messenger",
    label: _t("common.messages"),
  },
  {
    type: "account",
    label: _t("common.account"),
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
        color: "text-orange-600",
      },
    ],
  },
  {
    label: t("common.profession"),
    items: [
      {
        type: "overview",
        icon: LayoutDashboard,
        label: t("common.overview"),
        color: "text-emerald-600",
      },
      {
        type: "sessions",
        icon: Calendar,
        label: t("common.interviewSession"),
        color: "text-blue-600",
      },
      {
        type: "students",
        icon: Users,
        label: t("common.students"),
        color: "text-purple-600",
      },
      {
        type: "reviews",
        icon: Star,
        label: t("mentorMentordashboard.reviewSent"),
        color: "text-yellow-600",
      },
      {
        type: "feedback",
        icon: MessageSquare,
        label: t("common.responseReceived"),
        color: "text-cyan-600",
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
        color: "text-emerald-500",
      },
    ],
  },
];
const MENTOR_SIDEBAR_LOGO_COLLAPSED = (
  <img src={icon2} alt="INBLUE AI" className="h-9 w-9 shrink-0" />
);
const DEFAULT_TAB: TabType = "overview";
export function MentorDashboardPage() {
  const { t } = useTranslation();
  const MENTOR_SIDEBAR_LOGO = useMemo(
    () => (
      <>
        <img src={icon2} alt="INBLUE AI" className="h-9 w-9 shrink-0" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-emerald-700 dark:text-white">INBLUE AI</span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {t("mentorMentordashboard.mentorGate")}
          </span>
        </div>
      </>
    ),
    [t]
  );
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarBehavior = useSettingsStore((state) => state.sidebarBehavior);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollTarget, setScrollTarget] = useState<HTMLDivElement | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    getInitialSidebarCollapsed(
      "mentor_dashboard_sidebar_collapsed",
      undefined,
      sidebarBehavior === "auto-collapse"
    )
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const availableTabs = useMemo(() => getAvailableTabs(t), [t]);
  const sidebarMenuGroups = useMemo(() => getSidebarMenuGroups(t), [t]);
  const { activeTab, openTab } = useTabsState({
    storageKey: "mentor",
    defaultTab: DEFAULT_TAB,
    availableTabs: availableTabs,
  });
  const outlet = useOutlet();
  const routedTab = getDashboardTabFromPath({
    role: "mentor",
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
  const { items: breadcrumbItems } = useDashboardBreadcrumb({
    role: "mentor",
    pathname: location.pathname,
    activeTab: typedActiveTab,
    availableTabs: availableTabs,
  });
  const shouldHideScrollButton = location.pathname.startsWith("/mentor/sessions/room/");
  const handleContentRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    setScrollTarget(node);
  }, []);
  useDashboardScrollRestoration(contentRef, {
    enabled: typedActiveTab !== "messenger",
  });
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Sync authStore user state with actual mentor profile
  useEffect(() => {
    if (!authUser?.id || authUser.role !== "MENTOR") return;
    mentorManager.getById(authUser.id).then((res) => {
      if (res.success && res.data) {
        const m = res.data;
        if (
          m.name &&
          (m.name !== authUser.name ||
            (m.email && m.email !== authUser.email) ||
            m.avatarUrl !== authUser.avatarUrl)
        ) {
          setUser({
            ...authUser,
            name: m.name,
            email: m.email || authUser.email,
            avatarUrl: m.avatarUrl || authUser.avatarUrl,
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, authUser?.role, authUser?.name, authUser?.email, authUser?.avatarUrl, setUser]);

  useEffect(() => {
    setIsSidebarCollapsed(sidebarBehavior === "auto-collapse");
  }, [sidebarBehavior]);

  // When on a nested route (outlet), navigate back to the dashboard base with the tab param
  const handleNavigate = useCallback(
    (type: string) => {
      if (outlet) {
        navigate(`/mentor?tab=${type}`);
      } else {
        openTab(type);
      }
    },
    [outlet, openTab, navigate]
  );
  const renderContent = () => {
    switch (typedActiveTab) {
      case "homeFeed":
        return <MentorHomeFeedPage />;
      case "overview":
        return <MentorOverviewPage />;
      case "sessions":
        return <MentorSessionsPage />;
      case "students":
        return <StudentsListPage />;
      case "reviews":
        return <MentorReviewsPage />;
      case "feedback":
        return <GivenFeedbackListPage />;
      case "kioskEntry":
        return <MentorKioskEntryPage />;
      case "notifications":
        return <MentorNotificationsPage />;
      case "messenger":
        return <MessengerPage />;
      case "account":
        return <MentorAccountPage />;
      default:
        return <div>{t("common.invalidTabType")}</div>;
    }
  };
  return (
    <div className="isolate flex h-screen bg-white dark:bg-slate-950">
      <DashboardSidebar
        menuGroups={sidebarMenuGroups}
        activeTab={typedActiveTab}
        onNavigate={handleNavigate}
        onProfileClick={() => handleNavigate("account")}
        storageKey="mentor_dashboard_sidebar_collapsed"
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
        showDesktopToggle={false}
        logo={MENTOR_SIDEBAR_LOGO}
        collapsedLogo={MENTOR_SIDEBAR_LOGO_COLLAPSED}
        showSettings
        settingsLabel={t("common.setting")}
        onSettingsClick={() => setIsSettingsOpen(true)}
        theme={{
          wrapper:
            "h-full border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
          expandedWidth: "w-64",
          collapsedWidth: "w-[72px]",
          logoBorder: "border-b border-slate-200 dark:border-slate-800",
          logoExpandedPadding: "h-16 gap-3 px-8",
          logoCollapsedPadding: "h-16 justify-center px-2",
          navWrapper: "flex-1 space-y-1 overflow-y-auto scrollbar-hide",
          navExpandedPadding: "px-5 py-4",
          navCollapsedPadding: "px-2 py-4",
          sectionLabel:
            "text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-3 mt-6 px-3 dark:text-slate-400",
          divider: "border-slate-200 dark:border-slate-800",
          itemPy: "py-2.5",
          activeItem:
            "bg-indigo-50 text-indigo-700 font-semibold rounded-xl shadow-sm ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20",
          inactiveItem:
            "text-slate-600 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200",
          activeIconOverride: "text-indigo-600 dark:text-indigo-400",
          footerBorder: "border-t border-slate-200 dark:border-slate-800",
          footerExpandedPadding: "p-4",
          footerCollapsedPadding: "p-3",
          logoutExpandedBtn:
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400",
          logoutCollapsedBtn:
            "flex items-center justify-center rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400",
          logoutIcon: "",
          logoutLabel: t("common.logout"),
        }}
      />

      <div className="relative z-0 flex flex-1 flex-col overflow-hidden">
        <div className="relative z-60 flex h-14 items-center justify-between border-b border-slate-200 bg-white pr-4 pl-16 md:px-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="hidden shrink-0 pr-2 md:flex">
            <DashboardSidebarToggle
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
            />
          </div>
          <DashboardBreadcrumb items={breadcrumbItems} className="min-w-0 flex-1" />
          <div className="flex shrink-0 items-center gap-3 pl-3">
            <LanguageToggle />
            <NotificationBell notificationsPath="/mentor?tab=notifications" />
          </div>
        </div>
        <div
          ref={handleContentRef}
          className={cn(
            "flex-1 overflow-hidden",
            typedActiveTab === "messenger" ? "p-0" : "overflow-auto p-6"
          )}>
          {outlet ?? renderContent()}
        </div>
        <ScrollToTopButton target={scrollTarget} threshold={600} hidden={shouldHideScrollButton} />
      </div>

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
