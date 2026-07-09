import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function KioskBookingSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">{t("userKiosk.bookingRequestSent")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">{t("userKiosk.bookingRequestWaitingDescription")}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate("/user?tab=applicationHistory")} className="gap-2">
              {t("userKiosk.viewApplicationHistory")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/user/kiosk")}>
              {t("userKiosk.backToKioskBooking")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
