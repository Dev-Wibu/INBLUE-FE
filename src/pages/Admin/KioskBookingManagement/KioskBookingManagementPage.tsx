import { PaginationControl, ReloadButton } from "@/components/shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { kioskBookingManager } from "@/services/kiosk-booking.manager";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AssignMentorDialog, BookingDetailDialog, BookingTable } from "./components";
import { usePagination } from "@/hooks/usePagination";
import type {
  EnrichedKioskBooking,
  KioskBooking,
  Mentor,
  StatusFilter,
} from "./types";

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

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<EnrichedKioskBooking | null>(null);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return enrichedBookings.filter((booking) => {
      // Status filter
      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false;
      }

      // Search filter
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

  // Pagination
  const pageSize = 10;
  const pagination = usePagination({
    totalCount: filteredBookings.length,
    pageSize,
    initialPage: 1,
  });

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredBookings.slice(start, start + pagination.pageSize);
  }, [filteredBookings, pagination.currentPage, pagination.pageSize]);

  const loadData = useCallback(async (showReloading = false) => {
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
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Enrich bookings with user, job, kiosk info
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

  // Reset page when filters change
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
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* Toolbar */}
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("adminKiosk.bookingRequests")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("adminKiosk.managingBookingRequests")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("adminKiosk.searchByUserOrJob")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-40">
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

          {/* Reload */}
          <ReloadButton
            onReload={() => void loadData(true)}
            isLoading={isReloading}
            size="sm"
          />
        </div>
      </div>

      {/* Table content */}
      <div className="flex-1 overflow-auto p-4 sm:px-6">
        <BookingTable
          bookings={paginatedBookings}
          onViewDetails={handleViewDetails}
          onAssignMentor={handleAssignMentor}
          isLoading={isInitialLoading}
        />
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500">
              {t("common.showing")} {(pagination.currentPage - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} /{" "}
              {pagination.totalCount} {t("common.results")}
            </span>
            <PaginationControl pagination={pagination} />
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <BookingDetailDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        booking={selectedBooking}
      />

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
