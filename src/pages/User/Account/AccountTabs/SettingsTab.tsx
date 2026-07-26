import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { userManager } from "@/services";
import { type FontSize, type Language, type SidebarBehavior, useSettingsStore } from "@/stores/settingsStore";
import { applyTheme, type Theme, useThemeStore } from "@/stores/themeStore";
import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Monitor, Moon, Sun, Languages, Eye, Bell, Zap, RotateCcw } from "lucide-react";

export function SettingsTab() {
  const { t, i18n } = useTranslation();

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
  const resetToDefaults = useSettingsStore((state) => state.resetToDefaults);

  const handleSaveSettings = useCallback(async (payload: any) => {
    try {
      const response = await userManager.updateSettings(payload);
      if (!response.success) {
        toast.error(response.error || t("userSettings.unableToUpdateSettings"));
      }
    } catch {
      toast.error(t("userSettings.unableToUpdateSettings"));
    }
  }, [t]);

  useEffect(() => {
    const payload = { theme, fontSize, muteSound: muteSoundNotification, muteToast: muteToastNotification, language, sidebarBehavior };
    const timer = setTimeout(() => handleSaveSettings(payload), 500);
    return () => clearTimeout(timer);
  }, [theme, fontSize, muteSoundNotification, muteToastNotification, language, sidebarBehavior, handleSaveSettings]);

  const handleLanguageChange = (lng: Language) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  };

  const handleReset = () => {
    resetToDefaults();
    setTheme("system");
    applyTheme("system");
    toast.success("Đã khôi phục cài đặt gốc");
  };

  return (
    <div className="grid grid-cols-12 gap-6 items-start">
        {/* Middle Column: Compact Settings */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
            <Card className="border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6"><Eye className="h-4 w-4 text-[#6366f1]"/> Giao diện & Hiển thị</h3>

                <div className="grid grid-cols-2 gap-4">
                    <fieldset className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Giao diện màu</Label>
                        <RadioGroup value={theme} onValueChange={(v) => { setTheme(v as Theme); applyTheme(v as Theme); }} className="grid grid-cols-3 gap-2">
                            {[{v: "light", l: "Sáng", i: Sun}, {v: "dark", l: "Tối", i: Moon}, {v: "system", l: "Hệ thống", i: Monitor}].map(o => (
                                <Label key={o.v} htmlFor={o.v} className={cn("flex flex-col items-center gap-1 border p-2 rounded-lg cursor-pointer transition-all", theme === o.v ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800")}>
                                    <RadioGroupItem value={o.v} id={o.v} className="sr-only"/>
                                    <o.i className="h-4 w-4" />
                                    <span className="text-[10px] text-slate-700 dark:text-slate-300">{o.l}</span>
                                </Label>
                            ))}
                        </RadioGroup>
                    </fieldset>

                    <div className="space-y-4">
                        <fieldset className="space-y-2">
                            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Cỡ chữ</Label>
                            <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800">
                                {[{v: "small", l: "Nhỏ"}, {v: "default", l: "Mặc định"}, {v: "large", l: "Lớn"}].map(o => (
                                    <button key={o.v} onClick={() => setFontSize(o.v as FontSize)} className={cn("flex-1 px-2 py-1 text-[11px] rounded-md transition-all", fontSize === o.v ? "bg-[#6366f1] text-white" : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}>
                                        {o.l}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                        <fieldset className="space-y-2">
                            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Ngôn ngữ</Label>
                            <select value={language} onChange={(e) => handleLanguageChange(e.target.value as Language)} className="w-full border border-slate-200 dark:border-slate-700 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs outline-none text-slate-700 dark:text-slate-300">
                                <option value="vi">Tiếng Việt</option>
                                <option value="en">English</option>
                                <option value="ja">日本語</option>
                            </select>
                        </fieldset>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card className="border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3"><Zap className="h-4 w-4 text-[#6366f1]"/> Năng suất</h3>
                    <RadioGroup value={sidebarBehavior} onValueChange={(v) => setSidebarBehavior(v as SidebarBehavior)} className="space-y-2">
                        {[{v: "always-open", l: "Luôn mở"}, {v: "auto-collapse", l: "Thu gọn"}].map(o => (
                            <Label key={o.v} htmlFor={o.v} className={cn("flex items-center gap-2 border p-2 rounded-lg cursor-pointer text-xs transition-all", sidebarBehavior === o.v ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300")}>
                                <RadioGroupItem value={o.v} id={o.v} />
                                {o.l}
                            </Label>
                        ))}
                    </RadioGroup>
                </Card>

                <Card className="border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3"><Bell className="h-4 w-4 text-[#6366f1]"/> Thông báo</h3>
                    <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                            <Label>Âm thanh</Label>
                            <Switch className="scale-75" checked={muteSoundNotification} onCheckedChange={setMuteSoundNotification} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Popup Toast</Label>
                            <Switch className="scale-75" checked={muteToastNotification} onCheckedChange={setMuteToastNotification} />
                        </div>
                    </div>
                </Card>
            </div>
        </div>

        {/* Right Column: Quick Nav */}
        <aside className="hidden lg:block lg:col-span-3">
            <div className="lg:sticky lg:top-4">
                <Card className="p-4 border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Mục lục</h4>
                    <div className="text-xs text-slate-500 italic">✨ Cài đặt tự động lưu.</div>
                    <Button variant="ghost" onClick={handleReset} className="w-full justify-start text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <RotateCcw className="h-3.5 w-3.5 mr-2" /> Khôi phục gốc
                    </Button>
                </Card>
            </div>
        </aside>
    </div>

  );
}
