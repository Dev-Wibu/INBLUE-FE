import icon2 from "@/assets/icon2.svg";
import type { SidebarMenuGroup } from "@/components/shared";
import { DashboardSidebar, getInitialSidebarCollapsed } from "@/components/shared";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { useTabsState } from "@/hooks/useTabsState";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { ClipboardCheck, Home, LayoutDashboard } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ApplicationGradingPage } from "../../Admin/ApplicationGrading/ApplicationGradingPage";
import { StaffAccountPage } from "../Account/StaffAccountPage";
import { staffGradingWorkspacePage as StaffGradingWorkspacePage } from "../GradingWorkspace";
import { StaffHomeFeedPage } from "../HomeFeed/StaffHomeFeedPage";
import { StaffOverviewPage } from "./StaffOverviewPage";
import { StaffHeader } from "./components/StaffHeader";

type TabType = "home" | "dashboard" | "applicationGrading" | "grading-detail" | "account";

const VALID_TAB_TYPES: TabType[] = [
  "home",
  "dashboard",
  "applicationGrading",
  "grading-detail",
  "account",
];

const isValidTabType = (value: string): value is TabType => {
  return VALID_TAB_TYPES.includes(value as TabType);
};

const getAvailableTabs = (t: (key: string) => string): Array<{ type: TabType; label: string }> => [
  {
    type: "home",
    label: t("common.home"),
  },
  {
    type: "dashboard",
    label: t("common.dashboard"),
  },
  {
    type: "applicationGrading",
    label: t("adminApplicationGrading.applicationGrading"),
  },
  {
    type: "account",
    label: t("common.account"),
  },
];

const getSidebarMenuGroups = (t: (key: string) => string): SidebarMenuGroup[] => [
  {
    label: t("common.home"),
    items: [
      {
        type: "home",
        icon: Home,
        label: t("common.home"),
        color: "text-indigo-600 dark:text-indigo-400",
      },
    ],
  },
  {
    label: t("common.overview"),
    items: [
      {
        type: "dashboard",
        icon: LayoutDashboard,
        label: t("common.dashboard"),
        color: "text-indigo-600 dark:text-indigo-400",
      },
    ],
  },
  {
    label: t("common.work"),
    items: [
      {
        type: "applicationGrading",
        icon: ClipboardCheck,
        label: t("adminApplicationGrading.applicationGrading"),
        color: "text-indigo-600 dark:text-indigo-400",
        description: t("adminApplicationGrading.gradeApplications"),
      },
    ],
  },
];

export function StaffDashboardPage() {
  const { t } = useTranslation();
  const STAFF_SIDEBAR_LOGO = useMemo(
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
  const STAFF_SIDEBAR_LOGO_COLLAPSED = useMemo(
    () => (
      <a href="/" className="flex items-center justify-center">
        <img src={icon2} alt="INBLUE AI" className="h-8 w-8 shrink-0 object-contain" />
      </a>
    ),
    []
  );
  const sidebarBehavior = useSettingsStore((state) => state.sidebarBehavior);
  const availableTabs = useMemo(() => getAvailableTabs(t), [t]);
  const sidebarMenuGroups = useMemo(() => getSidebarMenuGroups(t), [t]);
  const { activeTab, setActiveTab, openGradingTab } = useTabsState({
    storageKey: "staff",
    defaultTab: "home",
    availableTabs: availableTabs,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollTarget] = useState<HTMLDivElement | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    getInitialSidebarCollapsed(
      "staff_sidebar_collapsed",
      undefined,
      sidebarBehavior === "auto-collapse"
    )
  );
  const typedActiveTab: TabType = isValidTabType(activeTab) ? activeTab : "home";

  // ── Reset to home when sidebar collapses (mirrors Candidate behavior) ──
  useEffect(() => {
    setIsSidebarCollapsed(sidebarBehavior === "auto-collapse");
  }, [sidebarBehavior]);

  // ── Find current title / category / parent for header (Candidate style) ──
  const { currentTitle, currentCategory, parentTitle } = useMemo(() => {
    for (const group of sidebarMenuGroups) {
      for (const item of group.items) {
        if (item.type === typedActiveTab) {
          return {
            currentTitle: item.label,
            currentCategory: group.label,
            parentTitle: undefined as string | undefined,
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
      currentTitle: t("common.home"),
      currentCategory: undefined as string | undefined,
      parentTitle: undefined as string | undefined,
    };
  }, [typedActiveTab, sidebarMenuGroups, t]);

  const navigateToTab = useCallback(
    (tabType: string) => {
      // Prevent opening grading-detail tab without detailId or appId (would show blank page)
      if (
        tabType === "grading-detail" &&
        !searchParams.get("detailId") &&
        !searchParams.get("appId")
      ) {
        toast.error(t("application.selectFromList"));
        navigate("/staff?tab=applicationGrading", { replace: true });
        return;
      }
      setActiveTab(tabType, true);
      navigate(`/staff?tab=${tabType}`, { replace: true });
    },
    [navigate, setActiveTab, searchParams, t]
  );

  const handleSidebarNavigate = useCallback(
    (type: string) => {
      navigateToTab(type);
    },
    [navigateToTab]
  );

  const renderTabContent = (tabType: string) => {
    switch (tabType) {
      case "home":
        return <StaffHomeFeedPage />;
      case "dashboard":
        return <StaffOverviewPage />;
      case "applicationGrading":
        return <ApplicationGradingPage onOpenGradingDetail={openGradingTab} basePath="/staff" />;
      case "grading-detail": {
        return <StaffGradingWorkspacePage />;
      }
      case "account":
        return <StaffAccountPage />;
      default:
        return <StaffHomeFeedPage />;
    }
  };

  const handleContentRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
  }, []);

  return (
    <div className="isolate flex h-screen bg-slate-50 dark:bg-slate-950">
      <DashboardSidebar
        menuGroups={sidebarMenuGroups}
        activeTab={typedActiveTab}
        onNavigate={handleSidebarNavigate}
        onProfileClick={() => handleSidebarNavigate("account")}
        storageKey="staff_sidebar_collapsed"
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
        showDesktopToggle
        logo={STAFF_SIDEBAR_LOGO}
        collapsedLogo={STAFF_SIDEBAR_LOGO_COLLAPSED}
        showSettings={false}
        theme={{
          wrapper:
            "h-full flex-shrink-0 border-r border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95",
          expandedWidth: "w-64",
          collapsedWidth: "w-[72px]",
          logoBorder: "border-b border-slate-200/80 dark:border-slate-800/80",
          logoExpandedPadding: "h-16 gap-3 px-6",
          logoCollapsedPadding: "h-16 justify-center px-2",
          navWrapper: "flex flex-1 flex-col gap-1 py-4",
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
        <StaffHeader
          title={currentTitle}
          parentTitle={parentTitle}
          category={currentCategory}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <div
          ref={handleContentRef}
          className={cn(
            "flex-1",
            // Home feed detail page is its own two-column layout that must
            // fill the content area edge-to-edge with no padding and no
            // page-level scroll. h-full inside the page depends on this.
            location.pathname.startsWith("/staff/home/")
              ? "overflow-hidden p-0"
              : "overflow-auto p-4 md:p-6 lg:p-8"
          )}>
          {renderTabContent(typedActiveTab)}
        </div>
        <ScrollToTopButton target={scrollTarget} threshold={600} />
      </div>
    </div>
  );
}
