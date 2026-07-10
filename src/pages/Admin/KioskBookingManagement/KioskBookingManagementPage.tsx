import { PaginationControl, ReloadButton } from "@/components/shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/hooks/usePagination";
import { kioskBookingManager } from "@/services/kiosk-booking.manager";
import { CalendarClock, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AssignMentorDialog, BookingDetailDialog, BookingTable } from "./components";
import type { EnrichedKioskBooking, KioskBooking, Mentor, StatusFilter } from "./types";

export function KioskBookingManagementPage() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<KioskBooking[]>([]);
  const [enrichedBookings, setEnrichedBookings] = useState<EnrichedKioskBooking[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Dialog states — state managed by parent (setter passed as onOpenChange)
  const [, setIsViewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<EnrichedKioskBooking | null>(null);

  const filteredBookings = useMemo(() => {
    return enrichedBookings.filter((booking) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false;
      }
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchesSearch =
          booking.id?.toString().includes(lowerQuery) ||
          booking.userName?.toLowerCase().includes(lowerQuery) ||
          booking.userEmail?.toLowerCase().includes(lowerQuery) ||
          booking.jobTitle?.toLowerCase().includes(lowerQuery) ||
          booking.companyName?.toLowerCase().includes(lowerQuery) ||
          booking.kioskName?.toLowerCase().includes(lowerQuery);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [enrichedBookings, searchQuery, statusFilter]);

  const pageSize = 10;
  const pagination = usePagination({
    totalCount: filteredBookings.length,
    pageSize,
    initialPage: 1,
  });

  const paginatedBookings = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredBookings.slice(start, start + pagination.pageSize);
  }, [filteredBookings, pagination.currentPage, pagination.pageSize]);

  const loadData = useCallback(
    async (showReloading = false) => {
      if (showReloading) {
        setIsReloading(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        const [bookingsRes, mentorsRes] = await Promise.all([
          kioskBookingManager.getAllBookings(),
          kioskBookingManager.getMentors(),
        ]);

        if (bookingsRes.success && bookingsRes.data) {
          setBookings(bookingsRes.data);
        } else {
          toast.error(bookingsRes.error || t("adminKiosk.unableToLoadBookings"));
        }

        if (mentorsRes.success && mentorsRes.data) {
          setMentors(mentorsRes.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error(t("adminKiosk.unableToLoadBookings"));
      } finally {
        setIsInitialLoading(false);
        setIsReloading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (bookings.length === 0) {
      setEnrichedBookings([]);
      return;
    }

    const enriched: EnrichedKioskBooking[] = bookings.map((booking) => ({
      ...booking,
      userName: `User #${booking.applicantUserId}`,
      userEmail: undefined,
      jobTitle: `Application #${booking.applicationDetailId}`,
      companyName: undefined,
      kioskName: `Kiosk #${booking.kioskId}`,
      kioskLocation: undefined,
      mentorName: booking.mentorId ? `Mentor #${booking.mentorId}` : undefined,
      mentorExpertise: undefined,
    }));

    setEnrichedBookings(enriched);
  }, [bookings]);

  useEffect(() => {
    pagination.reset();
  }, [searchQuery, statusFilter, pagination]);

  const handleViewDetails = (booking: EnrichedKioskBooking) => {
    setSelectedBooking(booking);
    setIsViewDialogOpen(true);
  };

  const handleAssignMentor = (booking: EnrichedKioskBooking) => {
    setSelectedBooking(booking);
    setIsAssignDialogOpen(true);
  };

  const handleAssign = async (bookingId: number, mentorId: number, notes: string) => {
    setIsAssigning(true);
    try {
      const response = await kioskBookingManager.assignMentor(bookingId, {
        mentorId,
        notes,
      });

      if (response.success) {
        toast.success(t("adminKiosk.mentorAssignedSuccessfully"));
        setIsAssignDialogOpen(false);
        void loadData(true);
      } else {
        toast.error(response.error || t("adminKiosk.unableToAssignMentor"));
      }
    } catch (error) {
      console.error("Error assigning mentor:", error);
      toast.error(t("adminKiosk.unableToAssignMentor"));
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Toolbar */}
      <div className="border-border bg-card flex flex-none flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              {t("common.administration")}
            </div>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight">
              {t("adminKiosk.bookingRequests")}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t("adminKiosk.managingBookingRequests")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder={t("adminKiosk.searchByUserOrJob")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="AWAITING_MENTOR">{t("adminKiosk.pending")}</SelectItem>
              <SelectItem value="MENTOR_ASSIGNED">{t("adminKiosk.mentorAssigned")}</SelectItem>
              <SelectItem value="ROOM_CREATED">{t("adminKiosk.roomCreated")}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t("adminKiosk.inProgress")}</SelectItem>
              <SelectItem value="COMPLETED">{t("adminKiosk.completed")}</SelectItem>
              <SelectItem value="CANCELLED">{t("adminKiosk.cancelled")}</SelectItem>
            </SelectContent>
          </Select>

          <ReloadButton onReload={() => void loadData(true)} isLoading={isReloading} size="sm" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4 sm:px-6 sm:py-6">
        <BookingTable
          bookings={paginatedBookings}
          onViewDetails={handleViewDetails}
          onAssignMentor={handleAssignMentor}
          isLoading={isInitialLoading}
        />
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="border-border bg-card border-t px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">
              {t("common.showing")} {(pagination.currentPage - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} /{" "}
              {pagination.totalCount} {t("common.results")}
            </span>
            <PaginationControl pagination={pagination} />
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <BookingDetailDialog onOpenChange={setIsViewDialogOpen} booking={selectedBooking} />

      {/* Assign Mentor Dialog */}
      <AssignMentorDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        booking={selectedBooking}
        mentors={mentors}
        isLoading={isAssigning}
        onAssign={handleAssign}
      />
    </div>
  );
}
