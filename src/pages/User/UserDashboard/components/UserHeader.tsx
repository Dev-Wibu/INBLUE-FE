import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationBell } from "@/components/notification";
import { SettingsModal } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { companyManager, mentorManager, postManager } from "@/services";
import {
  Bot,
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Newspaper,
  Search,
  Settings,
  UserCircle,
  UserCog,
  User as UserIcon,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface UserHeaderProps {
  title: string;
  category?: string;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

interface QuickSearchResult {
  id: string | number;
  label: string;
  hint?: string;
  type: "mentor" | "company" | "post" | "navigation";
  to: string;
}

const STATIC_NAVIGATION: Array<{
  labelKey: string;
  defaultLabel: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { labelKey: "common.home", defaultLabel: "Trang chủ", to: "/user?tab=homeFeed", icon: Newspaper },
  {
    labelKey: "userDashboard.jobSearch",
    defaultLabel: "Việc làm",
    to: "/user?tab=jobSearch",
    icon: Search,
  },
  {
    labelKey: "common.companies",
    defaultLabel: "Công ty",
    to: "/user?tab=companies",
    icon: Building2,
  },
  {
    labelKey: "common.overview",
    defaultLabel: "Tổng quan",
    to: "/user?tab=overview",
    icon: LayoutDashboard,
  },
  { labelKey: "common.mentors", defaultLabel: "Mentor", to: "/user?tab=mentors", icon: UserIcon },
  {
    labelKey: "common.application",
    defaultLabel: "Ứng tuyển",
    to: "/user?tab=applicationHistory",
    icon: Briefcase,
  },
  {
    labelKey: "common.aiInterview1",
    defaultLabel: "Phỏng vấn AI",
    to: "/user?tab=aiInterview",
    icon: Bot,
  },
  {
    labelKey: "common.messages",
    defaultLabel: "Tin nhắn",
    to: "/user?tab=messenger",
    icon: MessageSquare,
  },
  { labelKey: "common.account", defaultLabel: "Tài khoản", to: "/user/account", icon: UserCircle },
];

export function UserHeader({ title, category, onToggleSidebar }: UserHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mentors, setMentors] = useState<QuickSearchResult[]>([]);
  const [companies, setCompanies] = useState<QuickSearchResult[]>([]);
  const [posts, setPosts] = useState<QuickSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  const loadSuggestions = async (query: string) => {
    setIsLoading(true);
    try {
      const trimmed = query.trim().toLowerCase();
      const [mentorsRes, companiesRes, postsRes] = await Promise.all([
        mentorManager.getAll(),
        companyManager.getAll(),
        postManager.getPublished(),
      ]);

      const mentorList: QuickSearchResult[] = mentorsRes.success
        ? (Array.isArray(mentorsRes.data)
            ? mentorsRes.data
            : (((mentorsRes.data as { data?: unknown })?.data as Array<Record<string, unknown>>) ??
              [])
          )
            .map((m) => ({
              id: String(m.id),
              label: String(m.name ?? ""),
              hint: (m as Record<string, unknown>).title
                ? String((m as Record<string, unknown>).title)
                : m.email
                  ? String(m.email)
                  : undefined,
              type: "mentor" as const,
              to: `/user?tab=mentors`,
            }))
            .filter((m) => !trimmed || m.label.toLowerCase().includes(trimmed))
            .slice(0, 5)
        : [];

      const companyList: QuickSearchResult[] = companiesRes.success
        ? (Array.isArray(companiesRes.data)
            ? companiesRes.data
            : (((companiesRes.data as { data?: unknown })?.data as Array<
                Record<string, unknown>
              >) ?? [])
          )
            .map((c) => ({
              id: String(c.id),
              label: String(c.name ?? ""),
              hint: c.description ? String(c.description) : undefined,
              type: "company" as const,
              to: `/user?tab=companies`,
            }))
            .filter((c) => !trimmed || c.label.toLowerCase().includes(trimmed))
            .slice(0, 5)
        : [];

      const postList: QuickSearchResult[] = postsRes.success
        ? (Array.isArray(postsRes.data) ? postsRes.data : [])
            .map((p) => ({
              id: String(p.postId ?? (p as unknown as { id?: number }).id ?? ""),
              label: String(p.title ?? ""),
              hint: p.summary ? String(p.summary) : undefined,
              type: "post" as const,
              to: `/user?tab=homeFeed`,
            }))
            .filter((p) => !trimmed || p.label.toLowerCase().includes(trimmed))
            .slice(0, 5)
        : [];

      setMentors(mentorList);
      setCompanies(companyList);
      setPosts(postList);
    } catch {
      setMentors([]);
      setCompanies([]);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSearchOpen) return;
    setIsLoading(true);
    void loadSuggestions(debouncedSearch);
  }, [debouncedSearch, isSearchOpen]);

  const navigationMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return STATIC_NAVIGATION.filter((n) => {
      const label = t(n.labelKey, n.defaultLabel);
      return label.toLowerCase().includes(q);
    }).map<QuickSearchResult>((n) => ({
      id: n.to,
      label: t(n.labelKey, n.defaultLabel),
      type: "navigation",
      to: n.to,
    }));
  }, [searchQuery, t]);

  const totalResults = mentors.length + companies.length + posts.length + navigationMatches.length;

  const handleSelect = (to: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    navigate(to);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 shadow-2xs backdrop-blur-md transition-all sm:gap-x-6 sm:px-6 lg:px-8 dark:border-slate-800/80 dark:bg-slate-950/85">
        <div className="flex h-full flex-1 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 h-9 w-9 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={onToggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb Title Container for Desktop */}
          <nav className="hidden items-center sm:flex" aria-label="Breadcrumb">
            <ol role="list" className="flex items-center space-x-2 text-xs font-semibold">
              <li>
                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                  {category || t("common.user", "User")}
                </span>
              </li>
              <li>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
              </li>
              <li className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-500"></span>
                </span>
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </span>
              </li>
            </ol>
          </nav>

          {/* Mobile Title */}
          <div className="flex items-center gap-2 sm:hidden">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-500"></span>
            </span>
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex h-full items-center gap-x-3.5 sm:gap-x-4">
          {/* Quick Search Command Trigger */}
          <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t("common.quickSearch", "Tìm kiếm nhanh")}
                className={cn(
                  "group relative hidden items-center md:flex",
                  "h-10 w-52 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-left text-xs font-medium shadow-2xs transition-all",
                  "hover:border-indigo-300 hover:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none",
                  "lg:w-64 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-indigo-500/40 dark:hover:bg-slate-900"
                )}>
                <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                <span className="truncate text-slate-400 dark:text-slate-500">
                  {t("common.quickSearch", "Tìm kiếm nhanh...")}
                </span>
                <span className="ml-auto inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-400 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-400">
                  <span className="text-[9px]">⌘</span>K
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[28rem] rounded-2xl border-slate-200/90 p-0 shadow-xl dark:border-slate-800/80 dark:bg-slate-950"
              onOpenAutoFocus={(e) => e.preventDefault()}>
              <Command shouldFilter={false} className="rounded-2xl">
                <CommandInput
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  placeholder={t("common.quickSearch", "Tìm kiếm nhanh...")}
                />
                <CommandList className="max-h-[320px] p-1.5">
                  {isLoading && (
                    <div className="flex items-center justify-center py-6 text-xs text-slate-500 dark:text-slate-400">
                      {t("common.loading", "Đang tải...")}
                    </div>
                  )}
                  {!isLoading && totalResults === 0 && (
                    <CommandEmpty>{t("common.noResults", "Không tìm thấy kết quả.")}</CommandEmpty>
                  )}

                  {!isLoading && mentors.length > 0 && (
                    <CommandGroup heading={t("common.mentors", "Mentor")}>
                      {mentors.map((m) => (
                        <CommandItem
                          key={`mentor-${m.id}`}
                          value={`mentor-${m.id}`}
                          onSelect={() => handleSelect(m.to)}
                          className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium">
                          <UserCog className="h-4 w-4 shrink-0 text-amber-500" />
                          <div className="ml-2 flex min-w-0 flex-col">
                            <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {m.label}
                            </span>
                            {m.hint && (
                              <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {m.hint}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {!isLoading && companies.length > 0 && (
                    <CommandGroup heading={t("common.company", "Công ty")}>
                      {companies.map((c) => (
                        <CommandItem
                          key={`company-${c.id}`}
                          value={`company-${c.id}`}
                          onSelect={() => handleSelect(c.to)}
                          className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium">
                          <Building2 className="h-4 w-4 shrink-0 text-indigo-500" />
                          <div className="ml-2 flex min-w-0 flex-col">
                            <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {c.label}
                            </span>
                            {c.hint && (
                              <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {c.hint}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {!isLoading && posts.length > 0 && (
                    <CommandGroup heading={t("common.article", "Bài viết")}>
                      {posts.map((p) => (
                        <CommandItem
                          key={`post-${p.id}`}
                          value={`post-${p.id}`}
                          onSelect={() => handleSelect(p.to)}
                          className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium">
                          <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
                          <div className="ml-2 flex min-w-0 flex-col">
                            <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {p.label}
                            </span>
                            {p.hint && (
                              <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {p.hint}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {!isLoading && navigationMatches.length > 0 && (
                    <>
                      <CommandSeparator className="my-1" />
                      <CommandGroup heading={t("common.pages", "Trang")}>
                        {navigationMatches.map((n) => {
                          const navItem = STATIC_NAVIGATION.find((i) => i.to === n.to);
                          const IconComp = navItem?.icon || LayoutDashboard;
                          return (
                            <CommandItem
                              key={`nav-${n.id}`}
                              value={`nav-${n.id}`}
                              onSelect={() => handleSelect(n.to)}
                              className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium">
                              <IconComp className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                              <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">
                                {n.label}
                              </span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div
            className="hidden h-5 w-px bg-slate-200/80 sm:block dark:bg-slate-800/80"
            aria-hidden="true"
          />

          {/* Synchronized Action Controls Cluster */}
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/70 p-1 shadow-2xs transition-all dark:border-slate-800/80 dark:bg-slate-900/60">
            <div className="flex h-8 w-8 items-center justify-center [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:transition-all [&_button]:hover:bg-white [&_button]:hover:shadow-2xs dark:[&_button]:hover:bg-slate-800">
              <NotificationBell notificationsPath="/user/account?subtab=notifications" />
            </div>

            <div className="flex h-8 w-8 items-center justify-center [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:transition-all [&_button]:hover:bg-white [&_button]:hover:shadow-2xs dark:[&_button]:hover:bg-slate-800">
              <LanguageToggle />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-500 transition-all hover:bg-white hover:text-indigo-600 hover:shadow-2xs dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              onClick={() => setIsSettingsOpen(true)}
              title={t("userAccount.quickSettings", "Cài đặt")}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
