import { SlotCalendar, type SlotCalendarSlot } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoadingCardList } from "@/components/ui/loading-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKioskSlots, usePickKioskSlot } from "@/hooks/useKiosk";
import { fetchClient } from "@/lib/api";
import { applicationService } from "@/services/application.manager";
import { ArrowLeft, MapPin, Sparkles, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const toYmd = (date: Date): string => {
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 10);
};

export function KioskSlotsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const kioskId = Number(params.kioskId);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedSlot, setSelectedSlot] = useState<SlotCalendarSlot | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [selectedApplicationDetailId, setSelectedApplicationDetailId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [myApplications, setMyApplications] = useState<
    Array<{ id: number; jdId?: number; companyName?: string; jobTitle?: string }>
  >([]);
  const [myAppsLoading, setMyAppsLoading] = useState(true);
  const [applicationDetails, setApplicationDetails] = useState<
    Array<{ id: number; roundId?: number; status?: string; finalScore?: number }>
  >([]);
  const [applicationDetailsLoading, setApplicationDetailsLoading] = useState(false);

  const selectedDateString = useMemo(() => toYmd(selectedDate), [selectedDate]);

  const {
    data: slots = [],
    isLoading,
    error,
  } = useKioskSlots(kioskId, selectedDateString, !!kioskId);
  const pickSlotMutation = usePickKioskSlot();

  useEffect(() => {
    applicationService.getMyApplications().then((result) => {
      if (result.success && result.data) {
        const jdIds = [...new Set(result.data.map((a) => a.jdId).filter(Boolean))] as number[];
        const baseApps = result.data.map((app) => ({ id: app.id ?? 0, jdId: app.jdId }));
        if (jdIds.length > 0) {
          Promise.allSettled(
            jdIds.map(async (id) => {
              const r = await fetchClient.GET("/api/job-descriptions/{id}", {
                params: { path: { id } },
              });
              if (!r.response?.ok) return null;
              const data = r.data as { title?: string; companyName?: string };
              return {
                id,
                title: data.title,
                companyName: data.companyName,
              };
            })
          ).then((jdResults) => {
            const map = new Map<number, { title?: string; companyName?: string }>();
            jdResults.forEach((r, i) => {
              if (r.status === "fulfilled" && r.value) {
                map.set(jdIds[i], { title: r.value.title, companyName: r.value.companyName });
              }
            });
            setMyApplications(
              baseApps.map((app) => {
                const jdInfo = map.get(app.jdId ?? -1);
                return {
                  id: app.id,
                  jdId: app.jdId,
                  companyName: jdInfo?.companyName,
                  jobTitle: jdInfo?.title,
                };
              })
            );
          });
        } else {
          setMyApplications(baseApps);
        }
      }
      setMyAppsLoading(false);
    });
  }, []);

  useEffect(() => {
    const appId = Number(selectedApplicationId);
    if (!Number.isFinite(appId) || appId <= 0) {
      setApplicationDetails([]);
      setSelectedApplicationDetailId("");
      return;
    }

    let cancelled = false;
    setApplicationDetailsLoading(true);
    setApplicationDetails([]);
    setSelectedApplicationDetailId("");

    fetchClient
      .GET("/api/application-details/application/{applicationId}", {
        params: { path: { applicationId: appId } },
      })
      .then((r) => {
        if (!r.response?.ok || !Array.isArray(r.data)) {
          throw new Error("Failed to load application details");
        }
        const details = (
          r.data as Array<{ id: number; roundId?: number; status?: string; finalScore?: number }>
        ).map((item) => ({
          id: item.id,
          roundId: item.roundId,
          status: item.status,
          finalScore: item.finalScore,
        }));
        if (!cancelled) {
          setApplicationDetails(details);
        }
      })
      .catch((err) => {
        console.error("[KioskSlotsPage] load application details error:", err);
        if (!cancelled) {
          setApplicationDetails([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setApplicationDetailsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedApplicationId]);

  const availableSlots = useMemo<SlotCalendarSlot[]>(
    () =>
      (slots ?? []).filter(
        (slot): slot is SlotCalendarSlot =>
          typeof slot.startTime === "string" && typeof slot.endTime === "string"
      ),
    [slots]
  );
  const parsedKioskId = Number.isFinite(kioskId) ? kioskId : null;

  useEffect(() => {
    if (!Number.isFinite(kioskId)) {
      navigate("/user/kiosk", { replace: true });
    }
  }, [kioskId, navigate]);

  const handleBook = async () => {
    if (!parsedKioskId || !selectedSlot) return;
    const detailId = Number(selectedApplicationDetailId);
    if (!Number.isFinite(detailId) || detailId <= 0) {
      toast.error(t("userKiosk.invalidApplicationDetailId"));
      return;
    }
    setSubmitting(true);
    try {
      await pickSlotMutation.mutateAsync({
        applicationDetailId: detailId,
        kioskId: parsedKioskId,
        scheduledStart: selectedSlot.startTime,
        scheduledEnd: selectedSlot.endTime,
      });
      navigate("/user/kiosk/booking-success");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSlotKey = selectedSlot
    ? `${selectedSlot.startTime}__${selectedSlot.endTime}`
    : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/user/kiosk")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("userKiosk.selectSlotTitle")}</h1>
            <p className="text-muted-foreground text-sm">{t("userKiosk.selectSlotDescription")}</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => navigate("/user/kiosk/entry")}>
          <Video className="h-4 w-4" />
          {t("userKiosk.joinInterview")}
        </Button>
      </div>

      {/* Two-column layout on large screens */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        {/* Calendar column */}
        <div className="space-y-4">
          <SlotCalendar
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedSlot(null);
            }}
            slots={availableSlots}
            selectedSlotKey={selectedSlotKey}
            onSelectSlot={(slot) => setSelectedSlot(slot)}
            isLoading={isLoading}
            emptyMessage={
              error ? t("userKiosk.unableToLoadSlots") : t("userKiosk.noAvailableSlots")
            }
            noSlotsMessage={t("userKiosk.noAvailableSlots")}
          />
        </div>

        {/* Application context column */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="text-primary h-4 w-4" />
                {t("userKiosk.application")}
              </CardTitle>
              <CardDescription>{t("userKiosk.chooseDateAndSlot")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="applicationId">{t("userKiosk.application")}</Label>
                {myAppsLoading ? (
                  <div className="bg-muted/40 text-muted-foreground h-9 rounded-md px-3 text-sm leading-9">
                    {t("common.loading")}
                  </div>
                ) : myApplications.length === 0 ? (
                  <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-md border border-dashed p-4 text-center text-sm">
                    <p>{t("userKiosk.noApplicationsFound")}</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-primary h-auto p-0"
                      onClick={() => navigate("/user?tab=applicationHistory")}>
                      {t("userKiosk.goToApplicationHistory")}
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
                    <SelectTrigger id="applicationId">
                      <SelectValue placeholder={t("userKiosk.selectApplication")} />
                    </SelectTrigger>
                    <SelectContent>
                      {myApplications.map((app) => (
                        <SelectItem key={app.id} value={String(app.id)}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {(app.companyName ?? t("userApplicationhistory.company")) +
                                " — " +
                                (app.jobTitle ?? t("userApplicationhistory.position"))}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {t("userKiosk.applicationId", { var_0: app.id })}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicationDetailId">{t("userKiosk.applicationDetail")}</Label>
                {applicationDetailsLoading ? (
                  <div className="bg-muted/40 text-muted-foreground h-9 rounded-md px-3 text-sm leading-9">
                    {t("common.loading")}
                  </div>
                ) : applicationDetails.length === 0 ? (
                  <div className="text-muted-foreground flex h-9 items-center rounded-md border border-dashed px-3 text-xs">
                    {selectedApplicationId
                      ? t("userKiosk.noApplicationDetailsFound")
                      : t("userKiosk.selectApplicationFirst")}
                  </div>
                ) : (
                  <Select
                    value={selectedApplicationDetailId}
                    onValueChange={setSelectedApplicationDetailId}>
                    <SelectTrigger id="applicationDetailId">
                      <SelectValue placeholder={t("userKiosk.selectApplicationDetail")} />
                    </SelectTrigger>
                    <SelectContent>
                      {applicationDetails.map((detail) => (
                        <SelectItem key={detail.id} value={String(detail.id)}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {t("userKiosk.round")} #{detail.roundId ?? "-"}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {detail.status ?? "-"}
                              {typeof detail.finalScore === "number"
                                ? ` • ${detail.finalScore}`
                                : ""}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                <MapPin className="text-muted-foreground h-3.5 w-3.5" />
                <span className="text-muted-foreground">
                  {t("userKiosk.kiosk")} #{parsedKioskId ?? "-"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleBook}
            disabled={
              !selectedSlot ||
              !selectedApplicationDetailId ||
              submitting ||
              pickSlotMutation.isPending
            }
            size="lg"
            className="shadow-primary/20 w-full gap-2 shadow-lg">
            {submitting || pickSlotMutation.isPending
              ? t("userKiosk.bookingInProgress")
              : t("userKiosk.bookSlot")}
          </Button>

          {isLoading && (
            <div className="opacity-60">
              <LoadingCardList count={2} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
