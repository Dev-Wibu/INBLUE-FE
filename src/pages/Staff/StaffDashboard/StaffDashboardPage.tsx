import icon2 from "@/assets/icon2.svg";
import { LanguageToggle } from "@/components/LanguageToggle";
import type {
  ChromeTabMenuAction,
  ChromeTabMenuGroup,
  SidebarMenuGroup,
} from "@/components/shared";
import {
  DashboardChromeTabs,
  DashboardSidebar,
  DashboardSidebarToggle,
  getInitialSidebarCollapsed,
  SettingsModal,
  TabContentWrapper,
} from "@/components/shared";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { useTabsState, type Tab } from "@/hooks/useTabsState";
import { useSettingsStore } from "@/stores/settingsStore";
import { ClipboardCheck, FileText, Home, LayoutDashboard, Trash2, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ApplicationGradingPage } from "../../Admin/ApplicationGrading/ApplicationGradingPage";
import { StaffAccountPage } from "../Account/StaffAccountPage";
import { staffGradingWorkspacePage as StaffGradingWorkspacePage } from "../GradingWorkspace";
import { StaffHomeFeedPage } from "../HomeFeed/StaffHomeFeedPage";
import { StaffOverviewPage } from "./StaffOverviewPage";

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

const TAB_ICONS: Record<TabType, React.ElementType> = {
  home: Home,
  dashboard: LayoutDashboard,
  applicationGrading: ClipboardCheck,
  "grading-detail": FileText,
  account: User,
};

const TAB_COLORS: Record<TabType, string> = {
  home: "text-indigo-600 dark:text-indigo-400",
  dashboard: "text-indigo-600 dark:text-indigo-400",
  applicationGrading: "text-indigo-600 dark:text-indigo-400",
  "grading-detail": "text-indigo-600 dark:text-indigo-400",
  account: "text-indigo-600 dark:text-indigo-400",
};

const getChromeTabsMenuGroups = (t: (key: string) => string): ChromeTabMenuGroup[] => [
  {
    items: [
      {
        type: "home",
        label: t("common.home"),
        icon: Home,
        iconColor: "text-indigo-600 dark:text-indigo-400",
      },
      {
        type: "dashboard",
        label: t("common.dashboard"),
        icon: LayoutDashboard,
        iconColor: "text-indigo-600 dark:text-indigo-400",
      },
    ],
  },
  {
    items: [
      {
        type: "applicationGrading",
        label: t("adminApplicationGrading.applicationGrading"),
        icon: ClipboardCheck,
        iconColor: "text-indigo-600 dark:text-indigo-400",
      },
    ],
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

const validateChromeTabsMenuConfiguration = (
  availableTabs: Array<{ type: TabType; label: string }>,
  chromeTabsMenuGroups: ChromeTabMenuGroup[]
) => {
  const availableTabTypes = new Set(availableTabs.map((tab) => tab.type));
  const menuTabTypes = new Set(
    chromeTabsMenuGroups.flatMap((group) => group.items.map((item) => item.type as TabType))
  );
  const missingInMenu = availableTabs
    .filter((tab) => !menuTabTypes.has(tab.type))
    .map((tab) => tab.type);
  const invalidInMenu = Array.from(menuTabTypes).filter((type) => !availableTabTypes.has(type));
  return {
    missingInMenu,
    invalidInMenu,
  };
};

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
  const chromeTabsMenuGroups = useMemo(() => getChromeTabsMenuGroups(t), [t]);
  const {
    activeTab,
    openTabs,
    setActiveTab,
    closeTab,
    resetTabsTo,
    closeOtherTabs,
    openGradingTab,
  } = useTabsState({
    storageKey: "staff",
    defaultTab: "home",
    availableTabs: availableTabs,
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchEntries = Object.fromEntries(searchParams.entries());
  const { appId: gradingAppId } = searchEntries;
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollTarget, setScrollTarget] = useState<HTMLDivElement | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    getInitialSidebarCollapsed(
      "staff_sidebar_collapsed",
      undefined,
      sidebarBehavior === "auto-collapse"
    )
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const typedActiveTab = activeTab as TabType;

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    const { missingInMenu, invalidInMenu } = validateChromeTabsMenuConfiguration(
      availableTabs,
      chromeTabsMenuGroups
    );
    if (missingInMenu.length === 0 && invalidInMenu.length === 0) {
      return;
    }
    console.warn(t("staffStaffdashboard.admindashboardpageThePlusTabMenu"), {
      missingInMenu,
      invalidInMenu,
    });
  }, [t, availableTabs, chromeTabsMenuGroups]);

  useEffect(() => {
    setIsSidebarCollapsed(sidebarBehavior === "auto-collapse");
  }, [sidebarBehavior]);

  const chromeTabsData = useMemo(() => {
    const result = openTabs
      .filter((tab) => tab.type === "grading-detail" || isValidTabType(tab.type))
      .map((tab) => ({
        id: tab.id,
        type: tab.type,
        title: tab.label,
        appId: (tab as Tab).appId,
      }));
    return result;
  }, [openTabs]);

  const activeTabId = useMemo(() => {
    // For grading-detail tabs, match by type AND appId from URL
    if (activeTab === "grading-detail") {
      const tab = openTabs.find((t) => t.type === "grading-detail" && t.appId === gradingAppId);
      return tab?.id || "";
    }
    const activeTabData = openTabs.find((tab) => tab.type === activeTab);
    return activeTabData?.id || "";
  }, [openTabs, activeTab, gradingAppId]);

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
    [navigate, setActiveTab, searchParams]
  );

  const handleTabSelect = useCallback(
    (tabId: string) => {
      const selectedTab = openTabs.find((tab) => tab.id === tabId);
      if (!selectedTab) return;
      // For grading-detail tabs, navigate with detailId or appId
      if (selectedTab.type === "grading-detail") {
        const detailId = (selectedTab as Tab).detailId;
        const appId = (selectedTab as Tab).appId;
        const params = new URLSearchParams({ tab: "grading-detail" });
        if (detailId) {
          params.set("detailId", String(detailId));
        } else if (appId) {
          params.set("appId", String(appId));
        }
        navigate(`/staff?${params.toString()}`, { replace: true });
        setActiveTab("grading-detail", true);
        return;
      }
      navigateToTab(selectedTab.type);
    },
    [navigateToTab, openTabs, navigate, setActiveTab]
  );

  const handleNewTab = useCallback(
    (type: string) => {
      navigateToTab(type);
    },
    [navigateToTab]
  );

  const handleSidebarNavigate = useCallback(
    (type: string) => {
      navigateToTab(type);
    },
    [navigateToTab]
  );

  const handleCloseAllTabs = useCallback(() => {
    resetTabsTo("dashboard", true);
  }, [resetTabsTo]);

  const handleCloseOtherTabs = useCallback(
    (tabId: string) => {
      const targetTab = openTabs.find((t) => t.id === tabId);
      if (!targetTab) return;
      if (targetTab.type !== activeTab) {
        navigateToTab(targetTab.type);
      }
      closeOtherTabs(tabId);
    },
    [openTabs, navigateToTab, activeTab, closeOtherTabs]
  );

  const closeAllDisabled = openTabs.length === 1 && openTabs[0]?.type === "home";
  const chromeMenuActions = useMemo<ChromeTabMenuAction[]>(
    () => [
      {
        id: "close-all-tabs",
        label: t("common.closeAllTabs"),
        icon: Trash2,
        destructive: true,
        disabled: closeAllDisabled,
        onSelect: handleCloseAllTabs,
      },
    ],
    [closeAllDisabled, handleCloseAllTabs, t]
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
        showDesktopToggle={false}
        logo={STAFF_SIDEBAR_LOGO}
        collapsedLogo={STAFF_SIDEBAR_LOGO_COLLAPSED}
        showSettings
        settingsLabel={t("common.setting")}
        onSettingsClick={() => setIsSettingsOpen(true)}
        theme={{
          wrapper:
            "h-full flex-shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
          expandedWidth: "w-64",
          collapsedWidth: "w-[72px]",
          logoBorder: "border-b border-slate-200 dark:border-slate-800",
          logoExpandedPadding: "h-16 gap-3 px-8",
          logoCollapsedPadding: "h-16 justify-center px-2",
          navWrapper: "flex flex-1 flex-col gap-1 py-4",
          navExpandedPadding: "px-5 py-4",
          navCollapsedPadding: "px-2 py-4",
          sectionLabel:
            "text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-3 mt-2 px-3 dark:text-slate-400",
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
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400",
          logoutCollapsedBtn:
            "flex items-center justify-center rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400",
          logoutIcon: "",
          logoutLabel: t("common.logout"),
        }}
      />

      <div className="relative z-0 flex flex-1 flex-col overflow-hidden">
        <DashboardChromeTabs
          tabs={chromeTabsData}
          activeTabId={activeTabId}
          onTabSelect={handleTabSelect}
          onTabClose={closeTab}
          onCloseOtherTabs={handleCloseOtherTabs}
          onCloseAllTabs={handleCloseAllTabs}
          onNewTab={handleNewTab}
          leftSlot={
            <DashboardSidebarToggle
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
              className="hidden h-7 w-7 rounded-xl border border-slate-300/85 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 md:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            />
          }
          tabIcons={TAB_ICONS}
          tabColors={TAB_COLORS}
          menuGroups={chromeTabsMenuGroups}
          menuActions={chromeMenuActions}
          rightSlot={<LanguageToggle />}
          theme={{
            bg: "bg-slate-50 dark:bg-slate-800",
            tabActiveBorder: "border-slate-300 dark:border-slate-600",
            tabActiveBg: "bg-white dark:bg-slate-900",
            tabInactiveBg: "bg-slate-200 dark:bg-slate-700",
            tabInactiveHover: "hover:bg-slate-100 dark:hover:bg-slate-600",
            closeHover: "hover:bg-slate-300 dark:hover:bg-slate-500",
            addBtnBg: "bg-slate-200 dark:bg-slate-700",
            addBtnHover: "hover:bg-slate-300 dark:hover:bg-slate-500",
            menuHover: "hover:bg-slate-100 dark:hover:bg-slate-600",
          }}
        />

        <div ref={handleContentRef} className="relative flex-1 overflow-hidden">
          {chromeTabsData.map((tab) => {
            const isTabActive = tab.id === activeTabId;
            return (
              <TabContentWrapper
                key={tab.id}
                tabId={tab.id}
                tabType={tab.type}
                isActive={isTabActive}
                onScrollTargetActive={setScrollTarget}>
                {renderTabContent(tab.type)}
              </TabContentWrapper>
            );
          })}
        </div>
        <ScrollToTopButton target={scrollTarget} threshold={600} />
      </div>

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
