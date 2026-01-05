import { CheckCircle, Clock, Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { Footer, Header } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function WaitingAcceptMentorPage() {
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

            <CardTitle className="mt-6 text-2xl">Đơn đăng ký đang được xem xét</CardTitle>
            <CardDescription className="text-base">
              Cảm ơn bạn đã đăng ký trở thành Mentor tại INBLUE Interview. Đơn đăng ký của bạn đang
              được đội ngũ của chúng tôi xem xét kỹ lưỡng.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Info Box */}
            <div className="rounded-xl bg-slate-50 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-slate-700">
                  Thời gian xét duyệt: <span className="font-semibold">24-48 giờ</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-slate-700">Chúng tôi sẽ gửi email thông báo kết quả</p>
              </div>

              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-slate-700">
                  Kiểm tra email thường xuyên để không bỏ lỡ thông báo
                </p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-900">Tiến trình xử lý</h4>

              {/* Step 1: Submitted */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="h-8 w-0.5 bg-slate-200" />
                </div>
                <div>
                  <h5 className="font-medium text-slate-900">Đã nộp đơn</h5>
                  <p className="text-sm text-slate-500">Đơn đăng ký của bạn đã được gửi thành công</p>
                </div>
              </div>

              {/* Step 2: Reviewing */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  <div className="h-8 w-0.5 bg-slate-200" />
                </div>
                <div>
                  <h5 className="font-medium text-slate-900">Đang xem xét</h5>
                  <p className="text-sm text-slate-500">Chúng tôi đang xem xét hồ sơ của bạn</p>
                </div>
              </div>

              {/* Step 3: Result */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-slate-200" />
                </div>
                <div>
                  <h5 className="font-medium text-slate-500">Thông báo kết quả</h5>
                  <p className="text-sm text-slate-400">Bạn sẽ nhận được email thông báo</p>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">Quay về trang chủ</Link>
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
