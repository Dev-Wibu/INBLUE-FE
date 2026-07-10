import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCardList } from "@/components/ui/loading-card";
import { useActiveKiosks } from "@/hooks/useKiosk";
import { ArrowLeft, ArrowRight, Building2, MapPin, Monitor, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function KioskListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: kiosks = [], isLoading, error } = useActiveKiosks();

  const headerBlock = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/user?tab=applicationHistory")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("userKiosk.selectKioskTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("userKiosk.selectKioskDescription")}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => navigate("/user/kiosk/bookings")}
          className="gap-2">
          {t("userKiosk.bookNewKiosk")}
        </Button>
        <Button onClick={() => navigate("/user/kiosk/entry")} className="gap-2">
          <Video className="h-4 w-4" />
          {t("userKiosk.joinInterview")}
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {headerBlock}
        <LoadingCardList count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {headerBlock}
        <Card className="border-destructive/30 bg-destructive/5 dark:bg-destructive/10">
          <CardContent className="py-10 text-center">
            <p className="text-destructive font-medium">{t("userKiosk.unableToLoadKiosks")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {headerBlock}

      {kiosks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-full">
              <Monitor className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">{t("userKiosk.noActiveKiosks")}</p>
              <p className="text-muted-foreground text-sm">
                {t("userKiosk.noActiveKiosksDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kiosks.map((kiosk) => (
            <Card
              key={kiosk.id}
              role="button"
              tabIndex={0}
              aria-label={kiosk.name}
              onClick={() => navigate(`/user/kiosk/${kiosk.id}/slots`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/user/kiosk/${kiosk.id}/slots`);
                }
              }}
              className="group border-border/70 hover:border-primary/60 hover:shadow-primary/10 relative cursor-pointer overflow-hidden border-2 transition-all hover:shadow-lg">
              <div
                aria-hidden
                className="from-primary/10 via-primary/5 absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-transparent"
              />
              <CardHeader className="gap-3">
                <div className="bg-primary/10 text-primary group-hover:bg-primary/15 flex h-11 w-11 items-center justify-center rounded-xl transition-colors">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{kiosk.name}</CardTitle>
                  {kiosk.location && (
                    <CardDescription className="mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {kiosk.location}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-end pt-0">
                <span className="text-primary text-sm font-medium transition-transform group-hover:translate-x-0.5">
                  {t("userKiosk.bookNow")}
                </span>
                <ArrowRight className="text-primary ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
