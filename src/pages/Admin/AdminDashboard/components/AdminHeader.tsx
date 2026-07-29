import { LanguageToggle } from "@/components/LanguageToggle";
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
import { companyManager, mentorManager, usersAdminManager } from "@/services";
import {
  Bell,
  Building2,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface AdminHeaderProps {
  title: string;
  category?: string;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

interface QuickSearchResult {
  id: string | number;
  label: string;
  hint?: string;
  type: "user" | "mentor" | "company" | "navigation";
  to: string;
}

const STATIC_NAVIGATION: Array<{ labelKey: string; to: string }> = [
  { labelKey: "common.dashboard", to: "/admin" },
  { labelKey: "common.user", to: "/admin/users" },
  { labelKey: "adminAdmindashboard.instructor", to: "/admin/mentors" },
  { labelKey: "common.company", to: "/admin/companies" },
  { labelKey: "common.interviewSession", to: "/admin/sessions" },
  { labelKey: "common.feedbackFromCandidates", to: "/admin/feedback" },
  { labelKey: "common.reviewFromMentor", to: "/admin/reviews" },
];

export function AdminHeader({ title, category, onToggleSidebar }: AdminHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<QuickSearchResult[]>([]);
  const [mentors, setMentors] = useState<QuickSearchResult[]>([]);
  const [companies, setCompanies] = useState<QuickSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 200);

  const loadSuggestions = async (query: string) => {
    setIsLoading(true);
    try {
      const trimmed = query.trim().toLowerCase();
      const [usersRes, mentorsRes, companiesRes] = await Promise.all([
        usersAdminManager.getAll(),
        mentorManager.getAll(),
        companyManager.getAll(),
      ]);

      const userList: QuickSearchResult[] = usersRes.success
        ? (Array.isArray(usersRes.data)
            ? usersRes.data
            : (((usersRes.data as { data?: unknown })?.data as Array<Record<string, unknown>>) ??
              [])
          )
            .map((u) => ({
              id: String(u.id),
              label: String(u.name ?? ""),
              hint: u.email ? String(u.email) : undefined,
              type: "user" as const,
              to: `/admin/users?focus=${u.id}`,
            }))
            .filter((u) => !trimmed || u.label.toLowerCase().includes(trimmed))
            .slice(0, 5)
        : [];

      const mentorList: QuickSearchResult[] = mentorsRes.success
        ? (Array.isArray(mentorsRes.data)
            ? mentorsRes.data
            : (((mentorsRes.data as { data?: unknown })?.data as Array<Record<string, unknown>>) ??
              [])
          )
            .map((m) => ({
              id: String(m.id),
              label: String(m.name ?? ""),
              hint: m.email ? String(m.email) : undefined,
              type: "mentor" as const,
              to: `/admin/mentors?focus=${m.id}`,
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
              to: `/admin/companies?focus=${c.id}`,
            }))
            .filter((c) => !trimmed || c.label.toLowerCase().includes(trimmed))
            .slice(0, 5)
        : [];

      setUsers(userList);
      setMentors(mentorList);
      setCompanies(companyList);
    } catch {
      setUsers([]);
      setMentors([]);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSearchOpen) return;
    setIsLoading(true);
    void loadSuggestions(searchQuery);
  }, [debouncedSearch, isSearchOpen]);

  const navigationMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return STATIC_NAVIGATION.filter((n) =>
      t(n.labelKey).toLowerCase().includes(q)
    ).map<QuickSearchResult>((n) => ({
      id: n.to,
      label: t(n.labelKey),
      type: "navigation",
      to: n.to,
    }));
  }, [searchQuery, t]);

  const totalResults = users.length + mentors.length + companies.length + navigationMatches.length;

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
                  {category || "Admin"}
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
          {/* Quick Search */}
          <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t("common.quickSearch")}
                className="group relative hidden items-center md:flex">
                <Search className="absolute left-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <span
                  className={cn(
                    "block w-48 rounded-md border-0 bg-slate-100 py-1.5 pr-10 pl-9 text-left text-sm text-slate-400 ring-1 ring-transparent transition-all ring-inset",
                    "lg:w-64 dark:bg-slate-900 dark:text-slate-500"
                  )}>
                  {t("common.quickSearch")}
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
                  placeholder={t("common.quickSearch")}
                />
                <CommandList>
                  {isLoading && (
                    <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {t("common.loading", "Loading...")}
                    </div>
                  )}
                  {!isLoading && totalResults === 0 && (
                    <CommandEmpty>{t("common.noResults", "No results found.")}</CommandEmpty>
                  )}
                  {!isLoading && users.length > 0 && (
                    <CommandGroup heading={t("common.user")}>
                      {users.map((u) => (
                        <CommandItem
                          key={`user-${u.id}`}
                          value={`user-${u.id}`}
                          onSelect={() => handleSelect(u.to)}>
                          <Users className="h-4 w-4 text-purple-500" />
                          <div className="ml-2 flex min-w-0 flex-col">
                            <span className="truncate font-medium">{u.label}</span>
                            {u.hint && (
                              <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {u.hint}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {!isLoading && mentors.length > 0 && (
                    <CommandGroup heading={t("adminAdmindashboard.instructor")}>
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
                    <CommandGroup heading={t("common.company")}>
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
                  {!isLoading && navigationMatches.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading={t("common.pages", "Pages")}>
                        {navigationMatches.map((n) => (
                          <CommandItem
                            key={`nav-${n.id}`}
                            value={`nav-${n.id}`}
                            onSelect={() => handleSelect(n.to)}>
                            <LayoutDashboard className="h-4 w-4 text-slate-500" />
                            <span className="ml-2">{n.label}</span>
                          </CommandItem>
                        ))}
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
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 rounded-full text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm sm:flex dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
              <Bell className="h-4 w-4" />
            </Button>

            <div className="h-8 w-8 [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:hover:bg-white [&_button]:hover:shadow-sm dark:[&_button]:hover:bg-slate-800">
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
