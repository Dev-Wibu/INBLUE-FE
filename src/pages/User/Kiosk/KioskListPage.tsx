import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCardList } from "@/components/ui/loading-card";
import { useActiveKiosks } from "@/hooks/useKiosk";
import { ArrowLeft, MapPin, Monitor, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function KioskListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: kiosks = [], isLoading, error } = useActiveKiosks();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/user?tab=applicationHistory")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("userKiosk.selectKioskTitle")}</h1>
            <p className="text-muted-foreground text-sm">{t("userKiosk.selectKioskDescription")}</p>
          </div>
        </div>
        <LoadingCardList count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/user?tab=applicationHistory")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("userKiosk.selectKioskTitle")}</h1>
            <p className="text-muted-foreground text-sm">{t("userKiosk.selectKioskDescription")}</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            {t("userKiosk.unableToLoadKiosks")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/user?tab=applicationHistory")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("userKiosk.selectKioskTitle")}</h1>
            <p className="text-muted-foreground text-sm">{t("userKiosk.selectKioskDescription")}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/user/kiosk/entry")} className="gap-2">
          <Video className="h-4 w-4" />
          {t("userKiosk.joinInterview")}
        </Button>
      </div>

      {kiosks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Monitor className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
            <p className="font-medium">{t("userKiosk.noActiveKiosks")}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("userKiosk.noActiveKiosksDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kiosks.map((kiosk) => (
            <Card
              key={kiosk.id}
              className="hover:border-primary cursor-pointer transition-colors"
              onClick={() => navigate(`/user/kiosk/${kiosk.id}/slots`)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  {kiosk.name}
                </CardTitle>
                {kiosk.location && (
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {kiosk.location}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
