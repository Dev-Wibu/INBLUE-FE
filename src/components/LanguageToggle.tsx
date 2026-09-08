import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type Language, useSettingsStore } from "@/stores/settingsStore";
import { Globe } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { t, i18n } = useTranslation();
  const { language, setLanguage } = useSettingsStore();

  // Sync i18n language with store language on mount or change
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex h-9 w-auto min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-slate-700 hover:bg-slate-100 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300",
            className
          )}>
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="text-xs font-semibold uppercase">{language}</span>
          <span className="sr-only">{t("common.toggleLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <DropdownMenuItem
          onClick={() => handleLanguageChange("vi")}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center px-3 text-sm",
            language === "vi"
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
              : "text-slate-700 hover:bg-slate-100 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
          )}>
          {t("common.vietnameseVi")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("en")}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center px-3 text-sm",
            language === "en"
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
              : "text-slate-700 hover:bg-slate-100 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
          )}>
          {t("settings.englishEn")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("ja")}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center px-3 text-sm",
            language === "ja"
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
              : "text-slate-700 hover:bg-slate-100 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
          )}>
          {t("settings.japaneseJa")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
