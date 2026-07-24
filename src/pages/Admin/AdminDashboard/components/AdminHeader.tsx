import { LanguageToggle } from "@/components/LanguageToggle";
import { SettingsModal } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Bell, Menu, Search, Settings } from "lucide-react";
import { useState } from "react";

interface AdminHeaderProps {
  title: string;
  category?: string;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

export function AdminHeader({ title, category, onToggleSidebar }: AdminHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
          {/* Search bar */}
          <div className="group relative hidden items-center md:flex">
            <Search className="absolute left-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
            <input
              type="text"
              placeholder="Quick search..."
              className="block w-48 rounded-md border-0 bg-slate-100 py-1.5 pr-10 pl-9 text-sm text-slate-900 ring-1 ring-transparent transition-all ring-inset placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 lg:w-64 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-slate-900"
            />
            <div className="absolute right-2 flex items-center">
              <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                ⌘K
              </kbd>
            </div>
          </div>

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
