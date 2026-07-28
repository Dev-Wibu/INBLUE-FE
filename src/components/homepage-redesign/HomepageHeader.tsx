import icon2 from "@/assets/icon2.svg";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { authManager } from "@/services/auth.manager";
import { getDashboardPath, useAuthStore } from "@/stores/authStore";
import { ArrowRight, LayoutDashboard, LogIn, LogOut, Menu, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

function getInitials(name?: string): string {
  return (
    name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

export function HomepageHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn, user, clearAuth } = useAuthStore();
  const dashboardPath = getDashboardPath(user?.role);

  const handleLogout = async () => {
    await authManager.logout();
    clearAuth();
    toast.success(t("common.loggedOutSuccessfully"));
    navigate("/login");
  };

  const navLinks = [
    { label: t("landingNew.headerExplore"), href: "/enterprise/companies" },
    { label: t("landingNew.headerHowItWorks"), href: "/#interview-map" },
  ];

  return (
    <header className="fixed top-0 right-0 left-0 z-40 border-b border-slate-200/90 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="INBLUE AI home">
          <img src={icon2} alt="" className="h-9 w-9" />
          <span className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
            INBLUE AI
          </span>
        </Link>

        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label={t("landingNew.headerNavLabel")}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold whitespace-nowrap text-slate-600 transition-colors hover:text-[#0047AB] dark:text-slate-300 dark:hover:text-[#66B2FF]">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageToggle className="text-slate-600 hover:text-[#0047AB] dark:text-slate-300 dark:hover:text-[#66B2FF]" />
          <ThemeToggle
            iconOnly
            className="text-slate-600 hover:text-[#0047AB] dark:text-slate-300 dark:hover:text-[#66B2FF]"
          />
          {isLoggedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#0047AB] focus-visible:outline-none dark:bg-slate-800 dark:focus-visible:ring-[#66B2FF]">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name ?? "User"} />
                    <AvatarFallback className="bg-[#0047AB]/10 text-xs font-bold text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to={dashboardPath} className="cursor-pointer gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {t("common.dashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/user/account" className="cursor-pointer gap-2">
                    <UserCircle className="h-4 w-4" />
                    {t("common.account")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-red-600"
                  onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  {t("common.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                className="hidden h-10 px-3 font-semibold text-slate-700 sm:inline-flex dark:text-slate-200"
                asChild>
                <Link to="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  {t("common.logIn")}
                </Link>
              </Button>
              <Button
                className="group hidden h-10 rounded-full bg-[#0047AB] px-4 font-semibold whitespace-nowrap text-white hover:bg-[#003d8f] sm:inline-flex dark:bg-[#66B2FF] dark:text-slate-950 dark:hover:bg-[#87c4ff]"
                asChild>
                <Link to="/signup">
                  {t("common.register")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t("landingNew.headerMenuLabel")}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] border-slate-200 bg-white p-6 sm:w-[340px] dark:border-slate-800 dark:bg-slate-950">
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-2 text-slate-950 dark:text-white">
                  <img src={icon2} alt="" className="h-8 w-8" />
                  INBLUE AI
                </SheetTitle>
              </SheetHeader>
              <nav
                className="mt-10 flex flex-col gap-2"
                aria-label={t("landingNew.headerNavLabel")}>
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-3 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">
                    {link.label}
                  </a>
                ))}
                {!isLoggedIn && (
                  <>
                    <Link
                      to="/login"
                      className="mt-4 rounded-lg px-3 py-3 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">
                      {t("common.logIn")}
                    </Link>
                    <Button
                      className="mt-2 h-11 rounded-full bg-[#0047AB] font-semibold text-white dark:bg-[#66B2FF] dark:text-slate-950"
                      asChild>
                      <Link to="/signup">{t("common.register")}</Link>
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
