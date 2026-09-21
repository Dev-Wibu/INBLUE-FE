import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useMentorScheduleDecision,
  usePendingMentorSchedules,
} from "@/hooks/useApplicationDetails";
import { formatUtcNaiveDateTime } from "@/lib/formatting";
import { Briefcase, CalendarClock, Check, Inbox, Loader2, MapPin, Video, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function PendingScheduleApprovals() {
  const { t } = useTranslation();
  const { data = [], isLoading, refetch } = usePendingMentorSchedules();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const selectedProposal = data.find((item) => item.applicationDetailId === selectedId);
  const selectedIsOffline = selectedProposal?.meetingType === "OFFLINE";
  const decision = useMentorScheduleDecision({
    onSuccess: () => {
      toast.success(
        mode === "approve"
          ? selectedIsOffline
            ? t("mentorSchedule.approvedOffline")
            : t("mentorSchedule.approved")
          : t("mentorSchedule.rejected")
      );
      setSelectedId(null);
      setMode(null);
      setReason("");
      void refetch();
    },
  });

  const submit = () => {
    if (!selectedId || !mode) return;
    const trimmedReason = reason.trim();
    if (mode === "reject" && !trimmedReason) {
      toast.error(t("mentorSchedule.reasonRequired"));
      return;
    }
    if (trimmedReason.length > 1000) {
      toast.error(t("mentorSchedule.reasonTooLong"));
      return;
    }
    decision.mutate({
      applicationDetailId: selectedId,
      request: mode === "approve" ? { approved: true } : { approved: false, reason: trimmedReason },
    });
  };

  return (
    <Card className="mb-8 gap-0 overflow-hidden border-0 py-0 shadow-sm dark:bg-slate-900">
      <CardHeader className="flex flex-col gap-1 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <CardTitle className="text-lg text-slate-900 dark:text-white">
            {t("mentorSchedule.pendingTitle")}
          </CardTitle>
          <CardDescription className="mt-1">
            {t("mentorSchedule.pendingDescription")}
          </CardDescription>
        </div>
        <Badge variant="outline" className="w-fit">
          {data.length}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-5 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <Inbox className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {t("mentorSchedule.emptyTitle")}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t("mentorSchedule.emptyDescription")}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(120px,0.45fr)_auto] gap-4 bg-slate-50 px-5 py-2 text-xs font-semibold text-slate-500 md:grid dark:bg-slate-950/40 dark:text-slate-400">
              <span>{t("common.candidate")}</span>
              <span>{t("userApplicationhistory.mentorSessionFieldTime")}</span>
              <span>{t("mentorSchedule.meetingType")}</span>
              <span>{t("common.actions")}</span>
            </div>
            {data.map((item) => (
              <div
                key={item.applicationDetailId}
                className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(120px,0.45fr)_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                    <AvatarImage src={item.candidateAvatarUrl ?? undefined} />
                    <AvatarFallback className="rounded-lg">
                      {(item.candidateName || item.candidateEmail || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {item.candidateName || item.candidateEmail || t("common.candidate")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />
                    {item.proposedJoinTime
                      ? formatUtcNaiveDateTime(item.proposedJoinTime)
                      : t("common.notAvailable")}
                    {` · ${t("mentorSchedule.duration", { count: item.proposedDurationMinutes ?? 60 })}`}
                  </span>
                  {item.jobTitle && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      {item.jobTitle}
                    </span>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="w-fit gap-1.5 border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {item.meetingType === "OFFLINE" ? (
                    <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />
                  ) : (
                    <Video className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300" />
                  )}
                  {item.meetingType === "OFFLINE"
                    ? t("mentorSchedule.offline")
                    : t("mentorSchedule.online")}
                </Badge>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => {
                      setSelectedId(item.applicationDetailId ?? null);
                      setMode("reject");
                    }}>
                    <X className="h-3.5 w-3.5" />
                    {t("mentorSchedule.reject")}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                    onClick={() => {
                      setSelectedId(item.applicationDetailId ?? null);
                      setMode("approve");
                    }}>
                    <Check className="h-3.5 w-3.5" />
                    {t("mentorSchedule.approve")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open && !decision.isPending) {
            setMode(null);
            setSelectedId(null);
            setReason("");
          }
        }}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 sm:max-w-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle>
              {mode === "approve"
                ? t("mentorSchedule.approveTitle")
                : t("mentorSchedule.rejectTitle")}
            </DialogTitle>
            <DialogDescription>
              {mode === "approve"
                ? selectedIsOffline
                  ? t("mentorSchedule.approveOfflineDescription")
                  : t("mentorSchedule.approveDescription")
                : t("mentorSchedule.pendingDescription")}
            </DialogDescription>
          </DialogHeader>
          {mode === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="mentor-schedule-reason">{t("mentorSchedule.rejectReason")}</Label>
              <Textarea
                id="mentor-schedule-reason"
                value={reason}
                maxLength={1000}
                rows={5}
                placeholder={t("mentorSchedule.rejectPlaceholder")}
                onChange={(event) => setReason(event.target.value)}
              />
              <p className="text-right text-xs text-slate-500">{reason.length}/1000</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={decision.isPending} onClick={() => setMode(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={decision.isPending || (mode === "reject" && !reason.trim())}
              className={mode === "reject" ? "bg-rose-600 text-white hover:bg-rose-700" : ""}
              onClick={submit}>
              {decision.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "approve" ? t("mentorSchedule.approve") : t("mentorSchedule.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
