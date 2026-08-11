import icon2 from "@/assets/icon2.svg";
import type { SidebarMenuGroup } from "@/components/shared";
import { DashboardSidebar, getInitialSidebarCollapsed } from "@/components/shared";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
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
import { MentorHeader } from "./components/MentorHeader";
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
  <a href="/" className="flex items-center justify-center">
    <img src={icon2} alt="INBLUE AI" className="h-8 w-8 shrink-0 object-contain" />
  </a>
);
const DEFAULT_TAB: TabType = "overview";
export function MentorDashboardPage() {
  const { t } = useTranslation();
  const MENTOR_SIDEBAR_LOGO = useMemo(
    () => (
      <a href="/" className="flex items-center gap-2.5">
        <img src={icon2} alt="INBLUE AI" className="h-8 w-8 shrink-0 object-contain" />
        <span className="text-lg font-bold tracking-wide text-[#002654] dark:text-white">
          INBLUE AI
        </span>
      </a>
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
  // Find current title and category for header (Candidate style)
  const { currentTitle, currentCategory, parentTitle } = useMemo(() => {
    if (location.pathname.startsWith("/mentor/account")) {
      return {
        currentTitle: t("common.account"),
        currentCategory: t("common.overview"),
        parentTitle: undefined,
      };
    }
    for (const group of sidebarMenuGroups) {
      for (const item of group.items) {
        if (item.type === typedActiveTab) {
          return {
            currentTitle: item.label,
            currentCategory: group.label,
            parentTitle: undefined,
          };
        }
        if (item.children) {
          const child = item.children.find((c) => c.type === typedActiveTab);
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
      currentTitle: t("common.overview"),
      currentCategory: undefined,
      parentTitle: undefined,
    };
  }, [typedActiveTab, sidebarMenuGroups, t, location.pathname]);

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
    <div className="isolate flex h-screen bg-slate-50 dark:bg-slate-950">
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
        <MentorHeader
          title={currentTitle}
          parentTitle={parentTitle}
          category={currentCategory}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <div
          ref={handleContentRef}
          className={cn(
            "flex-1 overflow-hidden",
            typedActiveTab === "messenger" ? "p-0" : "overflow-auto p-4 md:p-6 lg:p-8"
          )}>
          {outlet ?? renderContent()}
        </div>
        <ScrollToTopButton target={scrollTarget} threshold={600} hidden={shouldHideScrollButton} />
      </div>
    </div>
  );
}
