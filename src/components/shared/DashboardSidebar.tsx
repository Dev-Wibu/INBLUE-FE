import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { authManager } from "@/services/auth.manager";
import { useAuthStore } from "@/stores/authStore";
import { LogOut, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getInitialSidebarCollapsed } from "./sidebar-collapse";
const t = (k: string, opts?: string | Record<string, unknown>): string =>
  i18n.t(k, opts as string) as unknown as string;
export interface SidebarMenuItem {
  type: string;
  icon: React.ElementType;
  label: string;
  color: string;
  description?: string;
  children?: SidebarMenuItem[];
}
export interface SidebarMenuGroup {
  label?: string;
  items: SidebarMenuItem[];
}
export interface DashboardSidebarTheme {
  // Container
  wrapper: string;
  expandedWidth: string;
  collapsedWidth?: string;
  // Toggle button
  toggleBtn?: string;
  toggleIconColor?: string;
  // Logo
  logoBorder: string;
  logoExpandedPadding: string;
  logoCollapsedPadding: string;
  // Navigation
  navWrapper: string;
  navExpandedPadding: string;
  navCollapsedPadding: string;
  sectionLabel: string;
  divider: string;
  // Menu items
  itemPy: string;
  activeItem: string;
  inactiveItem: string;
  activeIconOverride?: string;
  // Footer
  footerBorder: string;
  footerExpandedPadding: string;
  footerCollapsedPadding: string;
  logoutExpandedBtn: string;
  logoutCollapsedBtn: string;
  logoutIcon: string;
  logoutLabel: string;
}
export interface DashboardSidebarProps {
  menuGroups: SidebarMenuGroup[];
  activeTab: string;
  onNavigate: (_type: string) => void;
  storageKey: string;
  legacyStorageKey?: string;
  collapsed?: boolean;
  onCollapsedChange?: (_collapsed: boolean) => void;
  showDesktopToggle?: boolean;
  logo: React.ReactNode;
  collapsedLogo?: React.ReactNode;
  showSettings?: boolean;
  settingsLabel?: string;
  settingsExpandedClass?: string;
  settingsCollapsedClass?: string;
  /** Callback invoked when the Settings button is clicked */
  onSettingsClick?: () => void;
  /** Callback invoked when the Profile avatar/info is clicked */
  onProfileClick?: () => void;
  theme: DashboardSidebarTheme;
}
export interface DashboardSidebarToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
  collapsedAriaLabel?: string;
  expandedAriaLabel?: string;
}
const DEFAULT_DESKTOP_TOGGLE_BUTTON_CLASS =
  "absolute top-14 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700";
export function DashboardSidebarToggle({
  isCollapsed,
  onToggle,
  className,
  collapsedAriaLabel = t("compShared.expandTheNavigationBar"),
  expandedAriaLabel = t("compShared.collapseTheNavigationBar"),
}: DashboardSidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isCollapsed ? collapsedAriaLabel : expandedAriaLabel}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-md p-0 text-slate-500 transition-colors hover:bg-transparent hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-slate-400 dark:hover:text-slate-100",
        className
      )}>
      {isCollapsed ? <PanelLeftOpen className="h-6 w-6" /> : <PanelLeftClose className="h-6 w-6" />}
    </button>
  );
}
export function DashboardSidebar({
  menuGroups,
  activeTab,
  onNavigate,
  storageKey,
  legacyStorageKey,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  showDesktopToggle = true,
  logo,
  collapsedLogo,
  showSettings = false,
  settingsLabel = t("common.setting"),
  settingsExpandedClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
  settingsCollapsedClass = "flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
  onSettingsClick,
  onProfileClick,
  theme,
}: DashboardSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // Resolve avatar URL: prefer stored user.avatarUrl, fallback to parsing from JWT token
  // This handles cases where user was persisted before avatarUrl was added to the user object
  const resolvedAvatarUrl = useMemo(() => {
    if (user?.avatarUrl) return user.avatarUrl;
    if (!token) return undefined;
    try {
      const raw = token.replace(/^Bearer\s+/i, "").trim();
      const parts = raw.split(".");
      if (parts.length < 2) return undefined;
      const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const binaryString = atob(padded);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const payload = JSON.parse(new TextDecoder("utf-8").decode(bytes)) as Record<string, unknown>;
      const url = payload.avatarUrl ?? payload.avatar;
      return typeof url === "string" && url.trim().length > 0 ? url.trim() : undefined;
    } catch {
      return undefined;
    }
  }, [user?.avatarUrl, token]);

  const isMobile = useIsMobile();
  const [internalCollapsed, setInternalCollapsed] = useState(() =>
    getInitialSidebarCollapsed(storageKey, legacyStorageKey)
  );
  const isControlled = controlledCollapsed !== undefined;
  const isCollapsed = isControlled ? controlledCollapsed : internalCollapsed;
  const desktopSidebarRef = useRef<HTMLElement | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const setCollapsed = (nextCollapsed: boolean | ((_prev: boolean) => boolean)) => {
    const resolved =
      typeof nextCollapsed === "function" ? nextCollapsed(isCollapsed) : nextCollapsed;
    if (!isControlled) {
      setInternalCollapsed(resolved);
    }
    onCollapsedChange?.(resolved);
  };
  useEffect(() => {
    localStorage.setItem(storageKey, String(isCollapsed));
  }, [isCollapsed, storageKey]);
  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };
  const handleSettingsClick = () => {
    setIsMobileOpen(false);
    if (isMobile) {
      window.setTimeout(() => {
        onSettingsClick?.();
      }, 0);
      return;
    }
    onSettingsClick?.();
  };
  const handleNavigate = (type: string) => {
    onNavigate(type);
    setIsMobileOpen(false);
  };
  const handleLogout = async () => {
    try {
      await authManager.logout();
      clearAuth();
      setIsMobileOpen(false);
      toast.success(t("common.loggedOutSuccessfully"));
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      clearAuth();
      setIsMobileOpen(false);
      navigate("/login");
    }
  };
  const renderMenuItem = (item: SidebarMenuItem) => {
    const isActive = activeTab === item.type;
    const buttonContent = (
      <button
        key={item.type}
        onClick={() => handleNavigate(item.type)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
          isCollapsed ? cn("justify-center px-2", theme.itemPy) : cn("px-3", theme.itemPy),
          isActive ? theme.activeItem : theme.inactiveItem
        )}>
        <div
          className={cn(
            "flex shrink-0 items-center",
            isCollapsed ? "w-5 justify-center" : "w-8 justify-start"
          )}>
          <item.icon
            className={cn(
              "h-5 w-5 shrink-0",
              isActive && theme.activeIconOverride ? theme.activeIconOverride : item.color
            )}
          />
        </div>
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
    if (isCollapsed) {
      return (
        <Tooltip key={item.type}>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.description ? (
              <div>
                <p>{item.label}</p>
                <p className="text-xs text-gray-400">{item.description}</p>
              </div>
            ) : (
              item.label
            )}
          </TooltipContent>
        </Tooltip>
      );
    }
    return buttonContent;
  };
  const renderMobileMenuItem = (item: SidebarMenuItem) => {
    const isActive = activeTab === item.type;
    return (
      <button
        key={item.type}
        onClick={() => handleNavigate(item.type)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-2xl border px-3.5 text-left text-sm font-semibold transition-all",
          "min-h-11 border-transparent",
          isActive
            ? "border-[#0047AB]/20 shadow-sm shadow-[#0047AB]/10 dark:border-[#66B2FF]/25 dark:shadow-[#66B2FF]/10"
            : "hover:border-slate-200/90 hover:shadow-[0_6px_16px_-14px_rgba(15,23,42,0.6)] dark:hover:border-slate-700/80 dark:hover:shadow-black/30",
          theme.itemPy,
          isActive ? theme.activeItem : theme.inactiveItem
        )}>
        <item.icon
          className={cn(
            "h-5 w-5 shrink-0",
            isActive && theme.activeIconOverride ? theme.activeIconOverride : item.color
          )}
        />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };
  return (
    <TooltipProvider delayDuration={0}>
      <>
        {isMobile && (
          <div className="fixed top-[calc(0.5rem+env(safe-area-inset-top))] left-[calc(0.5rem+env(safe-area-inset-left))] z-70 md:hidden">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label={t("compShared.openTheNavigationMenu")}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-300/90 bg-white/95 shadow-md shadow-slate-300/50 transition-all hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40 dark:hover:bg-slate-800">
                  <PanelLeftOpen className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[83vw] max-w-[336px] p-0 sm:max-w-[352px]"
                style={{
                  top: 0,
                  bottom: 0,
                  height: "100dvh",
                  maxWidth: "336px",
                }}>
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-linear-to-b from-slate-100/95 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
                  <div className="shrink-0 border-b border-slate-200/90 px-3.5 pt-[calc(0.9rem+env(safe-area-inset-top))] pb-3 dark:border-slate-800/90">
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/85 bg-white/85 px-3 py-2 shadow-sm shadow-slate-300/30 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-black/30">
                      {logo}
                    </div>
                  </div>

                  <nav
                    className={cn(
                      theme.navWrapper,
                      "min-h-0 flex-1 overflow-y-auto px-2.5 pt-3 pb-4"
                    )}>
                    {menuGroups.map((group, groupIdx) => (
                      <div key={`mobile-group-${groupIdx}`} className="space-y-1">
                        {groupIdx > 0 && (
                          <>
                            {group.label ? (
                              <p
                                className={cn(
                                  "mt-5 mb-2 px-3 text-[11px] font-semibold tracking-[0.16em] text-slate-500 dark:text-slate-400",
                                  theme.sectionLabel
                                )}>
                                {group.label}
                              </p>
                            ) : (
                              <div
                                className={cn(
                                  "my-4 border-t border-dashed",
                                  theme.divider,
                                  "dark:border-slate-700"
                                )}
                              />
                            )}
                          </>
                        )}
                        {groupIdx === 0 && group.label && (
                          <p
                            className={cn(
                              "mb-2 px-3 text-[11px] font-semibold tracking-[0.16em] text-slate-500 dark:text-slate-400",
                              theme.sectionLabel
                            )}>
                            {group.label}
                          </p>
                        )}
                        {group.items.map(renderMobileMenuItem)}
                      </div>
                    ))}
                  </nav>

                  <div
                    className={cn(
                      theme.footerBorder,
                      "shrink-0 border-t border-slate-200/90 bg-slate-50/88 px-2.5 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/72"
                    )}>
                    {showSettings && (
                      <button
                        onClick={handleSettingsClick}
                        className={cn(
                          settingsExpandedClass,
                          "rounded-2xl border border-transparent"
                        )}>
                        <Settings className="h-5 w-5" />
                        {settingsLabel}
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className={cn(
                        theme.logoutExpandedBtn,
                        "mt-1 rounded-2xl border border-transparent"
                      )}>
                      <LogOut className={cn("h-5 w-5", theme.logoutIcon)} />
                      <span>{theme.logoutLabel}</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        <aside
          ref={desktopSidebarRef}
          className={cn(
            "relative z-30 hidden flex-col overflow-visible transition-all duration-300 md:flex dark:border-slate-800 dark:bg-slate-900",
            isCollapsed ? theme.collapsedWidth || "w-16" : theme.expandedWidth,
            theme.wrapper
          )}
          style={{
            contain: "layout style",
          }}>
          {showDesktopToggle && (
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={
                isCollapsed
                  ? t("compShared.expandTheNavigationBar")
                  : t("compShared.collapseTheNavigationBar")
              }
              className={theme.toggleBtn || DEFAULT_DESKTOP_TOGGLE_BUTTON_CLASS}>
              {isCollapsed ? (
                <PanelLeftOpen
                  className={cn(
                    "h-4 w-4",
                    theme.toggleIconColor || "text-slate-600",
                    "dark:text-slate-400"
                  )}
                />
              ) : (
                <PanelLeftClose
                  className={cn(
                    "h-4 w-4",
                    theme.toggleIconColor || "text-slate-600",
                    "dark:text-slate-400"
                  )}
                />
              )}
            </button>
          )}

          {/* Logo */}
          <div
            className={cn(
              "flex items-center dark:border-slate-800",
              theme.logoBorder,
              isCollapsed ? theme.logoCollapsedPadding : theme.logoExpandedPadding
            )}>
            {isCollapsed && collapsedLogo ? collapsedLogo : logo}
          </div>

          {user && (
            <div
              className={cn(
                "flex-shrink-0 border-b border-slate-200/60 dark:border-slate-800",
                isCollapsed ? "flex justify-center px-2 py-4" : "px-8 py-4"
              )}>
              <div
                className={cn(
                  "flex items-center gap-3",
                  isCollapsed && "justify-center",
                  onProfileClick && "cursor-pointer transition-opacity hover:opacity-80"
                )}
                onClick={onProfileClick}>
                <Avatar className="h-8 w-8 shrink-0 border border-slate-200 shadow-sm dark:border-slate-700">
                  <AvatarImage
                    src={resolvedAvatarUrl || ""}
                    alt={user.name || ""}
                    referrerPolicy="no-referrer"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {user.name}
                    </span>
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {user.email}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav
            className={cn(
              theme.navWrapper,
              "min-h-0 flex-shrink overflow-y-auto",
              isCollapsed ? theme.navCollapsedPadding : theme.navExpandedPadding
            )}>
            {menuGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                {groupIdx > 0 && (
                  <>
                    {!isCollapsed && group.label && (
                      <p
                        className={cn(
                          "mt-4 mb-2 border-b border-slate-200/70 pb-2",
                          theme.sectionLabel
                        )}>
                        {group.label}
                      </p>
                    )}
                    {isCollapsed && (
                      <div
                        className={cn("my-2 border-t", theme.divider, "dark:border-slate-700")}
                      />
                    )}
                    {!isCollapsed && !group.label && (
                      <div
                        className={cn("my-2 border-t", theme.divider, "dark:border-slate-700")}
                      />
                    )}
                  </>
                )}
                {groupIdx === 0 && !isCollapsed && group.label && (
                  <p className={cn("mb-2 border-b border-slate-200/70 pb-2", theme.sectionLabel)}>
                    {group.label}
                  </p>
                )}
                {group.items.map(renderMenuItem)}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div
            className={cn(
              theme.footerBorder,
              "flex-shrink-0 border-t border-slate-200 dark:border-slate-800",
              isCollapsed ? theme.footerCollapsedPadding : theme.footerExpandedPadding
            )}>
            {!isCollapsed ? (
              <>
                {showSettings && (
                  <button onClick={handleSettingsClick} className={settingsExpandedClass}>
                    <Settings className="h-5 w-5" />
                    {settingsLabel}
                  </button>
                )}
                <button onClick={handleLogout} className={theme.logoutExpandedBtn}>
                  <LogOut className={cn("h-5 w-5", theme.logoutIcon)} />
                  <span>{theme.logoutLabel}</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {showSettings && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={handleSettingsClick} className={settingsCollapsedClass}>
                        <Settings className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{settingsLabel}</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleLogout} className={theme.logoutCollapsedBtn}>
                      <LogOut className={cn("h-5 w-5", theme.logoutIcon)} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{theme.logoutLabel}</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </aside>
      </>
    </TooltipProvider>
  );
}
