import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { userManager } from "@/services";
import { type FontSize, type Language, type SidebarBehavior, useSettingsStore } from "@/stores/settingsStore";
import { applyTheme, type Theme, useThemeStore } from "@/stores/themeStore";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SpinnerBlock } from "@/components/ui/spinner";
import { Monitor, Moon, Sun, Languages, Eye, Bell } from "lucide-react";

type SettingsTab = "appearance" | "productivity" | "notifications";

const SETTINGS_TABS: Array<{ id: SettingsTab; labelKey: string; icon: React.ElementType }> = [
  { id: "appearance", labelKey: "common.interface", icon: Eye },
  { id: "productivity", labelKey: "common.productivity", icon: Monitor },
  { id: "notifications", labelKey: "common.notification", icon: Bell },
];

export function SettingsTab() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [isSaving, setIsSaving] = useState(false);

  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const setFontSize = useSettingsStore((state) => state.setFontSize);
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const sidebarBehavior = useSettingsStore((state) => state.sidebarBehavior);
  const setSidebarBehavior = useSettingsStore((state) => state.setSidebarBehavior);
  const muteSoundNotification = useSettingsStore((state) => state.muteSoundNotification);
  const setMuteSoundNotification = useSettingsStore((state) => state.setMuteSoundNotification);
  const muteToastNotification = useSettingsStore((state) => state.muteToastNotification);
  const setMuteToastNotification = useSettingsStore((state) => state.setMuteToastNotification);

  const handleLanguageChange = (lng: Language) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const payload = {
          theme,
          fontSize,
          muteSound: muteSoundNotification,
          muteToast: muteToastNotification,
          language,
          sidebarBehavior
      };
      const response = await userManager.updateSettings(payload);
      if (response.success) {
        toast.success(t("userSettings.settingsSavedSuccessfully"));
      } else {
        toast.error(response.error || t("userSettings.unableToUpdateSettings"));
      }
    } catch {
      toast.error(t("userSettings.unableToUpdateSettings"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40 space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cài đặt</h2>

        <div className="flex gap-2 border-b border-slate-200">
            {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                        "flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors",
                        activeTab === tab.id ? "border-[#6366f1] text-[#6366f1]" : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Icon className="h-4 w-4" />
                    {t(tab.labelKey)}
                </button>
            )})}
        </div>

        <div className="space-y-6">
            {activeTab === "appearance" && (
                <div className="space-y-6">
                    <fieldset className="space-y-3">
                        <Label className="text-sm font-medium">Giao diện màu</Label>
                        <RadioGroup value={theme} onValueChange={(v) => { setTheme(v as Theme); applyTheme(v as Theme); }} className="grid grid-cols-3 gap-3">
                            {[{v: "light", l: "Sáng", i: Sun}, {v: "dark", l: "Tối", i: Moon}, {v: "system", l: "Hệ thống", i: Monitor}].map(o => (
                                <Label key={o.v} htmlFor={o.v} className={cn("flex flex-col items-center gap-2 border p-3 rounded-lg cursor-pointer transition-colors", theme === o.v ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800")}>
                                    <RadioGroupItem value={o.v} id={o.v} />
                                    <o.i className="h-5 w-5" />
                                    <span className="text-xs">{o.l}</span>
                                </Label>
                            ))}
                        </RadioGroup>
                    </fieldset>
                    <fieldset className="space-y-3">
                        <Label className="text-sm font-medium">Cỡ chữ</Label>
                        <RadioGroup value={fontSize} onValueChange={(v) => setFontSize(v as FontSize)} className="grid grid-cols-3 gap-3">
                            {[{v: "small", l: "Nhỏ"}, {v: "default", l: "Mặc định"}, {v: "large", l: "Lớn"}].map(o => (
                                <Label key={o.v} htmlFor={o.v} className={cn("flex items-center justify-center border p-3 rounded-lg cursor-pointer transition-colors", fontSize === o.v ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800")}>
                                    <RadioGroupItem value={o.v} id={o.v} />
                                    <span className="text-xs">{o.l}</span>
                                </Label>
                            ))}
                        </RadioGroup>
                    </fieldset>
                    <fieldset className="space-y-3">
                        <Label className="text-sm font-medium">Ngôn ngữ</Label>
                        <div className="flex items-center gap-2 border p-3 rounded-lg">
                            <Languages className="h-4 w-4" />
                            <select value={language} onChange={(e) => handleLanguageChange(e.target.value as Language)} className="flex-1 bg-transparent text-sm">
                                <option value="vi">Tiếng Việt</option>
                                <option value="en">English</option>
                                <option value="ja">日本語</option>
                            </select>
                        </div>
                    </fieldset>
                </div>
            )}

            {activeTab === "productivity" && (
                <div className="space-y-4">
                     <fieldset className="space-y-3">
                        <Label className="text-sm font-medium">Hành vi thanh bên</Label>
                        <RadioGroup value={sidebarBehavior} onValueChange={(v) => setSidebarBehavior(v as SidebarBehavior)} className="space-y-2">
                            {[{v: "always-open", l: "Luôn mở"}, {v: "auto-collapse", l: "Tự động thu gọn"}].map(o => (
                                <div key={o.v} className="flex items-center space-x-2 border p-3 rounded-lg">
                                    <RadioGroupItem value={o.v} id={o.v} />
                                    <Label htmlFor={o.v}>{o.l}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </fieldset>
                </div>
            )}

            {activeTab === "notifications" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>Tắt âm thanh thông báo</Label>
                        <Switch checked={muteSoundNotification} onCheckedChange={setMuteSoundNotification} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <Label>Tắt thông báo Toast</Label>
                        <Switch checked={muteToastNotification} onCheckedChange={setMuteToastNotification} />
                    </div>
                </div>
            )}
        </div>

        <div className="flex justify-end pt-4">
            <Button onClick={handleSaveSettings} disabled={isSaving} className="bg-[#6366f1] hover:bg-[#4f46e5]">
                {isSaving ? <SpinnerBlock size="sm" /> : "Lưu thay đổi"}
            </Button>
        </div>
    </Card>
  );
}
