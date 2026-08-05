import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationBell } from "@/components/notification";
import { DashboardSidebarToggle, SettingsModal } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import {
  Calendar,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Search,
  Settings,
  Star,
  UserCircle,
  Users,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface MentorHeaderProps {
  title: string;
  category?: string;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

interface QuickSearchResult {
  id: string | number;
  label: string;
  hint?: string;
  type: "navigation";
  to: string;
}

const STATIC_NAVIGATION: Array<{
  labelKey: string;
  defaultLabel: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    labelKey: "common.home",
    defaultLabel: "Trang chủ",
    to: "/mentor?tab=homeFeed",
    icon: Newspaper,
  },
  {
    labelKey: "common.overview",
    defaultLabel: "Tổng quan",
    to: "/mentor?tab=overview",
    icon: LayoutDashboard,
  },
  {
    labelKey: "common.interviewSession",
    defaultLabel: "Buổi phỏng vấn",
    to: "/mentor?tab=sessions",
    icon: Calendar,
  },
  {
    labelKey: "common.students",
    defaultLabel: "Sinh viên",
    to: "/mentor?tab=students",
    icon: Users,
  },
  {
    labelKey: "mentorMentordashboard.reviewSent",
    defaultLabel: "Đánh giá đã gửi",
    to: "/mentor?tab=reviews",
    icon: Star,
  },
  {
    labelKey: "common.responseReceived",
    defaultLabel: "Phản hồi nhận được",
    to: "/mentor?tab=feedback",
    icon: MessageSquare,
  },
  {
    labelKey: "common.messages",
    defaultLabel: "Tin nhắn",
    to: "/mentor?tab=messenger",
    icon: MessageSquare,
  },
  {
    labelKey: "common.account",
    defaultLabel: "Tài khoản",
    to: "/mentor?tab=account",
    icon: UserCircle,
  },
];

export function MentorHeader({
  title,
  category,
  onToggleSidebar,
  isSidebarCollapsed,
}: MentorHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 200);

  // Keyboard shortcut Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigationMatches = useMemo(() => {
    if (!debouncedSearch.trim())
      return STATIC_NAVIGATION.map<QuickSearchResult>((n) => ({
        id: n.to,
        label: t(n.labelKey, n.defaultLabel),
        type: "navigation",
        to: n.to,
      }));

    const q = debouncedSearch.toLowerCase();
    return STATIC_NAVIGATION.filter((n) => {
      const label = t(n.labelKey, n.defaultLabel);
      return label.toLowerCase().includes(q);
    }).map<QuickSearchResult>((n) => ({
      id: n.to,
      label: t(n.labelKey, n.defaultLabel),
      type: "navigation",
      to: n.to,
    }));
  }, [debouncedSearch, t]);

  const handleSelect = (to: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    navigate(to);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-xs backdrop-blur-md sm:gap-x-6 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex h-full flex-1 items-center gap-4">
          <div className="flex items-center gap-2">
            <DashboardSidebarToggle isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
          </div>

          {/* Breadcrumb style title for Desktop */}
          <nav className="hidden sm:flex" aria-label="Breadcrumb">
            <ol role="list" className="flex items-center space-x-2">
              <li>
                <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  {category || t("common.mentor", "Mentor")}
                </span>
              </li>
              <li>
                <span className="mx-2 text-lg leading-none text-slate-300 dark:text-slate-600">
                  /
                </span>
              </li>
              <li>
                <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </span>
              </li>
            </ol>
          </nav>

          {/* Mobile title */}
          <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:hidden dark:text-white">
            {title}
          </h1>
        </div>

        <div className="flex h-full items-center gap-x-4 lg:gap-x-6">
          {/* Quick Search Popover */}
          <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t("common.quickSearch", "Tìm kiếm nhanh")}
                className="group relative hidden items-center md:flex">
                <Search className="absolute left-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <span
                  className={cn(
                    "block w-48 cursor-pointer rounded-xl border-0 bg-slate-100/80 py-1.5 pr-10 pl-9 text-left text-sm text-slate-400 ring-1 ring-slate-200/60 transition-all hover:bg-slate-100 hover:ring-indigo-300",
                    "lg:w-64 dark:bg-slate-800/80 dark:text-slate-500 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:ring-indigo-500/40"
                  )}>
                  {t("common.quickSearch", "Tìm kiếm nhanh...")}
                </span>
                <div className="absolute right-2 flex items-center">
                  <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                    ⌘K
                  </kbd>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[24rem] border-slate-200 p-0 shadow-xl dark:border-slate-800"
              onOpenAutoFocus={(e) => e.preventDefault()}>
              <Command shouldFilter={false}>
                <CommandInput
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  placeholder={t("common.quickSearch", "Tìm kiếm nhanh...")}
                />
                <CommandList>
                  {navigationMatches.length === 0 && (
                    <CommandEmpty>{t("common.noResults", "Không tìm thấy kết quả.")}</CommandEmpty>
                  )}

                  {navigationMatches.length > 0 && (
                    <CommandGroup heading={t("common.pages", "Trang Mentor")}>
                      {navigationMatches.map((n) => {
                        const navItem = STATIC_NAVIGATION.find((i) => i.to === n.to);
                        const IconComp = navItem?.icon || LayoutDashboard;
                        return (
                          <CommandItem
                            key={`nav-${n.id}`}
                            value={`nav-${n.id}`}
                            onSelect={() => handleSelect(n.to)}
                            className="cursor-pointer py-2.5">
                            <IconComp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="ml-2 font-medium">{n.label}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div
            className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-800"
            aria-hidden="true"
          />

          {/* Actions Pill Container matching Candidate Header */}
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100/80 p-1.5 ring-1 ring-slate-200/60 dark:bg-slate-900/80 dark:ring-slate-800">
            <div className="flex h-8 w-8 items-center justify-center [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:hover:bg-white [&_button]:hover:shadow-xs dark:[&_button]:hover:bg-slate-800">
              <NotificationBell notificationsPath="/mentor?tab=notifications" />
            </div>

            <div className="flex h-8 w-8 items-center justify-center [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:hover:bg-white [&_button]:hover:shadow-xs dark:[&_button]:hover:bg-slate-800">
              <LanguageToggle />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-xs dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={() => setIsSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
