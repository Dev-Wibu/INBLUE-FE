import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { type FontSize, type Language, type SidebarBehavior, useSettingsStore } from "@/stores/settingsStore";
import { applyTheme, type Theme, useThemeStore } from "@/stores/themeStore";
import { useTranslation } from "react-i18next";
import { Monitor, Moon, Sun, Languages, Eye, Bell, Zap, RotateCcw, Shield, FileText, HelpCircle, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

  const handleLanguageChange = (lng: Language) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  };

  const handleReset = () => {
    resetToDefaults();
    setTheme("system");
    applyTheme("system");
  };

  return (
    <div className="grid grid-cols-12 gap-6 items-start">
        {/* Middle Column: Compact Settings */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
            <Card className="border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40 space-y-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6"><Eye className="h-4 w-4 text-[#6366f1]"/> Giao diện & Hiển thị</h3>

                <div className="grid grid-cols-2 gap-4">
                    <fieldset className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Giao diện màu</Label>
                        <RadioGroup value={theme} onValueChange={(v) => { setTheme(v as Theme); applyTheme(v as Theme); }} className="grid grid-cols-3 gap-2">
                            {[{v: "light", l: "Sáng", i: Sun}, {v: "dark", l: "Tối", i: Moon}, {v: "system", l: "Hệ thống", i: Monitor}].map(o => (
                                <Label key={o.v} htmlFor={o.v} className={cn("flex flex-col items-center gap-1 border p-2 rounded-lg cursor-pointer transition-all text-xs", theme === o.v ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800")}>
                                    <RadioGroupItem value={o.v} id={o.v} className="sr-only"/>
                                    <o.i className="h-3 w-3" />
                                    {o.l}
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
                            <RadioGroup value={language} onValueChange={(v) => handleLanguageChange(v as Language)} className="grid grid-cols-3 gap-2">
                                {[{v: "vi", l: "Tiếng Việt"}, {v: "en", l: "English"}, {v: "ja", l: "日本語"}].map(o => (
                                    <Label key={o.v} htmlFor={`lang-${o.v}`} className={cn("flex items-center justify-center border p-2 rounded-lg cursor-pointer transition-all text-center", language === o.v ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800")}>
                                        <RadioGroupItem value={o.v} id={`lang-${o.v}`} className="sr-only"/>
                                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{o.l}</span>
                                    </Label>
                                ))}
                            </RadioGroup>
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

        {/* Right Column: Policies & Support */}
        <aside className="hidden lg:block lg:col-span-4">
            <Card className="p-5 border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40 rounded-xl space-y-6">
                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1.5"><Shield className="h-3 w-3"/> BẢO MẬT DỮ LIỆU</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Thông tin cá nhân và dữ liệu phỏng vấn của bạn được bảo mật tuyệt đối và mã hóa theo tiêu chuẩn. Hệ thống không chia sẻ dữ liệu cho bên thứ ba.</p>
                    <a href="#" className="text-xs text-[#6366f1] hover:underline flex items-center gap-1">Chính sách bảo mật <ExternalLink className="h-3 w-3"/></a>
                </div>

                <Separator/>

                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1.5"><FileText className="h-3 w-3"/> ĐIỀU KHOẢN & PHÁP LÝ</h4>
                    <a href="#" className="block text-xs text-slate-500 hover:text-[#6366f1] transition-colors">Điều khoản dịch vụ <ExternalLink className="h-3 w-3 inline"/></a>
                    <a href="#" className="block text-xs text-slate-500 hover:text-[#6366f1] transition-colors">Quy định sử dụng AI <ExternalLink className="h-3 w-3 inline"/></a>
                </div>

                <Separator/>

                <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1.5"><HelpCircle className="h-3 w-3"/> HỖ TRỢ</h4>
                    <a href="#" className="block text-xs text-slate-500 hover:text-[#6366f1] transition-colors">Trung tâm trợ giúp (FAQ) <ExternalLink className="h-3 w-3 inline"/></a>
                    <a href="#" className="block text-xs text-slate-500 hover:text-[#6366f1] transition-colors">Báo lỗi / Góp ý tính năng <ExternalLink className="h-3 w-3 inline"/></a>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="text-[10px] text-slate-400 italic">✨ Cài đặt được tự động lưu</div>
                    <div className="text-[10px] text-slate-400">INBLUE AI Platform • v1.2.0</div>
                    <Button variant="ghost" size="sm" onClick={handleReset} className="w-full justify-start text-[11px] text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 h-8">
                        <RotateCcw className="h-3 w-3 mr-2" /> Khôi phục mặc định
                    </Button>
                </div>
            </Card>
        </aside>
    </div>
  );
}
