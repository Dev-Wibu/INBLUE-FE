import { CheckCircle, Clock, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Footer, Header } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function WaitingAcceptMentorPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            {/* Clock Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>

            <CardTitle className="mt-6 text-2xl">
              {t("auth_waitingacceptmentorpage.tsx.on_ang_ky_ang_uoc_xem_xet")}
            </CardTitle>
            <CardDescription className="text-base">
              {t("auth_waitingacceptmentorpage.tsx.cam_on_ban_a_ang_ky_tro_thanh_mentor_tai")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Info Box */}
            <div className="space-y-3 rounded-xl bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-slate-700">
                  {t("auth_waitingacceptmentorpage.tsx.thoi_gian_xet_duyet")}{" "}
                  <span className="font-semibold">
                    {t("auth_waitingacceptmentorpage.tsx.24_48_gio")}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-slate-700">
                  {t("auth_waitingacceptmentorpage.tsx.chung_toi_se_gui_email_thong_bao_ket_qua")}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-slate-700">
                  {t("auth_waitingacceptmentorpage.tsx.kiem_tra_email_thuong_xuyen_e_khong_bo_l")}
                </p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-900">
                {t("auth_waitingacceptmentorpage.tsx.tien_trinh_xu_ly")}
              </h4>

              {/* Step 1: Submitted */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="h-8 w-0.5 bg-slate-200" />
                </div>
                <div>
                  <h5 className="font-medium text-slate-900">
                    {t("auth_waitingacceptmentorpage.tsx.a_nop_on")}
                  </h5>
                  <p className="text-sm text-slate-500">
                    {t("auth_waitingacceptmentorpage.tsx.on_ang_ky_cua_ban_a_uoc_gui_thanh_cong")}
                  </p>
                </div>
              </div>

              {/* Step 2: Reviewing */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  <div className="h-8 w-0.5 bg-slate-200" />
                </div>
                <div>
                  <h5 className="font-medium text-slate-900">
                    {t("auth_waitingacceptmentorpage.tsx.ang_xem_xet")}
                  </h5>
                  <p className="text-sm text-slate-500">
                    {t("auth_waitingacceptmentorpage.tsx.chung_toi_ang_xem_xet_ho_so_cua_ban")}
                  </p>
                </div>
              </div>

              {/* Step 3: Result */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-slate-200" />
                </div>
                <div>
                  <h5 className="font-medium text-slate-500">
                    {t("auth_waitingacceptmentorpage.tsx.thong_bao_ket_qua")}
                  </h5>
                  <p className="text-sm text-slate-400">
                    {t("auth_waitingacceptmentorpage.tsx.ban_se_nhan_uoc_email_thong_bao")}
                  </p>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">{t("auth_waitingacceptmentorpage.tsx.quay_ve_trang_chu")}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
