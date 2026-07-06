import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { authManager, userManager } from "@/services";
import { type FontSize, useSettingsStore } from "@/stores/settingsStore";
import { applyTheme, type Theme, useThemeStore } from "@/stores/themeStore";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type SettingsTab = "appearance" | "notifications" | "account";

const SETTINGS_TABS: Array<{ id: SettingsTab; labelKey: string }> = [
  { id: "appearance", labelKey: "userSettings.appearance" },
  { id: "notifications", labelKey: "userSettings.notifications" },
  { id: "account", labelKey: "userSettings.account" },
];

const DEFAULT_SAVED_SETTINGS: {
  theme: Theme;
  fontSize: FontSize;
  muteSound: boolean;
  muteToast: boolean;
} = {
  theme: "system",
  fontSize: "default",
  muteSound: false,
  muteToast: false,
};

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [isSaving, setIsSaving] = useState(false);
  const [remoteSettings, setRemoteSettings] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState("");
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SAVED_SETTINGS);
  const savedSettingsRef = useRef(savedSettings);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const setFontSize = useSettingsStore((state) => state.setFontSize);
  const muteSoundNotification = useSettingsStore((state) => state.muteSoundNotification);
  const setMuteSoundNotification = useSettingsStore((state) => state.setMuteSoundNotification);
  const muteToastNotification = useSettingsStore((state) => state.muteToastNotification);
  const setMuteToastNotification = useSettingsStore((state) => state.setMuteToastNotification);

  const isDirty =
    theme !== savedSettingsRef.current.theme ||
    fontSize !== savedSettingsRef.current.fontSize ||
    muteSoundNotification !== savedSettingsRef.current.muteSound ||
    muteToastNotification !== savedSettingsRef.current.muteToast;

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoadError("");
      try {
        const response = await userManager.getSettings();
        if (response.success && response.data && isMounted) {
          setRemoteSettings(response.data);
        }
      } catch {
        if (isMounted) {
          setLoadError(t("userSettings.unableToLoadSettings"));
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!remoteSettings) {
      return;
    }
    const nextTheme = remoteSettings.theme as Theme | undefined;
    const nextFontSize = remoteSettings.fontSize as FontSize | undefined;
    const nextMuteSound = remoteSettings.muteSound as boolean | undefined;
    const nextMuteToast = remoteSettings.muteToast as boolean | undefined;

    if (nextTheme && ["light", "dark", "system"].includes(nextTheme)) {
      setTheme(nextTheme);
      applyTheme(nextTheme);
    }
    if (nextFontSize && ["small", "default", "large"].includes(nextFontSize)) {
      setFontSize(nextFontSize);
    }
    if (typeof nextMuteSound === "boolean") {
      setMuteSoundNotification(nextMuteSound);
    }
    if (typeof nextMuteToast === "boolean") {
      setMuteToastNotification(nextMuteToast);
    }

    const merged = {
      theme: nextTheme ?? savedSettingsRef.current.theme,
      fontSize: nextFontSize ?? savedSettingsRef.current.fontSize,
      muteSound: nextMuteSound ?? savedSettingsRef.current.muteSound,
      muteToast: nextMuteToast ?? savedSettingsRef.current.muteToast,
    };
    setSavedSettings(merged);
    savedSettingsRef.current = merged;
    // intentionally only rerun when remoteSettings changes; savedSettingsRef keeps dirty tracking stable
  }, [remoteSettings, setFontSize, setMuteSoundNotification, setMuteToastNotification, setTheme]);

  const handleSaveSettings = async () => {
    if (!isDirty) {
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        theme,
        fontSize,
        muteSound: muteSoundNotification,
        muteToast: muteToastNotification,
      };
      const response = await userManager.updateSettings(payload);
      if (response.success) {
        toast.success(t("userSettings.settingsSavedSuccessfully"));
        const snapshot = { ...payload };
        setSavedSettings(snapshot);
        savedSettingsRef.current = snapshot;
      } else {
        toast.error(response.error || t("userSettings.unableToUpdateSettings"));
      }
    } catch {
      toast.error(t("userSettings.unableToUpdateSettings"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authManager.logout();
      toast.success(t("userSettings.loggedOutSuccessfully"));
      navigate("/login", { replace: true });
    } catch {
      toast.error(t("userSettings.unableToLogout"));
      setIsLoggingOut(false);
      setShowLogoutDialog(false);
    }
  };

  const tabs = useMemo(
    () =>
      SETTINGS_TABS.map((item) => ({
        id: item.id,
        label: t(item.labelKey),
      })),
    [t]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Card className="border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/user/account")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#0047AB]/40 focus-visible:outline-none dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-balance text-slate-900 dark:text-white">
              {t("userSettings.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("userSettings.subtitle")}
            </p>
          </div>
        </div>

        {loadError ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <span role="status" aria-live="polite">
              {loadError}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-[220px,1fr]">
          <nav className="space-y-1" aria-label={t("userSettings.settingsTabsLabel")}>
            <div role="tablist" aria-label={t("userSettings.settingsTabsLabel")}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`settings-panel-${tab.id}`}
                  id={`settings-tab-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => {
                    const index = tabs.findIndex((item) => item.id === tab.id);
                    const nextIndex =
                      event.key === "ArrowRight"
                        ? (index + 1) % tabs.length
                        : event.key === "ArrowLeft"
                          ? (index - 1 + tabs.length) % tabs.length
                          : -1;
                    if (nextIndex >= 0) {
                      event.preventDefault();
                      const nextTab = tabs[nextIndex];
                      setActiveTab(nextTab.id);
                      document.getElementById(`settings-tab-${nextTab.id}`)?.focus();
                    }
                  }}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#0047AB]/40 focus-visible:outline-none",
                    activeTab === tab.id
                      ? "bg-[#e5eeff] text-[#0047AB] dark:bg-[#0058be]/20 dark:text-[#66B2FF]"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}>
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="space-y-6">
            {activeTab === "appearance" && (
              <div
                className="space-y-6"
                role="tabpanel"
                id={`settings-panel-appearance`}
                aria-labelledby={`settings-tab-appearance`}>
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {t("userSettings.colorTheme")}
                  </legend>
                  <RadioGroup
                    value={theme}
                    onValueChange={(value) => {
                      setTheme(value as Theme);
                      applyTheme(value as Theme);
                    }}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { value: "light", label: t("common.bright") },
                      { value: "dark", label: t("common.dark") },
                      { value: "system", label: t("common.system") },
                    ].map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          "flex items-center rounded-xl border-2 px-4 py-3 transition-colors",
                          theme === option.value
                            ? "border-[#0047AB] bg-[#e5eeff] dark:border-[#66B2FF] dark:bg-[#0058be]/15"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                        )}>
                        <RadioGroupItem value={option.value} id={`theme-${option.value}`} />
                        <Label
                          htmlFor={`theme-${option.value}`}
                          className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>

                <Separator />

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {t("userSettings.fontSize")}
                  </legend>
                  <RadioGroup
                    value={fontSize}
                    onValueChange={(value) => setFontSize(value as FontSize)}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { value: "small", label: t("common.small") },
                      { value: "default", label: t("common.default") },
                      { value: "large", label: t("common.big") },
                    ].map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          "flex items-center rounded-xl border-2 px-4 py-3 transition-colors",
                          fontSize === option.value
                            ? "border-[#0047AB] bg-[#e5eeff] dark:border-[#66B2FF] dark:bg-[#0058be]/15"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                        )}>
                        <RadioGroupItem value={option.value} id={`font-${option.value}`} />
                        <Label
                          htmlFor={`font-${option.value}`}
                          className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>
              </div>
            )}

            {activeTab === "notifications" && (
              <div
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                role="tabpanel"
                id={`settings-panel-notifications`}
                aria-labelledby={`settings-tab-notifications`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {t("userSettings.muteSoundNotifications")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t("userSettings.muteSoundNotificationsDescription")}
                    </p>
                  </div>
                  <Switch
                    checked={muteSoundNotification}
                    onCheckedChange={(value) => setMuteSoundNotification(value)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {t("userSettings.muteToastNotifications")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t("userSettings.muteToastNotificationsDescription")}
                    </p>
                  </div>
                  <Switch
                    checked={muteToastNotification}
                    onCheckedChange={(value) => setMuteToastNotification(value)}
                  />
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div
                className="space-y-4"
                role="tabpanel"
                id={`settings-panel-account`}
                aria-labelledby={`settings-tab-account`}>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {t("userSettings.security")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t("userSettings.securityDescription")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/user/account/change-password")}>
                      {t("userSettings.changePassword")}
                    </Button>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {t("userSettings.logout")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t("userSettings.logoutDescription")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowLogoutDialog(true)}>
                      {t("userSettings.logout")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
          {isDirty ? (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {t("userSettings.unsavedChanges")}
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
              {t("userSettings.allChangesSaved")}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/user/account")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#0047AB]/40 focus-visible:outline-none dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              {t("common.back")}
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving || !isDirty}
              className="rounded-lg bg-[#0047AB] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#003b8f] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#0047AB] dark:text-white">
              {isSaving ? t("common.saving") : t("userSettings.saveChanges")}
            </button>
          </div>
        </div>
      </Card>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("userSettings.confirmLogoutTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("userSettings.confirmLogoutDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500">
              {isLoggingOut ? t("common.loading") : t("userSettings.logout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
