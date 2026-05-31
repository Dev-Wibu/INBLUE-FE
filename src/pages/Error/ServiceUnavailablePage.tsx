import { Home, Lightbulb, RefreshCcw, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function ServiceUnavailablePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="text-center">
        {/* 503 Illustration */}
        <div className="mb-8">
          <div className="relative mx-auto h-48 w-48">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-9xl font-bold text-gray-200 dark:text-slate-800">503</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <WifiOff className="h-24 w-24 text-yellow-500 opacity-80" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
          {t("error_serviceunavailablepage.tsx.dich_vu_tam_thoi_khong_kha_dung")}
        </h1>
        <p className="mb-8 max-w-md text-gray-600 dark:text-slate-400">
          {t("error_serviceunavailablepage.tsx.may_chu_ang_bao_tri_hoac_qua_tai_vui_lon")}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            {t("error_serviceunavailablepage.tsx.tai_lai_trang")}
          </Button>
          <Button onClick={() => navigate("/")} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Home className="h-4 w-4" />
            {t("error_unauthorizedpage.tsx.ve_trang_chu")}
          </Button>
        </div>

        {/* Maintenance Notice */}
        <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <Lightbulb className="mr-1 inline-block h-4 w-4" />{" "}
            {t("error_serviceunavailablepage.tsx.meo_thu_kiem_tra_ket_noi_internet_cua_ba")}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 text-sm text-gray-500 dark:text-slate-500">
        {t("error_serviceunavailablepage.tsx.ma_loi_503_dich_vu_khong_kha_dung")}
      </div>
    </div>
  );
}
