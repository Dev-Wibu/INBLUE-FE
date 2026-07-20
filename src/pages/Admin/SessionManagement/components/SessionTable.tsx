import { SortButton, type SortDirection } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { getSessionStatusBadge } from "@/lib/status-utils";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Session } from "../types";

interface SortProps {
  direction: SortDirection;
  onChange: (direction: SortDirection) => void;
}

interface SessionTableProps {
  sessions: Session[];
  onView: (session: Session) => void;
  getSortProps?: (key: keyof Session | "startTimeSortValue") => SortProps;
}

const formatDuration = (seconds?: number, minutes?: number) => {
  if (typeof minutes === "number" && minutes > 0) {
    return `${minutes}p`;
  }
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutesFromSeconds = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}g ${minutesFromSeconds}p`;
  }
  return `${minutesFromSeconds}p`;
};

export function SessionTable({ sessions, onView, getSortProps }: SessionTableProps) {
  const { t, i18n } = useTranslation();

  if (sessions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Search className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-500">
          {t("adminSessionmanagement.noLessonsFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-16">{t("common.id")}</TableHead>
            <TableHead>{t("common.roomName1")}</TableHead>
            <TableHead className="w-24">{t("general.userId1")}</TableHead>
            <TableHead className="w-24">{t("common.idMentor")}</TableHead>
            <TableHead>
              {getSortProps ? (
                <SortButton {...getSortProps("startTimeSortValue")}>
                  {t("adminSessionmanagement.startTime")}
                </SortButton>
              ) : (
                t("adminSessionmanagement.startTime")
              )}
            </TableHead>
            <TableHead>{t("adminSessionmanagement.meetingTime")}</TableHead>
            <TableHead className="w-24">{t("common.duration")}</TableHead>
            <TableHead className="w-36">{t("adminSessionmanagement.totalPrice")} (VNĐ)</TableHead>
            <TableHead className="w-28">
              {getSortProps ? (
                <SortButton {...getSortProps("status")}>{t("common.status")}</SortButton>
              ) : (
                t("common.status")
              )}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow
              key={session.id}
              onClick={() => onView(session)}
              className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <TableCell className="font-medium">{session.id}</TableCell>
              <TableCell className="max-w-xs truncate font-medium">
                {session.roomName || "-"}
              </TableCell>
              <TableCell>
                {session.userId ? (
                  <Badge
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
                    #{session.userId}
                  </Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                {session.userId2 ? (
                  <Badge
                    variant="outline"
                    className="border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/50 dark:bg-teal-900/20 dark:text-teal-300">
                    #{session.userId2}
                  </Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                {formatDateTime(treatZuluAsVietnamLocal(session.startTime1))}
              </TableCell>
              <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                {formatDateTime(session.joinTime)}
              </TableCell>
              <TableCell>{formatDuration(session.durationSeconds1, session.duration)}</TableCell>
              <TableCell>
                {session.totalPrice != null
                  ? new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "vi-VN").format(
                      session.totalPrice
                    )
                  : "-"}
              </TableCell>
              <TableCell>
                {(() => {
                  const statusConfig = getSessionStatusBadge(session.status);
                  return (
                    <Badge variant={statusConfig.variant} className={statusConfig.className}>
                      {statusConfig.label}
                    </Badge>
                  );
                })()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
