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
import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SpinnerBlock } from "@/components/ui/spinner";
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
        {/* Middle Column: Settings Form */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
            <Card className="border-slate-800 bg-[#1a1f2c] p-6 shadow-sm space-y-8 text-slate-100">
                <section id="appearance" className="space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Eye className="h-5 w-5 text-[#6366f1]"/> Giao diện & Hiển thị</h3>

                    <fieldset className="space-y-3">
                        <Label className="text-sm font-medium text-slate-400">Giao diện màu</Label>
                        <RadioGroup value={theme} onValueChange={(v) => { setTheme(v as Theme); applyTheme(v as Theme); }} className="grid grid-cols-3 gap-3">
                            {[{v: "light", l: "Sáng", i: Sun}, {v: "dark", l: "Tối", i: Moon}, {v: "system", l: "Hệ thống", i: Monitor}].map(o => (
                                <Label key={o.v} htmlFor={o.v} className={cn("flex flex-col items-center gap-2 border p-3 rounded-lg cursor-pointer transition-all hover:border-[#6366f1]", theme === o.v ? "border-[#6366f1] bg-[#2d3748]" : "border-slate-700 bg-[#252a3a]")}>
                                    <RadioGroupItem value={o.v} id={o.v} className="sr-only"/>
                                    <o.i className="h-5 w-5" />
                                    <span className="text-xs">{o.l}</span>
                                </Label>
                            ))}
                        </RadioGroup>
                    </fieldset>

                    <fieldset className="space-y-3">
                        <Label className="text-sm font-medium text-slate-400">Cỡ chữ</Label>
                        <div className="flex border border-slate-700 rounded-lg p-1 bg-[#252a3a]">
                            {[{v: "small", l: "Nhỏ", s: "text-xs"}, {v: "default", l: "Mặc định", s: "text-sm"}, {v: "large", l: "Lớn", s: "text-base"}].map(o => (
                                <button key={o.v} onClick={() => setFontSize(o.v as FontSize)} className={cn("flex-1 px-3 py-1.5 text-xs rounded-md transition-all", fontSize === o.v ? "bg-[#6366f1] text-white" : "hover:bg-[#2d3748]")}>
                                    <span className={o.s}>{o.l}</span>
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className="space-y-3">
                        <Label className="text-sm font-medium text-slate-400">Ngôn ngữ</Label>
                        <div className="flex items-center gap-2 border border-slate-700 p-2.5 rounded-lg bg-[#252a3a]">
                            <Languages className="h-4 w-4 text-slate-400" />
                            <select value={language} onChange={(e) => handleLanguageChange(e.target.value as Language)} className="flex-1 bg-transparent text-sm outline-none">
                                <option value="vi">Tiếng Việt</option>
                                <option value="en">English</option>
                                <option value="ja">日本語</option>
                            </select>
                        </div>
                    </fieldset>
                </section>

                <Separator className="bg-slate-700" />

                <section id="productivity" className="space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Zap className="h-5 w-5 text-[#6366f1]"/> Năng suất & Thanh bên</h3>
                    <RadioGroup value={sidebarBehavior} onValueChange={(v) => setSidebarBehavior(v as SidebarBehavior)} className="space-y-2">
                        {[{v: "always-open", l: "Luôn mở", d: "Luôn hiển thị thanh bên"}, {v: "auto-collapse", l: "Tự động thu gọn", d: "Tự động thu gọn thanh bên"}].map(o => (
                            <Label key={o.v} htmlFor={o.v} className={cn("flex items-center gap-3 border p-3 rounded-lg cursor-pointer transition-all hover:border-[#6366f1]", sidebarBehavior === o.v ? "border-[#6366f1] bg-[#2d3748]" : "border-slate-700 bg-[#252a3a]")}>
                                <RadioGroupItem value={o.v} id={o.v} />
                                <div>
                                    <div className="text-sm font-medium">{o.l}</div>
                                    <div className="text-xs text-slate-500">{o.d}</div>
                                </div>
                            </Label>
                        ))}
                    </RadioGroup>
                </section>

                <Separator className="bg-slate-700" />

                <section id="notifications" className="space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Bell className="h-5 w-5 text-[#6366f1]"/> Thông báo</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border border-slate-700 p-3 rounded-lg bg-[#252a3a]">
                            <Label className="text-sm">Âm thanh thông báo</Label>
                            <Switch checked={muteSoundNotification} onCheckedChange={setMuteSoundNotification} />
                        </div>
                        <div className="flex items-center justify-between border border-slate-700 p-3 rounded-lg bg-[#252a3a]">
                            <Label className="text-sm">Thông báo Toast (Popup)</Label>
                            <Switch checked={muteToastNotification} onCheckedChange={setMuteToastNotification} />
                        </div>
                    </div>
                </section>
            </Card>
        </div>

        {/* Right Column: Quick Nav */}
        <aside className="hidden lg:block lg:col-span-3">
            <div className="lg:sticky lg:top-4">
                <Card className="p-5 border-slate-700 bg-[#1a1f2c] text-slate-100 shadow-sm rounded-xl space-y-6">
                    <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Mục lục</h4>
                    <nav className="space-y-2">
                        {[{id: "appearance", l: "🎨 Giao diện & Hiển thị"}, {id: "productivity", l: "⚡ Năng suất & Thanh bên"}, {id: "notifications", l: "🔔 Thông báo"}].map(item => (
                            <a key={item.id} href={`#${item.id}`} className="block px-3 py-2 text-sm rounded-md text-slate-400 hover:text-white hover:bg-[#2d3748] transition-colors">{item.l}</a>
                        ))}
                    </nav>
                    <Separator className="bg-slate-700" />
                    <div className="text-xs text-slate-500 italic">✨ Cài đặt được tự động lưu và áp dụng tức thì.</div>
                    <Button variant="ghost" onClick={handleReset} className="w-full justify-start text-xs text-slate-400 hover:text-red-400 hover:bg-[#2d3748]">
                        <RotateCcw className="h-3.5 w-3.5 mr-2" /> Khôi phục cài đặt gốc
                    </Button>
                </Card>
            </div>
        </aside>
    </div>
  );
}
