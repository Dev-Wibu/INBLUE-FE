import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type KioskBookingStatus =
  | "AWAITING_MENTOR"
  | "MENTOR_ASSIGNED"
  | "ROOM_CREATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

interface BadgeLook {
  className: string;
  dotClassName: string;
}

const STATUS_LOOK: Record<NonNullable<KioskBookingStatus>, BadgeLook> = {
  AWAITING_MENTOR: {
    className:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/60",
    dotClassName: "bg-amber-500 dark:bg-amber-300",
  },
  MENTOR_ASSIGNED: {
    className:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/60",
    dotClassName: "bg-blue-500 dark:bg-blue-300",
  },
  ROOM_CREATED: {
    className:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/60",
    dotClassName: "bg-emerald-500 dark:bg-emerald-300",
  },
  IN_PROGRESS: {
    className:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/60",
    dotClassName: "bg-purple-500 dark:bg-purple-300",
  },
  COMPLETED: {
    className:
      "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/60",
    dotClassName: "bg-slate-500 dark:bg-slate-400",
  },
  CANCELLED: {
    className:
      "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/60",
    dotClassName: "bg-rose-500 dark:bg-rose-300",
  },
};

const ADMIN_STATUS_LABEL_KEYS: Record<NonNullable<KioskBookingStatus>, string> = {
  AWAITING_MENTOR: "adminKiosk.pending",
  MENTOR_ASSIGNED: "adminKiosk.mentorAssigned",
  ROOM_CREATED: "adminKiosk.roomCreated",
  IN_PROGRESS: "adminKiosk.inProgress",
  COMPLETED: "adminKiosk.completed",
  CANCELLED: "adminKiosk.cancelled",
};

const USER_STATUS_LABEL_KEYS: Record<NonNullable<KioskBookingStatus>, string> = {
  AWAITING_MENTOR: "userKiosk.statusAwaitingMentor",
  MENTOR_ASSIGNED: "userKiosk.statusMentorAssigned",
  ROOM_CREATED: "userKiosk.statusRoomCreated",
  IN_PROGRESS: "userKiosk.statusInProgress",
  COMPLETED: "userKiosk.statusCompleted",
  CANCELLED: "userKiosk.statusCancelled",
};

export interface KioskStatusBadgeProps {
  status?: KioskBookingStatus | null | undefined;
  variant?: "admin" | "user";
  className?: string;
  withDot?: boolean;
}

export function KioskStatusBadge({
  status,
  variant = "admin",
  className,
  withDot = true,
}: KioskStatusBadgeProps) {
  const { t } = useTranslation();
  const key = (status ?? "AWAITING_MENTOR") as NonNullable<KioskBookingStatus>;
  const look = STATUS_LOOK[key] ?? STATUS_LOOK.AWAITING_MENTOR;
  const labelKey =
    variant === "user"
      ? (USER_STATUS_LABEL_KEYS[key] ?? USER_STATUS_LABEL_KEYS.AWAITING_MENTOR)
      : (ADMIN_STATUS_LABEL_KEYS[key] ?? ADMIN_STATUS_LABEL_KEYS.AWAITING_MENTOR);

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        look.className,
        className
      )}>
      {withDot && (
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", look.dotClassName)} />
      )}
      <span>{t(labelKey)}</span>
    </span>
  );
}
