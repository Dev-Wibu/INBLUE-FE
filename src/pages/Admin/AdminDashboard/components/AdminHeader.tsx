import { LanguageToggle } from "@/components/LanguageToggle";
import { SettingsModal } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Bell, Menu, Search, Settings } from "lucide-react";
import { useState } from "react";

interface AdminHeaderProps {
  title: string;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

export function AdminHeader({ title, onToggleSidebar }: AdminHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200/80 bg-white/85 px-4 shadow-sm backdrop-blur-md sm:gap-x-6 sm:px-6 lg:px-8 dark:border-slate-800/80 dark:bg-slate-900/85">
        <div className="flex h-full flex-1 items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 h-9 w-9 text-gray-500 hover:text-gray-900 md:hidden dark:text-slate-400 dark:hover:text-white"
            onClick={onToggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb style title for Desktop */}
          <nav className="hidden sm:flex" aria-label="Breadcrumb">
            <ol role="list" className="flex items-center space-x-2 text-sm">
              <li>
                <span className="font-medium text-gray-400 dark:text-slate-500">Admin</span>
              </li>
              <li>
                <span className="mx-2 text-lg leading-none text-gray-300 dark:text-slate-600">
                  /
                </span>
              </li>
              <li>
                <span className="font-semibold tracking-tight text-gray-900 dark:text-white">
                  {title}
                </span>
              </li>
            </ol>
          </nav>

          {/* Mobile title */}
          <h1 className="truncate text-lg font-semibold tracking-tight text-gray-900 sm:hidden dark:text-white">
            {title}
          </h1>
        </div>

        <div className="flex h-full items-center gap-x-3 lg:gap-x-5">
          {/* Search bar */}
          <div className="group relative hidden max-w-xs items-center md:flex">
            <Search className="absolute left-3 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-indigo-500" />
            <input
              type="text"
              placeholder="Quick search..."
              className="block w-48 rounded-full border-0 bg-gray-100/70 py-1.5 pr-3 pl-9 text-sm text-gray-900 ring-1 ring-transparent transition-all ring-inset placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 lg:w-64 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800/90"
            />
          </div>

          <div
            className="mx-1 hidden h-6 w-px bg-gray-200 sm:block dark:bg-slate-700"
            aria-hidden="true"
          />

          <Button
            variant="ghost"
            size="icon"
            className="hidden rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 sm:flex dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
            <Bell className="h-[18px] w-[18px]" />
          </Button>

          <LanguageToggle />

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-[18px] w-[18px]" />
          </Button>

          {/* Profile Mockup */}
          <div className="ml-1 flex items-center border-l border-gray-200 pl-2 dark:border-slate-700">
            <button className="flex items-center gap-2 rounded-full p-1 transition-all hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 dark:hover:ring-indigo-400 dark:hover:ring-offset-slate-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 shadow-sm">
                <span className="text-xs font-semibold text-white">AD</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
