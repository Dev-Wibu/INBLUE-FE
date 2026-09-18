import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAssignedMentors, type MentorResponse } from "@/hooks/useApplicationDetails";
import { useMentorById } from "@/hooks/useMentor";
import { formatDateTime } from "@/lib/formatting";
import { CalendarX2, MessageSquareX } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { components } from "../../../../../../schema-from-be";
import { mergeMentorResponses } from "./mentorReview.utils";

type ScheduleHistoryEntry = components["schemas"]["ScheduleHistoryEntry"];

export function ScheduleHistoryTable({
  entries,
  detailId,
  fallbackMentors,
}: {
  entries: ScheduleHistoryEntry[];
  detailId: number;
  fallbackMentors: MentorResponse[];
}) {
  const { t } = useTranslation();
  const { data: assignedMentors, isLoading: assignedMentorsLoading } = useAssignedMentors(detailId);
  const mentors = useMemo(
    () => mergeMentorResponses(fallbackMentors, assignedMentors),
    [fallbackMentors, assignedMentors]
  );
  const sortedEntries = [...entries].sort((a, b) =>
    (b.occurredAt ?? "").localeCompare(a.occurredAt ?? "")
  );

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t("mentorSchedule.historyTitle")}
        </h3>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {entries.length}
        </span>
      </div>
      <Table className="md:min-w-[780px]">
        <TableHeader className="hidden md:table-header-group">
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/40">
            <TableHead className="w-[230px] pl-5 text-xs text-slate-600 dark:text-slate-300">
              {t("mentorSchedule.historyEvent")}
            </TableHead>
            <TableHead className="w-[230px] text-xs text-slate-600 dark:text-slate-300">
              {t("mentorSchedule.historyMentor")}
            </TableHead>
            <TableHead className="min-w-[180px] text-xs text-slate-600 dark:text-slate-300">
              {t("mentorSchedule.historyReason")}
            </TableHead>
            <TableHead className="w-[165px] pr-5 text-right text-xs text-slate-600 dark:text-slate-300">
              {t("mentorSchedule.historyTime")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map((entry, index) => (
            <ScheduleHistoryRow
              key={`${entry.occurredAt ?? "event"}-${index}`}
              entry={entry}
              mentor={mentors.find((item) => item.id === entry.mentorId)}
              assignedMentorsLoading={assignedMentorsLoading}
            />
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function ScheduleHistoryRow({
  entry,
  mentor,
  assignedMentorsLoading,
}: {
  entry: ScheduleHistoryEntry;
  mentor?: MentorResponse;
  assignedMentorsLoading: boolean;
}) {
  const { t } = useTranslation();
  const mentorId = entry.mentorId ?? 0;
  const fallbackLookupId = mentor || assignedMentorsLoading ? 0 : mentorId;
  const { data: fetchedMentor, isLoading: mentorLoading } = useMentorById(fallbackLookupId);
  const resolvedMentor = mentor ?? fetchedMentor;
  const mentorName = resolvedMentor?.name?.trim();
  const isRejected = entry.type === "MENTOR_REJECTED";

  return (
    <TableRow className="block px-4 py-3 hover:bg-slate-50/70 md:table-row md:px-0 md:py-0 dark:hover:bg-slate-800/40">
      <TableCell className="block p-0 whitespace-normal md:table-cell md:p-2 md:pl-5">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
          {isRejected ? (
            <MessageSquareX className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CalendarX2 className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          {isRejected
            ? t("mentorSchedule.mentorRejectedEvent")
            : t("mentorSchedule.historyCandidateCanceled")}
        </span>
      </TableCell>
      <TableCell className="mt-3 block p-0 whitespace-normal md:table-cell md:p-2">
        <span className="mb-1 block text-xs text-slate-500 md:hidden dark:text-slate-400">
          {t("mentorSchedule.historyMentor")}
        </span>
        {mentorId > 0 ? (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 shrink-0 rounded-md">
              <AvatarImage src={resolvedMentor?.avatarUrl} alt={mentorName ?? ""} />
              <AvatarFallback className="rounded-md bg-slate-100 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {(mentorName || "M").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              {mentorName ? (
                <Link
                  to={`/user/mentors/${mentorId}`}
                  className="text-sm font-medium text-slate-900 hover:text-indigo-600 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-100 dark:hover:text-indigo-400">
                  {mentorName}
                </Link>
              ) : (
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {assignedMentorsLoading || mentorLoading
                    ? t("mentorSchedule.mentorLoading")
                    : t("mentorSchedule.mentorIdLabel", { id: mentorId })}
                </p>
              )}
              {resolvedMentor?.currentCompany && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {resolvedMentor.currentCompany}
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t("mentorSchedule.mentorUnknown")}
          </span>
        )}
      </TableCell>
      <TableCell className="mt-3 block max-w-[420px] p-0 text-sm break-words whitespace-normal text-slate-700 md:table-cell md:p-2 dark:text-slate-300">
        <span className="mr-1 text-xs text-slate-500 md:hidden dark:text-slate-400">
          {t("mentorSchedule.historyReason")}:
        </span>
        {entry.reason?.trim() || t("mentorSchedule.historyNoReason")}
      </TableCell>
      <TableCell className="mt-2 block p-0 text-left text-xs whitespace-nowrap text-slate-600 md:table-cell md:p-2 md:pr-5 md:text-right dark:text-slate-300">
        <span className="mr-1 md:hidden">{t("mentorSchedule.historyTime")}:</span>
        {entry.occurredAt ? formatDateTime(entry.occurredAt) : "—"}
      </TableCell>
    </TableRow>
  );
}
