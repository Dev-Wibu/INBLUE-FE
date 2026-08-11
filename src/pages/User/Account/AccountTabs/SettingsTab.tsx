import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type FontSize,
  type Language,
  type SidebarBehavior,
  useSettingsStore,
} from "@/stores/settingsStore";
import { applyTheme, type Theme, useThemeStore } from "@/stores/themeStore";
import {
  Bell,
  ExternalLink,
  Eye,
  FileText,
  HelpCircle,
  Monitor,
  Moon,
  RotateCcw,
  Shield,
  Sun,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function SettingsTab() {
  const { i18n } = useTranslation();

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
    <div className="grid grid-cols-12 items-start gap-6">
      {/* Middle Column: Compact Settings */}
      <div className="col-span-12 space-y-6 lg:col-span-8">
        <Card className="space-y-6 border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Eye className="h-4 w-4 text-[#6366f1]" /> Giao diện & Hiển thị
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <fieldset className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Giao diện màu
              </Label>
              <RadioGroup
                value={theme}
                onValueChange={(v) => {
                  setTheme(v as Theme);
                  applyTheme(v as Theme);
                }}
                className="grid grid-cols-3 gap-2">
                {[
                  { v: "light", l: "Sáng", i: Sun },
                  { v: "dark", l: "Tối", i: Moon },
                  { v: "system", l: "Hệ thống", i: Monitor },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={o.v}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-all",
                      theme === o.v
                        ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40"
                        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                    )}>
                    <RadioGroupItem value={o.v} id={o.v} className="sr-only" />
                    <o.i className="h-3 w-3" />
                    {o.l}
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="space-y-4">
              <fieldset className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Cỡ chữ
                </Label>
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                  {[
                    { v: "small", l: "Nhỏ" },
                    { v: "default", l: "Mặc định" },
                    { v: "large", l: "Lớn" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setFontSize(o.v as FontSize)}
                      className={cn(
                        "flex-1 rounded-md px-2 py-1 text-[11px] transition-all",
                        fontSize === o.v
                          ? "bg-[#6366f1] text-white"
                          : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                      )}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Ngôn ngữ
                </Label>
                <RadioGroup
                  value={language}
                  onValueChange={(v) => handleLanguageChange(v as Language)}
                  className="grid grid-cols-3 gap-2">
                  {[
                    { v: "vi", l: "Tiếng Việt" },
                    { v: "en", l: "English" },
                    { v: "ja", l: "日本語" },
                  ].map((o) => (
                    <Label
                      key={o.v}
                      htmlFor={`lang-${o.v}`}
                      className={cn(
                        "flex cursor-pointer items-center justify-center rounded-lg border p-2 text-center transition-all",
                        language === o.v
                          ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40"
                          : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                      )}>
                      <RadioGroupItem value={o.v} id={`lang-${o.v}`} className="sr-only" />
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {o.l}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </fieldset>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Zap className="h-4 w-4 text-[#6366f1]" /> Năng suất
            </h3>
            <RadioGroup
              value={sidebarBehavior}
              onValueChange={(v) => setSidebarBehavior(v as SidebarBehavior)}
              className="space-y-2">
              {[
                { v: "always-open", l: "Luôn mở" },
                { v: "auto-collapse", l: "Thu gọn" },
              ].map((o) => (
                <Label
                  key={o.v}
                  htmlFor={o.v}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs transition-all",
                    sidebarBehavior === o.v
                      ? "border-[#6366f1] bg-indigo-50 dark:bg-indigo-900/40"
                      : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  )}>
                  <RadioGroupItem value={o.v} id={o.v} />
                  {o.l}
                </Label>
              ))}
            </RadioGroup>
          </Card>

          <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Bell className="h-4 w-4 text-[#6366f1]" /> Thông báo
            </h3>
            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <Label>Âm thanh</Label>
                <Switch
                  className="scale-75"
                  checked={muteSoundNotification}
                  onCheckedChange={setMuteSoundNotification}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Popup Toast</Label>
                <Switch
                  className="scale-75"
                  checked={muteToastNotification}
                  onCheckedChange={setMuteToastNotification}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Right Column: Policies & Support */}
      <aside className="hidden lg:col-span-4 lg:block">
        <Card className="space-y-6 rounded-xl border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400">
              <Shield className="h-3 w-3" /> BẢO MẬT DỮ LIỆU
            </h4>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Thông tin cá nhân và dữ liệu phỏng vấn của bạn được bảo mật tuyệt đối và mã hóa theo
              tiêu chuẩn. Hệ thống không chia sẻ dữ liệu cho bên thứ ba.
            </p>
            <a href="#" className="flex items-center gap-1 text-xs text-[#6366f1] hover:underline">
              Chính sách bảo mật <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400">
              <FileText className="h-3 w-3" /> ĐIỀU KHOẢN & PHÁP LÝ
            </h4>
            <a
              href="#"
              className="block text-xs text-slate-500 transition-colors hover:text-[#6366f1]">
              Điều khoản dịch vụ <ExternalLink className="inline h-3 w-3" />
            </a>
            <a
              href="#"
              className="block text-xs text-slate-500 transition-colors hover:text-[#6366f1]">
              Quy định sử dụng AI <ExternalLink className="inline h-3 w-3" />
            </a>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400">
              <HelpCircle className="h-3 w-3" /> HỖ TRỢ
            </h4>
            <a
              href="#"
              className="block text-xs text-slate-500 transition-colors hover:text-[#6366f1]">
              Trung tâm trợ giúp (FAQ) <ExternalLink className="inline h-3 w-3" />
            </a>
            <a
              href="#"
              className="block text-xs text-slate-500 transition-colors hover:text-[#6366f1]">
              Báo lỗi / Góp ý tính năng <ExternalLink className="inline h-3 w-3" />
            </a>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="text-[10px] text-slate-400 italic">✨ Cài đặt được tự động lưu</div>
            <div className="text-[10px] text-slate-400">INBLUE AI Platform • v1.2.0</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 w-full justify-start text-[11px] text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800">
              <RotateCcw className="mr-2 h-3 w-3" /> Khôi phục mặc định
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  );
}
