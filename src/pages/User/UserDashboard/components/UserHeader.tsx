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
              to: `/enterprise/companies`,
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
              to: `/resources/blog`,
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
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-full flex-1 items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 h-9 w-9 text-slate-500 hover:text-slate-900 md:hidden dark:text-slate-400 dark:hover:text-white"
            onClick={onToggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb style title for Desktop */}
          <nav className="hidden sm:flex" aria-label="Breadcrumb">
            <ol role="list" className="flex items-center space-x-2">
              <li>
                <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  {category || t("common.user", "User")}
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
                    "block w-48 cursor-pointer rounded-md border-0 bg-slate-100 py-1.5 pr-10 pl-9 text-left text-sm text-slate-400 ring-1 ring-transparent transition-all ring-inset",
                    "lg:w-64 dark:bg-slate-900 dark:text-slate-500"
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
              className="w-[28rem] p-0"
              onOpenAutoFocus={(e) => e.preventDefault()}>
              <Command shouldFilter={false}>
                <CommandInput
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  placeholder={t("common.quickSearch", "Tìm kiếm nhanh...")}
                />
                <CommandList>
                  {isLoading && (
                    <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
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
                          onSelect={() => handleSelect(m.to)}>
                          <UserCog className="h-4 w-4 text-orange-500" />
                          <div className="ml-2 flex min-w-0 flex-col">
                            <span className="truncate font-medium">{m.label}</span>
                            {m.hint && (
                              <span className="truncate text-xs text-slate-500 dark:text-slate-400">
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
                          onSelect={() => handleSelect(c.to)}>
                          <Building2 className="h-4 w-4 text-indigo-500" />
                          <div className="ml-2 flex min-w-0 flex-col">
                            <span className="truncate font-medium">{c.label}</span>
                            {c.hint && (
                              <span className="truncate text-xs text-slate-500 dark:text-slate-400">
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
                          onSelect={() => handleSelect(p.to)}>
                          <FileText className="h-4 w-4 text-emerald-500" />
                          <div className="ml-2 flex min-w-0 flex-col">
                            <span className="truncate font-medium">{p.label}</span>
                            {p.hint && (
                              <span className="truncate text-xs text-slate-500 dark:text-slate-400">
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
                      <CommandSeparator />
                      <CommandGroup heading={t("common.pages", "Trang")}>
                        {navigationMatches.map((n) => {
                          const navItem = STATIC_NAVIGATION.find((i) => i.to === n.to);
                          const IconComp = navItem?.icon || LayoutDashboard;
                          return (
                            <CommandItem
                              key={`nav-${n.id}`}
                              value={`nav-${n.id}`}
                              onSelect={() => handleSelect(n.to)}>
                              <IconComp className="h-4 w-4 text-slate-500" />
                              <span className="ml-2">{n.label}</span>
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
            className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-800"
            aria-hidden="true"
          />

          {/* Actions Pill Container */}
          <div className="flex items-center gap-1 rounded-full bg-slate-50 p-1 ring-1 ring-slate-200/50 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex h-8 w-8 items-center justify-center [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:hover:bg-white [&_button]:hover:shadow-sm dark:[&_button]:hover:bg-slate-800">
              <NotificationBell notificationsPath="/user?tab=notifications" />
            </div>

            <div className="flex h-8 w-8 items-center justify-center [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:hover:bg-white [&_button]:hover:shadow-sm dark:[&_button]:hover:bg-slate-800">
              <LanguageToggle />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
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
