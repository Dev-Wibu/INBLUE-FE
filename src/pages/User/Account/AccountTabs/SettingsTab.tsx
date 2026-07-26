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
import { useEffect, useRef, useCallback } from "react";
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
    <div className="grid grid-cols-12 gap-8 items-start">
        {/* Middle Column: Settings Form */}
        <div className="col-span-12 lg:col-span-9 space-y-10">
            <section id="appearance" className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Eye className="h-5 w-5 text-[#6366f1]"/> Giao diện & Hiển thị</h3>
                <fieldset className="space-y-3">
                    <Label className="text-sm font-medium">Giao diện màu</Label>
                    <RadioGroup value={theme} onValueChange={(v) => { setTheme(v as Theme); applyTheme(v as Theme); }} className="grid grid-cols-3 gap-4">
                        {[{v: "light", l: "Sáng", i: Sun}, {v: "dark", l: "Tối", i: Moon}, {v: "system", l: "Hệ thống", i: Monitor}].map(o => (
                            <Label key={o.v} htmlFor={o.v} className={cn("flex flex-col items-center gap-2 border p-4 rounded-xl cursor-pointer transition-all hover:border-[#6366f1]", theme === o.v ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800")}>
                                <RadioGroupItem value={o.v} id={o.v} className="sr-only"/>
                                <o.i className="h-6 w-6" />
                                <span className="text-xs">{o.l}</span>
                            </Label>
                        ))}
                    </RadioGroup>
                </fieldset>
                <fieldset className="space-y-3">
                    <Label className="text-sm font-medium">Cỡ chữ</Label>
                    <RadioGroup value={fontSize} onValueChange={(v) => setFontSize(v as FontSize)} className="grid grid-cols-3 gap-4">
                        {[{v: "small", l: "Nhỏ"}, {v: "default", l: "Mặc định"}, {v: "large", l: "Lớn"}].map(o => (
                            <Label key={o.v} htmlFor={o.v} className={cn("flex items-center justify-center border p-4 rounded-xl cursor-pointer transition-all hover:border-[#6366f1]", fontSize === o.v ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800")}>
                                <RadioGroupItem value={o.v} id={o.v} className="sr-only"/>
                                <span className="text-sm">{o.l}</span>
                            </Label>
                        ))}
                    </RadioGroup>
                </fieldset>
                <fieldset className="space-y-3">
                    <Label className="text-sm font-medium">Ngôn ngữ</Label>
                    <div className="flex items-center gap-2 border p-3 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <Languages className="h-4 w-4" />
                        <select value={language} onChange={(e) => handleLanguageChange(e.target.value as Language)} className="flex-1 bg-transparent text-sm">
                            <option value="vi">Tiếng Việt</option>
                            <option value="en">English</option>
                            <option value="ja">日本語</option>
                        </select>
                    </div>
                </fieldset>
            </section>

            <Separator />

            <section id="productivity" className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Zap className="h-5 w-5 text-[#6366f1]"/> Năng suất & Thanh bên</h3>
                <RadioGroup value={sidebarBehavior} onValueChange={(v) => setSidebarBehavior(v as SidebarBehavior)} className="space-y-3">
                    {[{v: "always-open", l: "Luôn mở", d: "Thanh bên luôn hiển thị trên màn hình lớn"}, {v: "auto-collapse", l: "Tự động thu gọn", d: "Thanh bên tự động thu gọn khi không sử dụng"}].map(o => (
                        <Label key={o.v} htmlFor={o.v} className={cn("flex items-start gap-3 border p-4 rounded-xl cursor-pointer transition-all hover:border-[#6366f1]", sidebarBehavior === o.v ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800")}>
                            <RadioGroupItem value={o.v} id={o.v} className="mt-1"/>
                            <div>
                                <div className="text-sm font-medium">{o.l}</div>
                                <div className="text-xs text-slate-500">{o.d}</div>
                            </div>
                        </Label>
                    ))}
                </RadioGroup>
            </section>

            <Separator />

            <section id="notifications" className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Bell className="h-5 w-5 text-[#6366f1]"/> Thông báo</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between border p-4 rounded-xl">
                        <Label className="text-sm">Âm thanh thông báo</Label>
                        <Switch checked={muteSoundNotification} onCheckedChange={setMuteSoundNotification} />
                    </div>
                    <div className="flex items-center justify-between border p-4 rounded-xl">
                        <Label className="text-sm">Thông báo Toast (Popup)</Label>
                        <Switch checked={muteToastNotification} onCheckedChange={setMuteToastNotification} />
                    </div>
                </div>
            </section>
        </div>

        {/* Right Column: Quick Nav */}
        <aside className="hidden lg:block lg:col-span-3">
            <div className="lg:sticky lg:top-4 space-y-4">
                <Card className="p-4 border-slate-200/60 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                    <nav className="space-y-1">
                        {[{id: "appearance", l: "🎨 Giao diện"}, {id: "productivity", l: "⚡ Năng suất"}, {id: "notifications", l: "🔔 Thông báo"}].map(item => (
                            <a key={item.id} href={`#${item.id}`} className="block px-3 py-2 text-sm text-slate-600 hover:text-[#6366f1] transition-colors">{item.l}</a>
                        ))}
                    </nav>
                </Card>
                <div className="text-xs text-slate-400 px-2 italic">✨ Cài đặt được tự động lưu và áp dụng tức thì trên thiết bị của bạn.</div>
                <Button variant="ghost" onClick={handleReset} className="w-full justify-start text-xs text-slate-500 hover:text-red-600">
                    <RotateCcw className="h-3.5 w-3.5 mr-2" /> Khôi phục cài đặt gốc
                </Button>
            </div>
        </aside>
    </div>
  );
}
