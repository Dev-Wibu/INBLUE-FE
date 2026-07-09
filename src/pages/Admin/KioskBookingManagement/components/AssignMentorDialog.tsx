import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { EnrichedKioskBooking, Mentor } from "../types";

interface AssignMentorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: EnrichedKioskBooking | null;
  mentors: Mentor[];
  isLoading?: boolean;
  onAssign: (_bookingId: number, _mentorId: number, _notes: string) => void;
}

export function AssignMentorDialog({
  open,
  onOpenChange,
  booking,
  mentors,
  isLoading,
  onAssign,
}: AssignMentorDialogProps) {
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!booking) return;

    if (!booking.scheduledStart) {
      toast.error(t("adminKiosk.unableToAssignMentorNoScheduledTime"));
      return;
    }

    const formData = new FormData(e.currentTarget);
    const mentorId = Number(formData.get("mentorId"));
    const notes = String(formData.get("notes") || "");

    if (!mentorId || isNaN(mentorId) || !booking?.id) {
      return;
    }
    onAssign(booking.id, mentorId, notes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("adminKiosk.assignMentorFor", { id: booking?.id })}</DialogTitle>
            <DialogDescription>{t("adminKiosk.assignMentorDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="booking-info" className="text-muted-foreground">
                {t("adminKiosk.bookingInfo")}
              </Label>
              <div className="rounded-lg border bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <p>
                  <span className="font-medium">{t("common.id")}:</span> {booking?.id}
                </p>
                {booking?.userName && (
                  <p>
                    <span className="font-medium">{t("adminKiosk.candidate")}:</span>{" "}
                    {booking.userName}
                  </p>
                )}
                {booking?.jobTitle && (
                  <p>
                    <span className="font-medium">{t("adminKiosk.position")}:</span>{" "}
                    {booking.jobTitle}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mentorId">{t("adminKiosk.mentor")}</Label>
              <Select name="mentorId" required>
                <SelectTrigger>
                  <SelectValue placeholder={t("adminKiosk.selectMentor")} />
                </SelectTrigger>
                <SelectContent>
                  {mentors.map((mentor) => (
                    <SelectItem key={mentor.id} value={String(mentor.id)}>
                      <div className="flex flex-col">
                        <span className="font-medium">{mentor.name}</span>
                        {mentor.expertise && (
                          <span className="text-muted-foreground text-xs">{mentor.expertise}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">{t("adminKiosk.notes")}</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder={t("adminKiosk.notesPlaceholder")}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("adminKiosk.assigning")}
                </div>
              ) : (
                t("adminKiosk.confirmAssign")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
