import { ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAssignMentor, useAssignMentors } from "@/hooks/useApplicationDetails";
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

  const assignMentorsMutation = useAssignMentors({
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
        const errors: string[] = [];
        const detailsPromises = appIds.map(async (appId: number) => {
          try {
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

            if (!detailsResponse.ok) {
              errors.push(`App ${appId}: ${detailsResponse.status} ${detailsResponse.statusText}`);
              return [];
            }
            const detailsData = await detailsResponse.json();
            return (detailsData.data || detailsData || []).filter(
              (detail: ApplicationDetailItem) =>
                detail.status === "AWAITING_MENTOR" ||
                detail.status === "AWAITING_CANDIDATE_SELECT_MENTOR"
            );
          } catch (err) {
            errors.push(`App ${appId}: ${err instanceof Error ? err.message : "Unknown error"}`);
            return [];
          }
        });

        const allDetailsArrays = await Promise.all(detailsPromises);
        const allDetails = allDetailsArrays.flat();

        if (errors.length > 0) {
          console.warn("[MentorReviewAssignment] API errors:", errors);
        }

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

  const handleAssignMultiple = async (mentorIds: number[]) => {
    if (!selectedDetail) return;

    try {
      await assignMentorsMutation.mutateAsync({
        applicationDetailId: selectedDetail.id,
        mentorIds,
      });
    } catch {
      // Error handled by hook
    }
  };

  const openAssignDialog = (detail: ApplicationDetailItem) => {
    setSelectedDetail(detail);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    if (status === "AWAITING_CANDIDATE_SELECT_MENTOR") {
      return (
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          {t("adminMentorReviewAssignment.awaitingCandidateSelectMentor")}
        </span>
      );
    }
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        {t("adminMentorReviewAssignment.awaitingMentor")}
      </span>
    );
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
                      {getStatusBadge(detail.status)}
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
        onAssignMultiple={handleAssignMultiple}
        isLoading={assignMentorMutation.isPending || assignMentorsMutation.isPending}
      />
    </div>
  );
}

// ============================================================
// Assign Mentor Dialog (simplified for ApplicationDetail)
// Supports Option 1: Assign single mentor
// Supports Option 2: Assign multiple mentors for candidate to choose
// ============================================================

interface AssignMentorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: ApplicationDetailItem | null;
  onAssign: (mentorId: number, notes: string) => void;
  onAssignMultiple: (mentorIds: number[]) => void;
  isLoading?: boolean;
}

function AssignMentorDialog({
  open,
  onOpenChange,
  detail,
  onAssign,
  onAssignMultiple,
  isLoading,
}: AssignMentorDialogProps) {
  const { t } = useTranslation();
  const [assignMode, setAssignMode] = useState<"single" | "multiple">("single");
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");
  const [selectedMentorIds, setSelectedMentorIds] = useState<number[]>([]);
  const [notes, setNotes] = useState("");

  const { data: mentors = [] } = useMentors();

  const handleSubmitSingle = () => {
    const mentorId = parseInt(selectedMentorId, 10);
    if (!mentorId || isNaN(mentorId)) {
      toast.error(t("adminMentorReviewAssignment.pleaseSelectMentor"));
      return;
    }
    onAssign(mentorId, notes);
    resetForm();
  };

  const handleSubmitMultiple = () => {
    if (selectedMentorIds.length < 2) {
      toast.error(t("adminMentorReviewAssignment.pleaseSelectAtLeast2Mentors"));
      return;
    }
    onAssignMultiple(selectedMentorIds);
    resetForm();
  };

  const resetForm = () => {
    setSelectedMentorId("");
    setSelectedMentorIds([]);
    setNotes("");
    setAssignMode("single");
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      resetForm();
    }
    onOpenChange(openState);
  };

  const toggleMentorSelection = (mentorId: number) => {
    setSelectedMentorIds((prev) =>
      prev.includes(mentorId) ? prev.filter((id) => id !== mentorId) : [...prev, mentorId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
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

          {/* Assignment mode selector */}
          <div className="space-y-2">
            <Label>{t("adminMentorReviewAssignment.assignmentMode")}</Label>
            <RadioGroup
              value={assignMode}
              onValueChange={(value) => setAssignMode(value as "single" | "multiple")}
              className="flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <RadioGroupItem value="single" id="mode-single" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="mode-single" className="cursor-pointer font-medium">
                    {t("adminMentorReviewAssignment.option1Single")}
                  </Label>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("adminMentorReviewAssignment.option1SingleDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <RadioGroupItem value="multiple" id="mode-multiple" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="mode-multiple" className="cursor-pointer font-medium">
                    {t("adminMentorReviewAssignment.option2Multiple")}
                  </Label>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("adminMentorReviewAssignment.option2MultipleDesc")}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Option 1: Single mentor selection */}
          {assignMode === "single" && (
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
          )}

          {/* Option 2: Multiple mentor selection */}
          {assignMode === "multiple" && (
            <div className="space-y-2">
              <Label>{t("adminMentorReviewAssignment.selectMentors")}</Label>
              <p className="text-muted-foreground text-xs">
                {t("adminMentorReviewAssignment.selectMentorsHint")}
              </p>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-3">
                {mentors.map((mentor) => (
                  <div
                    key={mentor.id}
                    className="flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Checkbox
                      id={`mentor-${mentor.id}`}
                      checked={selectedMentorIds.includes(mentor.id as number)}
                      onCheckedChange={() => mentor.id && toggleMentorSelection(mentor.id)}
                    />
                    <Label
                      htmlFor={`mentor-${mentor.id}`}
                      className="flex flex-1 cursor-pointer items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{mentor.name}</span>
                        {mentor.email && (
                          <span className="text-xs text-slate-500">{mentor.email}</span>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
              {selectedMentorIds.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  {t("adminMentorReviewAssignment.selectedCount", {
                    count: selectedMentorIds.length,
                  })}
                </p>
              )}
            </div>
          )}

          {/* Notes - only for Option 1 */}
          {assignMode === "single" && (
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          {assignMode === "single" ? (
            <Button onClick={handleSubmitSingle} disabled={isLoading || !selectedMentorId}>
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("adminKiosk.assigning")}
                </>
              ) : (
                t("adminKiosk.confirmAssign")
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubmitMultiple}
              disabled={isLoading || selectedMentorIds.length < 2}>
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("adminKiosk.assigning")}
                </>
              ) : (
                t("adminKiosk.confirmAssign")
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
