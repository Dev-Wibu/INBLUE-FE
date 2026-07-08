import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingCardList } from "@/components/ui/loading-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applicationService } from "@/services/application.manager";
import { fetchClient } from "@/lib/api";
import { useKioskSlots, usePickKioskSlot } from "@/hooks/useKiosk";
import { formatDateTime, formatTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { ArrowLeft, Calendar } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type KioskSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

const toKioskSlot = (slot: {
  startTime?: string;
  endTime?: string;
  available?: boolean;
}): KioskSlot => ({
  startTime: slot.startTime ?? "",
  endTime: slot.endTime ?? "",
  available: slot.available ?? false,
});

export function KioskSlotsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const kioskId = Number(params.kioskId);

  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedSlot, setSelectedSlot] = useState<KioskSlot | null>(null);
  const [applicationDetailId, setApplicationDetailId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [myApplications, setMyApplications] = useState<Array<{ id: number; jdId?: number; companyName?: string; jobTitle?: string }>>([]);
  const [myAppsLoading, setMyAppsLoading] = useState(true);
  const [jdMap, setJdMap] = useState<Map<number, { title?: string; companyName?: string }>>(new Map());

  const { data: slots = [], isLoading, error } = useKioskSlots(kioskId, selectedDate, !!kioskId);
  const pickSlotMutation = usePickKioskSlot();

  useEffect(() => {
    applicationService.getMyApplications().then(async (result) => {
      if (result.success && result.data) {
        setMyApplications(
          result.data.map((app) => ({
            id: app.id ?? 0,
            jdId: app.jdId,
          }))
        );

        // Enrich with JD data
        const jdIds = [...new Set(result.data.map((a) => a.jdId).filter(Boolean))] as number[];
        if (jdIds.length > 0) {
          const jdResults = await Promise.allSettled(
            jdIds.map(async (id) => {
              const r = await fetchClient.GET("/api/job-descriptions/{id}", {
                params: { path: { id } },
              });
              if (!r.response?.ok) return null;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const extra = r.data as any;
              return { id, title: (r.data as { title?: string }).title, companyName: extra.companyName };
            })
          );
          const map = new Map<number, { title?: string; companyName?: string }>();
          jdResults.forEach((r, i) => {
            if (r.status === "fulfilled" && r.value) {
              map.set(jdIds[i], { title: r.value.title, companyName: r.value.companyName });
            }
          });
          setJdMap(map);
        }
      }
      setMyAppsLoading(false);
    });
  }, []);

  const availableSlots = useMemo(() => (slots ?? []).filter((slot) => slot.available), [slots]);
  const parsedKioskId = Number.isFinite(kioskId) ? kioskId : null;

  useEffect(() => {
    if (!Number.isFinite(kioskId)) {
      navigate("/user/kiosk", { replace: true });
    }
  }, [kioskId, navigate]);

  const handleBook = async () => {
    if (!parsedKioskId || !selectedSlot) return;
    const detailId = Number(applicationDetailId);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/user/kiosk")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("userKiosk.selectSlotTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("userKiosk.selectSlotDescription")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("userKiosk.slotSelection")}</CardTitle>
          <CardDescription>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span>{t("userKiosk.chooseDateAndSlot")}</span>
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedSlot(null);
                }}
                className="h-9 w-full sm:w-auto"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="applicationDetailId">{t("userKiosk.applicationDetailId")}</Label>
              {myAppsLoading ? (
                <Input disabled placeholder={t("common.loading")} />
              ) : myApplications.length === 0 ? (
                <div className="flex flex-col gap-1 rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
                  <p>{t("userKiosk.noApplicationsFound")}</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mx-auto h-auto p-0 text-primary"
                    onClick={() => navigate("/user?tab=applicationHistory")}>
                    {t("userKiosk.goToApplicationHistory")}
                  </Button>
                </div>
              ) : (
                <Select
                  value={applicationDetailId}
                  onValueChange={setApplicationDetailId}>
                  <SelectTrigger id="applicationDetailId">
                    <SelectValue placeholder={t("userKiosk.selectApplication")} />
                  </SelectTrigger>
                  <SelectContent>
                    {myApplications.map((app) => {
                      const jd = jdMap.get(app.jdId ?? 0);
                      const companyName = jd?.companyName ?? t("userApplicationhistory.company");
                      const jobTitle = jd?.title ?? t("userApplicationhistory.position");
                      return (
                        <SelectItem key={app.id} value={String(app.id)}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {companyName} — {jobTitle}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {t("userKiosk.applicationId", { var_0: app.id })}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {isLoading ? (
            <LoadingCardList count={4} />
          ) : error ? (
            <p className="text-sm text-red-600">{t("userKiosk.unableToLoadSlots")}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availableSlots.length === 0 && (
                <p className="text-muted-foreground text-sm sm:col-span-2">
                  {t("userKiosk.noAvailableSlots")}
                </p>
              )}
              {availableSlots.map((slot, idx) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                const start = treatZuluAsVietnamLocal(slot.startTime);
                const end = treatZuluAsVietnamLocal(slot.endTime);
                return (
                  <Card
                    key={`${slot.startTime}-${idx}`}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "hover:border-primary"
                    }`}
                    onClick={() => setSelectedSlot(toKioskSlot(slot))}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <Calendar className="text-muted-foreground h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">
                          {formatTime(start)} - {formatTime(end)}
                        </p>
                        <p className="text-muted-foreground text-xs">{formatDateTime(start)}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Button
            onClick={handleBook}
            disabled={
              !selectedSlot ||
              !applicationDetailId ||
              submitting ||
              pickSlotMutation.isPending
            }
            className="w-full">
            {submitting || pickSlotMutation.isPending
              ? t("userKiosk.bookingInProgress")
              : t("userKiosk.bookSlot")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
