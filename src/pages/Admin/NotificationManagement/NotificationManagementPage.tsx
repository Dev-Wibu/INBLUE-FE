import { useTranslation } from "react-i18next";
/**
 * Admin Notification Management Page
 * Allows admin to view all notifications and send system notifications.
 *
 * Step 1 upgrades (per PLAN.md):
 * - Searchable Autocomplete for recipient picker (Popover + Command)
 * - Notification templates for quick-fill
 * - Message preview panel
 * - Strict form validation (send button disabled until all fields filled)
 * - Local notification history stored in localStorage for admin reference
 *
 * Step 3 (per PLAN.md):
 * - Removed Delete button (BE does not support delete notification API)
 */

import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SpinnerBlock } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TimeAgo } from "@/components/ui/time-ago";
import { useCreateNotification, type Notification } from "@/hooks/useNotification";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";

import { cn } from "@/lib/utils";
import { notificationManager } from "@/services/notification.manager";
import { usersAdminManager } from "@/services/users-admin.manager";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ChevronsUpDown, Eye, Search, Send } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

// ---------- Notification templates ----------

interface NotificationTemplate {
  label: string;
  title: string;
  message: string;
}
// ---------- Recipient combobox ----------

interface RecipientComboboxProps {
  users: Array<{
    id?: number;
    name?: string;
    email?: string;
  }>;
  value: string;
  onChange: (value: string) => void;
}
function RecipientCombobox({ users, value, onChange }: RecipientComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selectedUser = users.find((u) => String(u.id) === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal">
          {selectedUser ? (
            <span className="flex items-center gap-2 truncate">
              <span className="truncate font-medium">{selectedUser.name}</span>
              <span className="shrink-0 text-xs text-slate-500">({selectedUser.email})</span>
            </span>
          ) : (
            <span className="text-slate-500">
              {t("adminNotificationmanagement.searchForRecipients")}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={t("adminNotificationmanagement.searchByNameOrEmail")} />
          <CommandList>
            <CommandEmpty>{t("adminNotificationmanagement.userNotFound")}</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.email}`}
                  onSelect={() => {
                    onChange(String(user.id));
                    setOpen(false);
                  }}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === String(user.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium">{user.name}</span>
                  <span className="ml-1.5 text-xs text-slate-500">({user.email})</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------- Notification preview ----------

interface NotificationPreviewProps {
  title: string;
  message: string;
  recipientName?: string;
}
function NotificationPreview({ title, message, recipientName }: NotificationPreviewProps) {
  const { t } = useTranslation();
  if (!title && !message) return null;
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
      <p className="mb-2 text-xs font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
        {t("adminNotificationmanagement.previewNotifications")}
        {recipientName && (
          <span className="ml-1 font-normal text-slate-500 normal-case">
            {t("adminNotificationmanagement.sentTo")} {recipientName}
          </span>
        )}
      </p>
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600">
          <Bell className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          {title && (
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
          )}
          {message && (
            <p className="mt-0.5 text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-300">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Main page ----------

export function NotificationManagementPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
    {
      label: t("adminNotificationmanagement.violationWarning"),
      title: t("adminNotificationmanagement.warningFromTheSystem"),
      message: t("adminNotificationmanagement.yourAccountHasBeenRecorded"),
    },
    {
      label: t("adminNotificationmanagement.systemUpdate"),
      title: t("adminNotificationmanagement.systemUpdateNotification"),
      message: t("adminNotificationmanagement.theSystemWillBeMaintained"),
    },
    {
      label: t("adminNotificationmanagement.welcomeNewMembers"),
      title: t("adminNotificationmanagement.welcomeToInblueAi"),
      message: t("adminNotificationmanagement.thankYouForRegisteringAn"),
    },
    {
      label: t("adminNotificationmanagement.paymentReminder"),
      title: t("adminNotificationmanagement.servicePackagePaymentReminder"),
      message: t("adminNotificationmanagement.yourServicePackageWillExpire"),
    },
    {
      label: t("adminNotificationmanagement.interviewSessionApproved"),
      title: t("adminNotificationmanagement.yourInterviewSessionHasBeen"),
      message: t("adminNotificationmanagement.mentorHasConfirmedTheInterview"),
    },
  ];

  // Load users first: the backend exposes notifications per user, not globally.
  const {
    data: users = [],
    isLoading: usersLoading,
    isRefetching: usersRefetching,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["admin", "users", "all"],
    queryFn: async () => {
      const response = await usersAdminManager.getAll();
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          return response.data;
        }
        if ("data" in response.data) {
          return response.data.data || [];
        }
      }
      return [];
    },
  });

  const userIds = useMemo(
    () => users.map((user) => user.id).filter((id): id is number => typeof id === "number"),
    [users]
  );

  const {
    data: allNotifications = [],
    isLoading: notificationsLoading,
    isRefetching: notificationsRefetching,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ["admin", "notifications", "all", userIds],
    queryFn: async (): Promise<Notification[]> => {
      const response = await notificationManager.getByUserIds(userIds);
      return response.success && response.data ? response.data : [];
    },
    enabled: !usersLoading,
  });
  const { mutate: createNotification, isPending: isCreating } = useCreateNotification();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    userId: "",
    title: "",
    message: "",
  });
  const isLoading = notificationsLoading || usersLoading;
  const isReloading = notificationsRefetching || usersRefetching;
  const handleReload = useCallback(async () => {
    await Promise.all([refetchNotifications(), refetchUsers()]);
  }, [refetchNotifications, refetchUsers]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((notification: Notification) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          notification.title?.toLowerCase().includes(query) ||
          notification.message?.toLowerCase().includes(query) ||
          notification.user?.name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter === "read" && !notification.isRead) return false;
      if (statusFilter === "unread" && notification.isRead) return false;
      return true;
    });
  }, [allNotifications, searchQuery, statusFilter]);
  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== "all";

  // Sorting
  const { sortedData, getSortProps } = useSortable(filteredNotifications);

  // Pagination

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_notificationmanagement_notificationmanagementpage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({
    totalCount: sortedData.length,
    pageSize,
  });

  // Get current page data
  const pageData = useMemo(() => {
    return sortedData.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [sortedData, pagination.startIndex, pagination.endIndex]);

  const handleViewDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailOpen(true);
  };
  const handleCreateOpen = () => {
    setCreateForm({
      userId: "",
      title: "",
      message: "",
    });
    setIsCreateOpen(true);
  };
  const handleCreateSubmit = () => {
    if (!createForm.userId || !createForm.title || !createForm.message) {
      toast.error(t("adminNotificationmanagement.pleaseFillInAllInformation"));
      return;
    }
    createNotification(
      {
        userId: Number(createForm.userId),
        title: createForm.title,
        message: createForm.message,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          queryClient.invalidateQueries({
            queryKey: ["admin", "notifications", "all"],
          });
        },
      }
    );
  };
  return (
    <div
      className={cn(
        "flex flex-col bg-slate-50 dark:bg-slate-950",
        "-m-4 min-h-[calc(100%+32px)] md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)]"
      )}>
      <div className={cn("flex flex-col bg-slate-50 dark:bg-slate-950", "flex-1 overflow-hidden")}>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("common.loading")} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
            {/* Stat Summary & Control Card (matching User/Mentor pages) */}
            <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("adminNotificationmanagement.notificationManagement")}
                  </h2>
                  <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                    {t("adminNotificationmanagement.viewAllNotificationsAndSend")}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-5 sm:gap-6">
                  {[
                    [
                      allNotifications.length,
                      t("adminNotificationmanagement.totalNotifications", "Tổng thông báo"),
                    ],
                    [
                      allNotifications.filter((n) => !n.isRead).length,
                      t("common.haventReadYet", "Chưa đọc"),
                    ],
                    [allNotifications.filter((n) => n.isRead).length, t("common.read", "Đã đọc")],
                  ].map(([value, label], index) => (
                    <div key={String(label)} className="flex items-center gap-5 sm:gap-6">
                      {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                      <div className="flex min-w-[78px] flex-col items-center justify-center text-center">
                        <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-sky-400">
                          {value}
                        </span>
                        <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                          {label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search & Create button row (matching User/Mentor pattern) */}
              <form
                onSubmit={(event) => event.preventDefault()}
                className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="text"
                    placeholder={t("adminNotificationmanagement.searchByTitleContentRecipient")}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      pagination.goToFirstPage();
                    }}
                    className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Search className="mr-2 h-[18px] w-[18px]" />
                  {t("common.search", "Tìm kiếm")}
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateOpen}
                  className="h-[46px] shrink-0 rounded-xl border border-indigo-600 bg-indigo-600 px-6 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                  <Send className="mr-2 h-[18px] w-[18px]" />
                  {t("adminNotificationmanagement.sendNotification")}
                </Button>
              </form>

              {/* Status filter pills (matching User/Mentor pattern) */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  {t("common.status", "Trạng thái")}:
                </span>
                {[
                  ["all", t("common.allStatus", "Tất cả")],
                  ["unread", t("common.haventReadYet", "Chưa đọc")],
                  ["read", t("common.read", "Đã đọc")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(value);
                      pagination.goToFirstPage();
                    }}
                    className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                      statusFilter === value
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90 dark:text-white dark:shadow-indigo-500/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    }`}>
                    {label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <ReloadButton
                    onReload={handleReload}
                    isLoading={isReloading}
                    tooltip={t("adminNotificationmanagement.reloadNotificationData")}
                    className="h-8 w-8"
                  />
                </div>
              </div>
            </div>

            {/* Table Card Container */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {pageData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Bell className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    {t("adminNotificationmanagement.thereAreNoNotificationsMatchingThe")}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        pagination.goToFirstPage();
                      }}>
                      {t("common.clearFilter")}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="w-16 pl-6 font-medium text-slate-500">
                          {t("common.id")}
                        </TableHead>
                        <TableHead className="font-medium text-slate-500">
                          {t("general.recipient")}
                        </TableHead>
                        <TableHead className="font-medium text-slate-500">
                          {t("common.title")}
                        </TableHead>
                        <TableHead className="font-medium text-slate-500">
                          {t("common.content")}
                        </TableHead>
                        <TableHead className="w-24 font-medium text-slate-500">
                          <SortButton {...getSortProps("isRead" as keyof Notification)}>
                            {t("common.status")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-40 font-medium text-slate-500">
                          <SortButton {...getSortProps("createAt" as keyof Notification)}>
                            {t("common.time")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-24 pr-6 text-right font-medium text-slate-500">
                          {t("common.operation")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((notification: Notification) => (
                        <TableRow
                          key={notification.id}
                          onClick={() => handleViewDetail(notification)}
                          className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                          <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <span>#{notification.id}</span>
                              {/* Dummy element to force row height alignment */}
                              <div
                                className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                                aria-hidden="true">
                                <div className="h-3.5 w-3.5"></div>
                                <div className="h-3.5 w-3.5"></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={notification.user?.avatarUrl} />
                                <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  {notification.user?.name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {notification.user?.name || t("common.noDataAvailable")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{notification.title}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-500">
                            {notification.message}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={notification.isRead ? "secondary" : "default"}
                              className={notification.isRead ? "" : "bg-blue-600 text-white"}>
                              {notification.isRead ? t("common.read") : t("common.haventReadYet")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {notification.createAt ? (
                              <TimeAgo date={notification.createAt} />
                            ) : (
                              <span>—</span>
                            )}
                          </TableCell>
                          <TableCell
                            className="pr-6 text-right"
                            onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                              onClick={() => handleViewDetail(notification)}>
                              <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {sortedData.length > 0 && (
                    <div className="flex flex-none items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-t-slate-800 dark:bg-slate-900">
                      <PaginationControl
                        pagination={pagination}
                        showBoundaryButtons={false}
                        showPageJump={false}
                        onPageSizeChange={(nextPageSize) => {
                          setPageSize(nextPageSize);
                          pagination.goToFirstPage();
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* View Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("adminNotificationmanagement.notificationDetails")}
              {selectedNotification?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-500">{t("general.recipient")}</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedNotification.user?.avatarUrl} />
                    <AvatarFallback>
                      {selectedNotification.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{selectedNotification.user?.name}</span>
                </div>
              </div>
              <div>
                <Label className="text-slate-500">{t("common.title")}</Label>
                <p className="font-medium">{selectedNotification.title}</p>
              </div>
              <div>
                <Label className="text-slate-500">{t("common.content")}</Label>
                <p className="whitespace-pre-wrap">{selectedNotification.message}</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-slate-500">{t("common.status")}</Label>
                  <Badge variant={selectedNotification.isRead ? "secondary" : "default"}>
                    {selectedNotification.isRead ? t("common.read") : t("common.haventReadYet")}
                  </Badge>
                </div>
                <div>
                  <Label className="text-slate-500">{t("common.time")}</Label>
                  <p>
                    {selectedNotification.createAt ? (
                      <TimeAgo date={selectedNotification.createAt} />
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Notification Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {t("adminNotificationmanagement.sendNewNotification")}
            </DialogTitle>
            <DialogDescription>
              {t("adminNotificationmanagement.sendNotificationsToSpecificUsers")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Template picker */}
            <div>
              <Label>{t("adminNotificationmanagement.chooseFromTemplateOptional")}</Label>
              <Select
                onValueChange={(value) => {
                  const template = NOTIFICATION_TEMPLATES.find((t) => t.label === value);
                  if (template) {
                    setCreateForm((prev) => ({
                      ...prev,
                      title: template.title,
                      message: template.message,
                    }));
                  }
                }}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("adminNotificationmanagement.selectNotificationTemplate")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TEMPLATES.map((t) => (
                    <SelectItem key={t.label} value={t.label}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Recipient searchable combobox */}
            <div>
              <Label>{t("adminNotificationmanagement.receiver")}</Label>
              <RecipientCombobox
                users={users}
                value={createForm.userId}
                onChange={(value) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    userId: value,
                  }))
                }
              />
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="notify-title">{t("common.title1")}</Label>
              <Input
                id="notify-title"
                placeholder={t("adminNotificationmanagement.enterTheNotificationTitle")}
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
              />
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="notify-message">{t("common.content1")}</Label>
              <Textarea
                id="notify-message"
                placeholder={t("adminNotificationmanagement.enterNotificationContent")}
                rows={4}
                value={createForm.message}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
              />
            </div>

            {/* Preview */}
            <NotificationPreview
              title={createForm.title}
              message={createForm.message}
              recipientName={
                users.find((u: { id?: number }) => String(u.id) === createForm.userId)?.name
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              {t("general.cancel")}
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={
                isCreating ||
                !createForm.userId ||
                !createForm.title.trim() ||
                !createForm.message.trim()
              }>
              {isCreating
                ? t("adminNotificationmanagement.sending")
                : t("adminNotificationmanagement.sendNotification")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
