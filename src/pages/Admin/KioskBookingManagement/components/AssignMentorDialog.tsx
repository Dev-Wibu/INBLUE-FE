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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Calendar, Clock, MapPin, Search, Star, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter mentors by search query
  const filteredMentors = mentors.filter(
    (mentor) =>
      mentor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.expertise?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Focus search input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedMentorId("");
    }
  }, [open]);

  // Keyboard navigation for mentor list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || filteredMentors.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = filteredMentors.findIndex((m) => String(m.id) === selectedMentorId);
        const nextIndex = currentIndex < filteredMentors.length - 1 ? currentIndex + 1 : 0;
        setSelectedMentorId(String(filteredMentors[nextIndex].id));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = filteredMentors.findIndex((m) => String(m.id) === selectedMentorId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredMentors.length - 1;
        setSelectedMentorId(String(filteredMentors[prevIndex].id));
      } else if (e.key === "Enter" && selectedMentorId) {
        e.preventDefault();
        // Submit form
        const form = document.getElementById("assign-mentor-form");
        if (form) {
          form.dispatchEvent(new Event("submit", { bubbles: true }));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredMentors, selectedMentorId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!booking) return;

    if (!booking.scheduledStart) {
      toast.error(t("adminKiosk.unableToAssignMentorNoScheduledTime"));
      return;
    }

    const mentorId = Number(selectedMentorId);
    const formData = new FormData(e.currentTarget);
    const notes = String(formData.get("notes") || "");

    if (!mentorId || isNaN(mentorId) || !booking?.id) {
      return;
    }
    onAssign(booking.id, mentorId, notes);
  };

  // Format date for display
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Format time for display
  const formatDisplayTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
        <form id="assign-mentor-form" onSubmit={handleSubmit}>
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {t("adminKiosk.assignMentorFor", { id: booking?.id })}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-sm">
              {t("adminKiosk.assignMentorDescription")}
              {selectedMentorId && (
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {t("common.mentorSelected", "Đã chọn mentor")}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Booking Information */}
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  {t("adminKiosk.bookingInfo")}
                </h3>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          #{booking?.id || "-"}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t("common.id")}
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {booking?.id || "-"}
                        </p>
                      </div>
                    </div>

                    {booking?.userName && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                          <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {t("adminKiosk.candidate")}
                          </p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {booking.userName}
                          </p>
                        </div>
                      </div>
                    )}

                    {booking?.jobTitle && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {t("adminKiosk.position")}
                          </p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {booking.jobTitle}
                          </p>
                        </div>
                      </div>
                    )}

                    <Separator className="my-2" />

                    {booking?.scheduledStart && (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {t("common.startTime")}
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {formatDisplayDate(booking.scheduledStart)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                            <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {t("common.time")}
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {formatDisplayTime(booking.scheduledStart)} -{" "}
                              {formatDisplayTime(booking.scheduledEnd)}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {booking?.kioskId && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                          <MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Kiosk
                          </p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            #{booking.kioskId}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Mentor Selection & Notes */}
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  {t("adminKiosk.mentor")}
                </h3>

                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder={t("common.searchMentor", "Tìm kiếm mentor...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-9"
                  />
                </div>

                {/* Mentor List */}
                <div className="scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 dark:hover:scrollbar-thumb-slate-500 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                  {filteredMentors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <User className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500">
                        {searchQuery
                          ? t("common.noMentorsFound", "Không tìm thấy mentor")
                          : t("common.noMentorsAvailable", "Không có mentor nào")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="px-2 pb-1 text-xs font-medium text-slate-500">
                        {filteredMentors.length} {t("common.mentorAvailable", "mentor(s)")}
                      </p>
                      {filteredMentors.map((mentor) => (
                        <button
                          key={mentor.id}
                          type="button"
                          onClick={() => setSelectedMentorId(String(mentor.id))}
                          className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all ${
                            selectedMentorId === String(mentor.id)
                              ? "bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-950/50"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}>
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              selectedMentorId === String(mentor.id)
                                ? "scale-110 border-indigo-500 bg-indigo-500"
                                : "border-slate-300 dark:border-slate-600"
                            }`}>
                            {selectedMentorId === String(mentor.id) && (
                              <div className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                              {mentor.name}
                            </p>
                            {mentor.expertise && (
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {mentor.expertise}
                              </p>
                            )}
                          </div>
                          <Star className="h-4 w-4 shrink-0 text-amber-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Validation message */}
                {!selectedMentorId && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <span className="text-[10px]">(*)</span>{" "}
                    {t("common.pleaseSelectMentor", "Vui lòng chọn một mentor")}
                  </p>
                )}

                {/* Hidden input for form submission */}
                <input type="hidden" name="mentorId" value={selectedMentorId} />
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-medium">
                  {t("adminKiosk.notes")}
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder={t("adminKiosk.notesPlaceholder")}
                  rows={3}
                  className="mt-1.5 resize-none bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex-row-reverse gap-2 sm:mt-6">
            <Button
              type="submit"
              disabled={isLoading || !selectedMentorId}
              className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("adminKiosk.assigning")}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t("adminKiosk.confirmAssign")}
                </div>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
