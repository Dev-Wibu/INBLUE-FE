import { ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAssignMentor } from "@/hooks/useApplicationDetails";
import { useMentors } from "@/hooks/useMentor";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { Search, UserCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface ApplicationDetailItem {
  id: number;
  applicationId: number;
  roundId: number;
  status: string;
  mentorId?: number;
  sessionInfo?: {
    sessionId?: number;
    meetingType?: string;
    startTime?: string;
    endTime?: string;
  };
  createdAt?: string;
}

export function MentorReviewAssignmentPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<ApplicationDetailItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch all applications to get their IDs, then fetch details
  const [applicationDetails, setApplicationDetails] = useState<ApplicationDetailItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);

  const assignMentorMutation = useAssignMentor({
    onSuccess: () => {
      setIsDialogOpen(false);
      setSelectedDetail(null);
      void loadData(true);
    },
  });

  const loadData = useCallback(
    async (showReloading = false) => {
      if (showReloading) setIsReloading(true);
      else setIsLoading(true);

      try {
        // Fetch all applications
        const appsResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/applications`,
          {
            headers: {
              Authorization: `Bearer ${
                localStorage.getItem("auth-storage")
                  ? JSON.parse(localStorage.getItem("auth-storage") || "{}")?.state?.token
                  : ""
              }`,
            },
          }
        );

        if (!appsResponse.ok) throw new Error("Failed to fetch applications");

        const appsData = await appsResponse.json();
        const appIds = (appsData.data || appsData || []).map((app: { id: number }) => app.id);

        // Fetch application details for all applications
        const detailsPromises = appIds.map(async (appId: number) => {
          const detailsResponse = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/application-details/application/${appId}`,
            {
              headers: {
                Authorization: `Bearer ${
                  localStorage.getItem("auth-storage")
                    ? JSON.parse(localStorage.getItem("auth-storage") || "{}")?.state?.token
                    : ""
                }`,
              },
            }
          );

          if (!detailsResponse.ok) return [];
          const detailsData = await detailsResponse.json();
          return (detailsData.data || detailsData || []).filter(
            (detail: ApplicationDetailItem) => detail.status === "AWAITING_MENTOR"
          );
        });

        const allDetailsArrays = await Promise.all(detailsPromises);
        const allDetails = allDetailsArrays.flat();

        setApplicationDetails(allDetails);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error(t("common.anErrorHasOccurred"));
      } finally {
        setIsLoading(false);
        setIsReloading(false);
      }
    },
    [t]
  );

  // Load data on mount
  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDetails = useMemo(() => {
    if (!searchQuery) return applicationDetails;
    const query = searchQuery.toLowerCase();
    return applicationDetails.filter(
      (detail) =>
        detail.id.toString().includes(query) || detail.applicationId.toString().includes(query)
    );
  }, [applicationDetails, searchQuery]);

  const handleAssign = async (mentorId: number, _notes: string) => {
    void _notes;
    if (!selectedDetail) return;

    try {
      await assignMentorMutation.mutateAsync({
        applicationDetailId: selectedDetail.id,
        mentorId,
      });
    } catch {
      // Error handled by hook
    }
  };

  const openAssignDialog = (detail: ApplicationDetailItem) => {
    setSelectedDetail(detail);
    setIsDialogOpen(true);
  };

  return (
    <div className="bg-background flex flex-col">
      {/* Toolbar */}
      <div className="border-border bg-card flex flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              {t("common.administration")}
            </div>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight">
              {t("adminMentorReviewAssignment.pageTitle")}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t("adminMentorReviewAssignment.pageDescription")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder={t("adminMentorReviewAssignment.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full pl-9"
            />
          </div>

          <ReloadButton onReload={() => void loadData(true)} isLoading={isReloading} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:px-6 sm:py-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="border-primary/30 border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
          </div>
        ) : filteredDetails.length === 0 ? (
          <div className="border-border flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed">
            <UserCheck className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground text-sm font-medium">
              {t("adminMentorReviewAssignment.noPendingAssignments")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDetails.map((detail) => (
              <div
                key={detail.id}
                className="border-border rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {t("adminMentorReviewAssignment.application")} #{detail.applicationId}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {t("adminMentorReviewAssignment.awaitingMentor")}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        {t("adminMentorReviewAssignment.detailId")}: #{detail.id}
                      </span>
                      <span>
                        {t("adminMentorReviewAssignment.round")}: #{detail.roundId}
                      </span>
                      {detail.createdAt && (
                        <span>
                          {t("adminMentorReviewAssignment.createdAt")}:{" "}
                          {formatDateTime(treatZuluAsVietnamLocal(detail.createdAt))}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openAssignDialog(detail)}
                    className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
                    <UserCheck className="h-4 w-4" />
                    {t("adminKiosk.assignMentor")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Mentor Dialog */}
      <AssignMentorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        detail={selectedDetail}
        onAssign={handleAssign}
        isLoading={assignMentorMutation.isPending}
      />
    </div>
  );
}

// ============================================================
// Assign Mentor Dialog (simplified for ApplicationDetail)
// ============================================================

interface AssignMentorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: ApplicationDetailItem | null;
  onAssign: (mentorId: number, notes: string) => void;
  isLoading?: boolean;
}

function AssignMentorDialog({
  open,
  onOpenChange,
  detail,
  onAssign,
  isLoading,
}: AssignMentorDialogProps) {
  const { t } = useTranslation();
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: mentors = [] } = useMentors();

  const handleSubmit = () => {
    const mentorId = parseInt(selectedMentorId, 10);
    if (!mentorId || isNaN(mentorId)) {
      toast.error(t("adminMentorReviewAssignment.pleaseSelectMentor"));
      return;
    }
    onAssign(mentorId, notes);
    setSelectedMentorId("");
    setNotes("");
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setSelectedMentorId("");
      setNotes("");
    }
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("adminKiosk.assignMentor")}</DialogTitle>
          <DialogDescription>
            {t("adminMentorReviewAssignment.assignDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Detail info */}
          {detail && (
            <div className="rounded-lg border bg-slate-50 p-3 text-sm dark:bg-slate-800">
              <p>
                <span className="font-medium">{t("adminMentorReviewAssignment.application")}:</span>{" "}
                #{detail.applicationId}
              </p>
              <p>
                <span className="font-medium">{t("adminMentorReviewAssignment.detailId")}:</span> #
                {detail.id}
              </p>
            </div>
          )}

          {/* Mentor selection */}
          <div className="grid gap-2">
            <Label htmlFor="mentor-select">{t("adminMentorReviewAssignment.selectMentor")}</Label>
            <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
              <SelectTrigger id="mentor-select">
                <SelectValue placeholder={t("adminKiosk.selectMentor")} />
              </SelectTrigger>
              <SelectContent>
                {mentors.map((mentor) => (
                  <SelectItem key={mentor.id} value={String(mentor.id)}>
                    <div className="flex flex-col">
                      <span className="font-medium">{mentor.name}</span>
                      {mentor.email && (
                        <span className="text-xs text-slate-500">{mentor.email}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">{t("adminKiosk.notes")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("adminKiosk.notesPlaceholder")}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !selectedMentorId}>
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("adminKiosk.assigning")}
              </>
            ) : (
              t("adminKiosk.confirmAssign")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
