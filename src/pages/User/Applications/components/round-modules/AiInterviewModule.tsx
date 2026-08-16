import { SlotCalendar, type SlotCalendarSlot } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useInterviewSession, useInterviewSessionsByUser } from "@/hooks/useInterviewSession";
import {
  useActiveKiosks,
  useKioskBookingByApplicationDetail,
  useKioskSlots,
  usePickKioskSlot,
} from "@/hooks/useKiosk";
import { normalizeAiInterviewScore } from "@/lib/ai-interview-score";
import { formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { kioskManager, type Kiosk, type KioskSchedule } from "@/services/kiosk.manager";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Bot,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Cpu,
  FileCode,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Laptop,
  Layers,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  Mic,
  Minimize2,
  RadioTower,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Tag,
  TrendingUp,
  User,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";
import type { JdInfoPayload } from "../RoundWorkspaceDispatcher";
import { localizeRoundInstruction } from "./round-localization";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];
type KioskBooking = components["schemas"]["KioskBooking"];

interface AiInterviewModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  jdInfo?: JdInfoPayload | null;
  isCompleted: boolean;
  isCurrent: boolean;
  /** When true, kiosk booking hooks are disabled and staff-only status messaging is shown */
  isStaffView?: boolean;
  onSuccess?: () => void;
}

const DAY_LABELS: Record<NonNullable<KioskSchedule["dayOfWeek"]>, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const WEEK_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const satisfies readonly NonNullable<KioskSchedule["dayOfWeek"]>[];

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDurationMinutes(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return Math.round((endMs - startMs) / 60000);
}

function formatHourMinute(value?: string): string {
  if (!value) return "--:--";
  const timeMatch = value.match(/(\d{2}):(\d{2})/);
  if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Linear/Stripe Style Modern Circular SVG Gauge Clock */
function ModernGaugeClock({
  score,
  displayScoreText,
  label,
  color = "indigo",
  hasData = true,
}: {
  score: number;
  displayScoreText?: string;
  label: string;
  color?: "indigo" | "emerald";
  hasData?: boolean;
}) {
  const radius = 41;
  const circumference = 2 * Math.PI * radius;
  const displayScore = hasData ? Math.min(100, Math.max(0, score)) : 0;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const styles =
    color === "emerald"
      ? {
          ring: "text-emerald-500 dark:text-emerald-400",
          text: "text-emerald-600 dark:text-emerald-400",
          bg: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-950/20",
        }
      : {
          ring: "text-indigo-500 dark:text-indigo-400",
          text: "text-indigo-600 dark:text-indigo-400",
          bg: "border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/20 dark:bg-indigo-950/20",
        };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all",
        styles.bg
      )}>
      <div className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            className="text-slate-200 dark:text-slate-800"
            fill="transparent"
          />
          {hasData && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              className={cn(styles.ring, "transition-all duration-1000 ease-out")}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
          <span
            className={cn(
              "text-lg font-black tracking-tight sm:text-xl",
              hasData ? styles.text : "text-slate-400 dark:text-slate-600"
            )}>
            {hasData ? (displayScoreText ?? `${Math.round(displayScore)}%`) : "--"}
          </span>
          <span className="mt-0.5 text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className="font-bold text-slate-900 dark:text-white">
          {inner}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Renders Markdown-formatted feedback text cleanly with proper linebreaks,
 * section headers (**1. Title:**), bold inline text (**text**), and bulleted lists (- item).
 */
export function FormattedMarkdownText({
  content,
  className,
}: {
  content?: string | null;
  className?: string;
}) {
  if (!content) return null;

  const paragraphs = content.split(/\r?\n\r?\n/);

  return (
    <div
      className={cn(
        "space-y-3.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200",
        className
      )}>
      {paragraphs.map((para, pIdx) => {
        const lines = para.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) return null;

        const isBulletBlock = lines.every((l) => /^[-*]\s+/.test(l.trim()));

        if (isBulletBlock) {
          return (
            <ul key={pIdx} className="my-2 space-y-2 pl-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.trim().replace(/^[-*]\s+/, "");
                return (
                  <li key={lIdx} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                    <span className="flex-1">{renderInlineMarkdown(cleanLine)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <div key={pIdx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();

              if (/^[-*]\s+/.test(trimmed)) {
                const cleanLine = trimmed.replace(/^[-*]\s+/, "");
                return (
                  <div key={lIdx} className="my-1 flex items-start gap-2.5 pl-1">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                    <span className="flex-1">{renderInlineMarkdown(cleanLine)}</span>
                  </div>
                );
              }

              const isHeading =
                /^\*\*\d+\..*\*\*$/.test(trimmed) ||
                /^\d+\.\s+\*\*.*:\*\*$/.test(trimmed) ||
                /^\*\*\d+\..*:\*\*/.test(trimmed);

              if (isHeading) {
                return (
                  <div
                    key={lIdx}
                    className="mt-3.5 mb-1 flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                    {renderInlineMarkdown(trimmed)}
                  </div>
                );
              }

              return (
                <p key={lIdx} className="leading-relaxed whitespace-pre-wrap">
                  {renderInlineMarkdown(trimmed)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function AiInterviewSubheader({
  round,
  isCompleted,
  status,
  finalResult,
  sessionResult,
}: {
  round: JdRound;
  aiScore?: number | null;
  hrScore?: number | null;
  finalScore?: number | null;
  isCompleted: boolean;
  status?: string | null;
  finalResult?: string | null;
  sessionResult?: string | null;
}) {
  const { t } = useTranslation();
  const roundOrder = round.roundOrder ?? 7;

  // Determine effective verdict from sessionData or finalResult
  const effectiveResult = useMemo(() => {
    if (sessionResult) {
      if (sessionResult === "STRONG_HIRE" || sessionResult === "HIRE" || sessionResult === "PASSED")
        return "PASSED";
      if (sessionResult === "REJECT" || sessionResult === "FAILED") return "REJECT";
      if (sessionResult === "CONSIDER") return "CONSIDER";
      return sessionResult;
    }
    if (finalResult) {
      if (finalResult === "PASSED") return "PASSED";
      if (finalResult === "FAILED" || finalResult === "REJECT") return "REJECT";
      return finalResult;
    }
    return null;
  }, [sessionResult, finalResult]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("userApplication.aiInterview.aiInterviewTitle", { round: roundOrder })}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400">
              {t("userApplication.roundNumber", { number: roundOrder })}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t("userApplication.aiInterview.aiInterviewDescription")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {effectiveResult === "PASSED" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-2xs dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t("userApplication.aiInterview.resultPassed", "KẾT QUẢ: PASSED")}</span>
          </span>
        )}

        {effectiveResult === "REJECT" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-extrabold text-rose-700 shadow-2xs dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300">
            <X className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <span>{t("userApplication.aiInterview.resultReject", "KẾT QUẢ: REJECT")}</span>
          </span>
        )}

        {effectiveResult === "CONSIDER" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-extrabold text-amber-700 shadow-2xs dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>{t("userApplication.aiInterview.resultConsider", "KẾT QUẢ: CONSIDER")}</span>
          </span>
        )}

        {!effectiveResult &&
          (isCompleted || status === "COMPLETED" || status === "AI_EVALUATED") && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-2xs dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t("userApplication.aiInterview.resultCompleted", "KẾT QUẢ: HOÀN THÀNH")}</span>
            </span>
          )}

        {!isCompleted &&
          !effectiveResult &&
          status !== "COMPLETED" &&
          status !== "AI_EVALUATED" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-extrabold text-indigo-700 shadow-2xs dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300">
              <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />
              <span>{t("userApplication.aiInterview.bookKiosk")}</span>
            </span>
          )}
      </div>
    </div>
  );
}

function KioskCard({
  kiosk,
  selected,
  disabled,
  onSelect,
}: {
  kiosk: Kiosk;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group flex h-full min-h-[92px] flex-col rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-indigo-400 bg-indigo-50/80 dark:border-indigo-500/70 dark:bg-indigo-950/30"
          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-indigo-800/70 dark:hover:bg-slate-900/70"
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              selected
                ? "border-indigo-300 bg-white text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200"
                : "border-slate-200 bg-slate-50 text-indigo-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-indigo-300"
            )}>
            <Laptop className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
              {kiosk.name ?? `Kiosk #${kiosk.id ?? "-"}`}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs leading-5 font-semibold text-slate-600 dark:text-slate-300">
              {kiosk.location ?? t("userApplication.aiInterview.locationNotUpdated")}
            </p>
          </div>
        </div>
        {selected && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
        )}
      </div>
      <div className="mt-auto flex items-center gap-1.5 pt-2.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
        <RadioTower className="h-3.5 w-3.5" />
        {kiosk.active === false
          ? t("userApplication.aiInterview.paused")
          : t("userApplication.aiInterview.active")}
      </div>
    </button>
  );
}

function ScheduleList({ schedules, loading }: { schedules: KioskSchedule[]; loading?: boolean }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {t("userApplication.aiInterview.scheduleLoading")}
      </div>
    );
  }

  const schedulesByDay = new Map<NonNullable<KioskSchedule["dayOfWeek"]>, KioskSchedule[]>();
  schedules.forEach((schedule) => {
    if (!schedule.dayOfWeek) return;
    const list = schedulesByDay.get(schedule.dayOfWeek) ?? [];
    list.push(schedule);
    schedulesByDay.set(schedule.dayOfWeek, list);
  });

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
      {WEEK_DAYS.map((day) => {
        const daySchedules = schedulesByDay.get(day) ?? [];
        const activeSchedules = daySchedules.filter((schedule) => schedule.active !== false);
        const hasSchedule = activeSchedules.length > 0;

        return (
          <div
            key={day}
            className={cn(
              "rounded-2xl border px-3 py-2.5",
              hasSchedule
                ? "border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/20"
                : "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40"
            )}>
            <p
              className={cn(
                "text-xs font-black",
                hasSchedule
                  ? "text-slate-950 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              )}>
              {DAY_LABELS[day]}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-extrabold tabular-nums",
                hasSchedule
                  ? "text-indigo-700 dark:text-indigo-200"
                  : "text-slate-400 dark:text-slate-500"
              )}>
              {(() => {
                if (hasSchedule) {
                  return activeSchedules
                    .map(
                      (schedule) =>
                        `${formatHourMinute(schedule.openTime)} - ${formatHourMinute(schedule.closeTime)}`
                    )
                    .join(", ");
                }
                return t("userApplication.aiInterview.closed", "Không mở");
              })()}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 py-3 last:border-b-0 dark:border-slate-800">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <span className="text-indigo-500 dark:text-indigo-300">{icon}</span>
        {label}
      </div>
      <span className="max-w-[55%] text-right text-sm font-extrabold text-slate-950 dark:text-white">
        {value}
      </span>
    </div>
  );
}

function KioskPinDialog({
  open,
  onOpenChange,
  booking,
  kiosk,
  duration,
  onCopy,
}: {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  booking: KioskBooking | null;
  kiosk: Kiosk | null;
  duration: number | null;
  onCopy: () => void;
}) {
  const { t } = useTranslation();
  const sessionKey = booking?.sessionKey ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-950 dark:text-white">
                {t("userApplication.aiInterview.bookingSuccess")}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("userApplication.aiInterview.bookingSuccessDesc")}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-center">
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-700 uppercase dark:text-emerald-300">
              {t("userApplication.aiInterview.pinCode")}
            </p>
            <p className="mt-3 font-mono text-4xl font-black tracking-[0.28em] text-emerald-800 dark:text-emerald-200">
              {sessionKey || "------"}
            </p>
            <Button
              type="button"
              onClick={onCopy}
              disabled={!sessionKey}
              className="mt-4 h-10 gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-extrabold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60">
              <Copy className="h-4 w-4" />
              {t("userApplication.aiInterview.copyPinCode")}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs font-bold text-slate-400">
                {t("userApplication.aiInterview.timeLabel")}
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                {booking?.scheduledStart
                  ? formatDateTime(booking.scheduledStart)
                  : t("userApplication.aiInterview.noData")}
              </p>
              <p className="mt-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                {duration != null
                  ? t("userApplication.aiInterview.minutes", { minutes: duration })
                  : t("userApplication.aiInterview.perSlot")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs font-bold text-slate-400">
                {t("userApplication.aiInterview.kioskStation")}
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                {kiosk?.name ??
                  (booking?.kioskId
                    ? `Kiosk #${booking.kioskId}`
                    : t("userApplication.aiInterview.noData"))}
              </p>
              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
                {kiosk?.location ?? t("userApplication.aiInterview.checkEmailForDetails")}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-6 text-indigo-800 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-100">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
            <p>
              {t(
                "userApplication.aiInterview.pinDialogNote",
                "Detailed information will also be sent via email or notification inbox. Good luck, stay calm, answer clearly, and arrive 10-15 minutes early."
              )}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CandidateProfileSnapshotView({
  profile,
}: {
  profile?: components["schemas"]["CandidateProfile"] | null;
}) {
  const { t } = useTranslation();

  if (!profile) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/40">
        <User className="h-9 w-9 text-slate-400" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t("userApplication.aiInterview.noDataYet")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Target Role & Introduction Card */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                  {profile.targetRole ?? "Candidate Profile"}
                </h3>
                {profile.targetLevel && (
                  <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-black text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                    {profile.targetLevel}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("userApplication.aiInterview.targetRoleAndLevel")}
              </p>
            </div>
          </div>
        </div>

        {profile.introduction && (
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
            <p className="mb-1.5 text-xs font-black tracking-wider text-slate-400 uppercase">
              {t("userApplication.aiInterview.introduction")}
            </p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              "{profile.introduction}"
            </p>
          </div>
        )}
      </Card>

      {/* Technical Skills & Tools Card */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
          <FileCode className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-base font-extrabold text-slate-950 dark:text-white">
            {t("userApplication.aiInterview.technicalSkills")} &{" "}
            {t("userApplication.aiInterview.tools")}
          </h4>
        </div>

        <div className="mt-5 space-y-6">
          {/* Technical Skills */}
          {profile.technicalSkills && profile.technicalSkills.length > 0 && (
            <div>
              <h5 className="mb-2.5 text-xs font-black tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t("userApplication.aiInterview.technicalSkills")}
              </h5>
              <div className="flex flex-wrap gap-2">
                {profile.technicalSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Soft Skills */}
          {profile.softSkills && profile.softSkills.length > 0 && (
            <div>
              <h5 className="mb-2.5 text-xs font-black tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t("userApplication.aiInterview.softSkills")}
              </h5>
              <div className="flex flex-wrap gap-2">
                {profile.softSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-lg bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tools */}
          {profile.tools && profile.tools.length > 0 && (
            <div>
              <h5 className="mb-2.5 flex items-center gap-1.5 text-xs font-black tracking-wider text-slate-500 uppercase dark:text-slate-400">
                <Wrench className="h-3.5 w-3.5 text-amber-500" />
                {t("userApplication.aiInterview.tools")}
              </h5>
              <div className="flex flex-wrap gap-2">
                {profile.tools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-lg bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Projects Section */}
      {profile.projects && profile.projects.length > 0 && (
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-base font-extrabold text-slate-950 dark:text-white">
              {t("userApplication.aiInterview.projects")} ({profile.projects.length})
            </h4>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {profile.projects.map((proj, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 transition-all hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-950/30 dark:hover:border-indigo-900/60">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {proj.name ?? `Project #${idx + 1}`}
                    </h5>
                    <div className="flex items-center gap-2">
                      {proj.role && (
                        <span className="rounded-md bg-indigo-100/80 px-2 py-0.5 text-xs font-extrabold text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                          {proj.role}
                        </span>
                      )}
                      {proj.teamSize != null && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {t("userApplication.aiInterview.teamSize", { size: proj.teamSize })}
                        </span>
                      )}
                    </div>
                  </div>

                  {proj.description && (
                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                      {proj.description}
                    </p>
                  )}

                  {proj.outcome && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        <strong className="font-semibold">
                          {t("userApplication.aiInterview.outcome")}:
                        </strong>{" "}
                        {proj.outcome}
                      </span>
                    </div>
                  )}
                </div>

                {proj.usedTools && proj.usedTools.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-200/60 pt-3 dark:border-slate-800/60">
                    {proj.usedTools.map((tool, tIdx) => (
                      <span
                        key={tIdx}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Work Experience Stream (Timeline style like /user/account) */}
      {profile.workExperiences && profile.workExperiences.length > 0 && (
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-base font-extrabold text-slate-950 dark:text-white">
              {t("userApplication.aiInterview.workExperiences")} ({profile.workExperiences.length})
            </h4>
          </div>

          <div className="mt-6 ml-3 space-y-6 border-l-2 border-slate-200 pl-6 dark:border-slate-800">
            {profile.workExperiences.map((exp, idx) => (
              <div key={idx} className="relative space-y-1">
                <div className="absolute top-1.5 -left-[31px] h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-2xs dark:border-slate-900" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {exp.position ?? "Position"}
                  </h5>
                  {exp.company && (
                    <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-extrabold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {exp.company}
                    </span>
                  )}
                </div>
                {exp.description && (
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Education & Certifications Side-by-Side */}
      <div className="grid gap-6 sm:grid-cols-2">
        {profile.educations && profile.educations.length > 0 && (
          <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-base font-extrabold text-slate-950 dark:text-white">
                {t("userApplication.aiInterview.educations")}
              </h4>
            </div>
            <div className="mt-4 space-y-3">
              {profile.educations.map((edu, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/30">
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {edu.school ?? "University"}
                  </p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {edu.major} {edu.degree ? `• ${edu.degree}` : ""}
                  </p>
                  {edu.gpa && (
                    <p className="mt-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                      GPA: {edu.gpa}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {profile.certifications && profile.certifications.length > 0 && (
          <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-base font-extrabold text-slate-950 dark:text-white">
                {t("userApplication.aiInterview.certifications")}
              </h4>
            </div>
            <div className="mt-4 space-y-2">
              {profile.certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{cert}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

type QuestionFilter = "ALL" | "HIGH" | "IMPROVE" | "BLUEPRINT" | "FOLLOW_UP";

function parseSuggestionText(suggestionStr?: string | null) {
  if (!suggestionStr) return null;

  let keywords: string[] = [];
  let structure: string[] = [];
  let seniorTip: string | null = null;
  const rawContent = suggestionStr;

  // Extract Keywords: ...
  const keywordsMatch = suggestionStr.match(/Keywords:\s*([^\n]+)/i);
  if (keywordsMatch) {
    keywords = keywordsMatch[1]
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }

  // Extract Senior Tip: ...
  const tipMatch = suggestionStr.match(/Senior Tip:\s*([^\n]+)/i);
  if (tipMatch) {
    seniorTip = tipMatch[1].trim();
  }

  // Extract Structure: ...
  const structMatch = suggestionStr.match(/Structure:\s*([\s\S]*?)(?=Senior Tip:|$)/i);
  if (structMatch) {
    structure = structMatch[1]
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.toLowerCase().startsWith("keywords:"));
  }

  return { keywords, structureSteps: structure, seniorTip, rawContent };
}

interface QuestionCluster {
  id: number;
  mainQuestion: components["schemas"]["QAResult"];
  followups: components["schemas"]["QAResult"][];
  allQuestions: components["schemas"]["QAResult"][];
  avgScore: number;
}

function AiInterviewQuestionsTab({
  questions = [],
}: {
  questions?: components["schemas"]["QAResult"][];
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<QuestionFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClusterIds, setExpandedClusterIds] = useState<Record<number, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(false);

  // Group questions into Topic Clusters (Blueprint Question + Follow-ups)
  const clusters = useMemo(() => {
    const list: QuestionCluster[] = [];
    let activeCluster: QuestionCluster | null = null;

    questions.forEach((q) => {
      const isBlueprint = !q.questionType || q.questionType.toUpperCase() === "BLUEPRINT";

      if (isBlueprint || !activeCluster) {
        if (activeCluster) {
          const total = activeCluster.allQuestions.reduce(
            (acc, item) => acc + (item.score ?? 0),
            0
          );
          activeCluster.avgScore = total / activeCluster.allQuestions.length;
          list.push(activeCluster);
        }
        activeCluster = {
          id: list.length + 1,
          mainQuestion: q,
          followups: [],
          allQuestions: [q],
          avgScore: q.score ?? 0,
        };
      } else {
        activeCluster.followups.push(q);
        activeCluster.allQuestions.push(q);
      }
    });

    if (activeCluster) {
      const total = (activeCluster as QuestionCluster).allQuestions.reduce(
        (acc, item) => acc + (item.score ?? 0),
        0
      );
      (activeCluster as QuestionCluster).avgScore =
        total / (activeCluster as QuestionCluster).allQuestions.length;
      list.push(activeCluster);
    }

    return list;
  }, [questions]);

  const toggleExpandCluster = (clusterId: number) => {
    setExpandedClusterIds((prev) => ({
      ...prev,
      [clusterId]: prev[clusterId] !== undefined ? !prev[clusterId] : true,
    }));
  };

  const handleToggleExpandAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const newExpanded: Record<number, boolean> = {};
    clusters.forEach((c) => {
      newExpanded[c.id] = nextState;
    });
    setExpandedClusterIds(newExpanded);
  };

  const highCount = useMemo(() => questions.filter((q) => (q.score ?? 0) >= 7).length, [questions]);
  const improveCount = useMemo(
    () => questions.filter((q) => (q.score ?? 0) < 7).length,
    [questions]
  );
  const blueprintCount = useMemo(
    () =>
      questions.filter((q) => !q.questionType || q.questionType.toUpperCase() === "BLUEPRINT")
        .length,
    [questions]
  );
  const followupCount = useMemo(
    () =>
      questions.filter((q) => q.questionType && q.questionType.toUpperCase() === "FOLLOW_UP")
        .length,
    [questions]
  );

  const filteredClusters = useMemo(() => {
    return clusters.filter((cluster) => {
      // Category filter check against questions in cluster
      let matchesFilter = true;
      if (filter === "HIGH") matchesFilter = cluster.allQuestions.some((q) => (q.score ?? 0) >= 7);
      else if (filter === "IMPROVE")
        matchesFilter = cluster.allQuestions.some((q) => (q.score ?? 0) < 7);
      else if (filter === "BLUEPRINT") matchesFilter = true;
      else if (filter === "FOLLOW_UP") matchesFilter = cluster.followups.length > 0;

      if (!matchesFilter) return false;

      // Search query filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return cluster.allQuestions.some((q) => {
        const qText = (q.questionText ?? "").toLowerCase();
        const aText = (q.answerText ?? "").toLowerCase();
        const fText = (q.feedback ?? "").toLowerCase();
        const sText = (q.suggestion ?? "").toLowerCase();
        return (
          qText.includes(query) ||
          aText.includes(query) ||
          fText.includes(query) ||
          sText.includes(query)
        );
      });
    });
  }, [clusters, filter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Top Search & Filter Toolbar */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60">
        {/* Search Input & Expand All Toggle */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={t(
                "userApplication.aiInterview.searchPlaceholder",
                "Search by topic, question, answer, keyword..."
              )}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border-slate-200 bg-slate-50/50 pr-9 pl-10 text-xs shadow-none transition-all placeholder:text-slate-400 focus:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-950/50 dark:focus:bg-slate-950"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label={t("userApplication.aiInterview.clearSearch", "Clear search")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800">
            {allExpanded ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-slate-500" />
                <span>{t("userApplication.aiInterview.collapseAll")}</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-indigo-500" />
                <span>
                  {t("userApplication.aiInterview.expandAll", {
                    count: clusters.length,
                  })}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
              filter === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800"
            )}>
            <span>
              {t("userApplication.aiInterview.filterAllQuestions", {
                count: questions.length,
              })}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("HIGH")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none",
              filter === "HIGH"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800"
            )}>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              {t("userApplication.aiInterview.filterHighScores", {
                count: highCount,
              })}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("IMPROVE")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none",
              filter === "IMPROVE"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800"
            )}>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>
              {t(
                "userApplication.aiInterview.filterNeedsImprovement",
                "Needs Work < 7 ({{count}})",
                { count: improveCount }
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("BLUEPRINT")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
              filter === "BLUEPRINT"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800"
            )}>
            <span>
              {t("userApplication.aiInterview.filterBlueprint", {
                count: blueprintCount,
              })}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("FOLLOW_UP")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
              filter === "FOLLOW_UP"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800"
            )}>
            <span>
              {t("userApplication.aiInterview.filterFollowup", {
                count: followupCount,
              })}
            </span>
          </button>
        </div>
      </div>

      {/* Clustered Topic Stream (Single Surface Executive Timeline) */}
      {filteredClusters.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <HelpCircle className="h-9 w-9 text-slate-400" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {searchQuery
              ? t(
                  "userApplication.aiInterview.noTopicsFound",
                  'No interview topics found matching "{{query}}"',
                  { query: searchQuery }
                )
              : t("userApplication.aiInterview.noQuestionsFound")}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-1 rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-extrabold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400">
              {t("userApplication.aiInterview.clearSearchKeyword", "Clear search keyword")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredClusters.map((cluster) => {
            const mainQ = cluster.mainQuestion;
            const isExpanded = expandedClusterIds[cluster.id] ?? allExpanded;
            const avgScore = cluster.avgScore;

            const scoreBadgeClass =
              avgScore >= 8
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300"
                : avgScore >= 6
                  ? "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800/80 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : avgScore >= 4
                    ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/80 dark:bg-rose-950/40 dark:text-rose-300";

            return (
              <Card
                key={cluster.id}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition-all dark:border-slate-800/80 dark:bg-slate-900/60">
                {/* WAI-ARIA Accessible Cluster Button Header (No nested buttons!) */}
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpandCluster(cluster.id)}
                  className="flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none sm:p-5 dark:hover:bg-slate-800/40">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 font-mono text-sm font-black text-indigo-700 shadow-2xs dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300">
                      #{cluster.id}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-indigo-100/90 px-2.5 py-0.5 text-xs font-black text-indigo-800 uppercase dark:bg-indigo-950/80 dark:text-indigo-300">
                          {t(
                            "userApplication.aiInterview.interviewTopic",
                            "Interview Topic #{{id}}",
                            { id: cluster.id }
                          )}
                        </span>
                        {cluster.followups.length > 0 && (
                          <span className="rounded-md bg-purple-100/90 px-2.5 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                            +{cluster.followups.length}{" "}
                            {t(
                              "userApplication.aiInterview.followUpQuestions",
                              "follow-up questions"
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-base leading-snug font-black text-slate-900 dark:text-white">
                        {mainQ.questionText}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-xl border px-3.5 py-1.5 text-sm font-black shadow-2xs",
                        scoreBadgeClass
                      )}>
                      <span>{avgScore.toFixed(1)}</span>
                      <span className="text-xs opacity-75">/10</span>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Cluster Stream: Borderless Flat Single-Surface Timeline (Zero Card-in-Card Nesting!) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30 p-4 sm:p-6 dark:border-slate-800/80 dark:bg-slate-950/20">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                      {/* Left Column (60% Width): Flat Transcript Dialogue Timeline */}
                      <div className="space-y-5 lg:col-span-7">
                        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5 text-sm font-black tracking-wider text-slate-800 uppercase dark:border-slate-800 dark:text-slate-200">
                          <MessageSquare className="h-4 w-4 text-indigo-500" />
                          <span>
                            {t(
                              "userApplication.aiInterview.interviewContent",
                              "Nội dung phỏng vấn"
                            )}
                          </span>
                        </div>

                        {/* Main Question Candidate Answer (Main question text is already in Card Header!) */}
                        <div className="space-y-1.5 border-l-2 border-indigo-500/80 py-0.5 pl-4">
                          <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            <span className="flex items-center gap-1.5">
                              <Mic className="h-4 w-4 text-indigo-500" />{" "}
                              {t(
                                "userApplication.aiInterview.candidateAnswer",
                                "Trả lời của ứng viên"
                              )}{" "}
                              {t("userApplication.aiInterview.mainQuestionLabel", {
                                order: mainQ.questionOrder ?? 1,
                              })}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {t("userApplication.aiInterview.candidate", "Ứng viên")}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-slate-800 italic dark:text-slate-200">
                            "{mainQ.answerText || t("userApplication.aiInterview.noDataYet")}"
                          </p>
                        </div>

                        {/* Follow-up Questions & Answers Thread (Flat Indented Stream) */}
                        {cluster.followups.length > 0 && (
                          <div className="space-y-5 border-t border-slate-200/60 pt-3 dark:border-slate-800/60">
                            {cluster.followups.map((subQ, subIdx) => (
                              <div key={subQ.questionOrder ?? subIdx} className="space-y-3">
                                {/* Follow-up Question */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-purple-700 dark:text-purple-300">
                                    <HelpCircle className="h-4 w-4 text-purple-600" />
                                    <span>
                                      {t(
                                        "userApplication.aiInterview.followUpHeader",
                                        "Hỏi bồi #{{order}} (AI Interviewer):",
                                        { order: subQ.questionOrder ?? subIdx + 2 }
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-sm leading-relaxed font-bold text-purple-950 dark:text-purple-100">
                                    {subQ.questionText}
                                  </p>
                                </div>

                                {/* Follow-up Answer */}
                                <div className="space-y-1.5 border-l-2 border-purple-500/80 py-0.5 pl-4">
                                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                    {t("userApplication.aiInterview.followUpAnswer")}
                                  </div>
                                  <p className="text-sm leading-relaxed text-slate-800 italic dark:text-slate-200">
                                    "{subQ.answerText || t("userApplication.aiInterview.noDataYet")}
                                    "
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right Column (40% Width): Flat Executive AI Evaluation Report */}
                      <div className="space-y-5 lg:col-span-5">
                        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5 text-sm font-black tracking-wider text-slate-800 uppercase dark:border-slate-800 dark:text-slate-200">
                          <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          <span>
                            {t(
                              "userApplication.aiInterview.aiEvaluationAndSuggestion",
                              "Đánh giá & Gợi ý từ AI"
                            )}
                          </span>
                        </div>

                        {cluster.allQuestions.map((q, qIdx) => {
                          const parsedSuggestion = parseSuggestionText(q.suggestion);
                          if (
                            !q.feedback &&
                            !parsedSuggestion &&
                            (!q.behavioralWarnings || q.behavioralWarnings.length === 0)
                          ) {
                            return null;
                          }

                          return (
                            <div key={qIdx} className="space-y-4">
                              {/* AI Feedback */}
                              {q.feedback && (
                                <div className="space-y-1.5 border-l-2 border-indigo-500 py-0.5 pl-4">
                                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-900 dark:text-indigo-300">
                                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    <span>
                                      {t("userApplication.aiInterview.aiFeedbackCritique")}{" "}
                                      {cluster.allQuestions.length > 1
                                        ? t("userApplication.aiInterview.questionReference", {
                                            order: q.questionOrder ?? qIdx + 1,
                                          })
                                        : ""}
                                    </span>
                                  </div>
                                  <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                                    {q.feedback}
                                  </p>
                                </div>
                              )}

                              {/* Suggestions & Senior Tips */}
                              {parsedSuggestion && (
                                <div className="space-y-3.5 pt-1">
                                  {/* Keywords */}
                                  {parsedSuggestion.keywords.length > 0 && (
                                    <div className="space-y-1.5">
                                      <span className="flex items-center gap-1 text-xs font-extrabold tracking-wider text-amber-900 uppercase dark:text-amber-300">
                                        <Tag className="h-3.5 w-3.5 text-amber-500" />{" "}
                                        {t(
                                          "userApplication.aiInterview.importantKeywords",
                                          "Từ khóa trọng tâm"
                                        )}
                                        :
                                      </span>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {parsedSuggestion.keywords.map((kw, kwIdx) => (
                                          <span
                                            key={kwIdx}
                                            className="inline-flex items-center rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-900 dark:bg-amber-500/25 dark:text-amber-200">
                                            #{kw}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Structure steps */}
                                  {parsedSuggestion.structureSteps.length > 0 && (
                                    <div className="space-y-1.5 border-l-2 border-slate-300 py-0.5 pl-4 dark:border-slate-700">
                                      <span className="flex items-center gap-1 text-xs font-extrabold text-slate-900 dark:text-slate-100">
                                        <Lightbulb className="h-4 w-4 text-amber-500" />{" "}
                                        {t(
                                          "userApplication.aiInterview.standardAnswerOutline",
                                          "Dàn ý trả lời chuẩn"
                                        )}
                                        :
                                      </span>
                                      <div className="space-y-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                        {parsedSuggestion.structureSteps.map((step, sIdx) => (
                                          <div key={sIdx} className="leading-relaxed">
                                            {step}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Senior Tip (Flat Highlight Bar) */}
                                  {parsedSuggestion.seniorTip && (
                                    <div className="flex items-start gap-2.5 rounded-r-xl border-l-2 border-amber-500 bg-amber-500/10 p-3.5 text-sm text-amber-950 dark:bg-amber-500/15 dark:text-amber-200">
                                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                      <div>
                                        <span className="font-extrabold">
                                          {t("userApplication.aiInterview.seniorTip")}:{" "}
                                        </span>
                                        {parsedSuggestion.seniorTip}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Behavioral warnings */}
                              {q.behavioralWarnings && q.behavioralWarnings.length > 0 && (
                                <div className="rounded-r-xl border-l-2 border-rose-500 bg-rose-500/10 p-3.5">
                                  <div className="flex items-center gap-2 text-xs font-extrabold text-rose-900 dark:text-rose-300">
                                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                                    <span>
                                      {t("userApplication.aiInterview.behavioralWarnings")}
                                    </span>
                                  </div>
                                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm font-medium text-rose-800 dark:text-rose-200">
                                    {q.behavioralWarnings.map((w, wIdx) => (
                                      <li key={wIdx}>{w}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AiInterviewResultView({
  detail,
}: {
  detail?: ApplicationDetail;
  round: JdRound;
  jdInfo?: JdInfoPayload | null;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "QUESTIONS" | "PROFILE">("OVERVIEW");
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rawDetail = detail as any;
  const directSessionId =
    detail?.aiInterviewSessionId ??
    detail?.sessionId ??
    rawDetail?.sessionInfo?.sessionId ??
    rawDetail?.sessionInfo?.id ??
    rawDetail?.submissionData?.aiInterviewSessionId ??
    rawDetail?.submissionData?.sessionId ??
    rawDetail?.submissionData?.id ??
    0;

  const currentUserId = useAuthStore((s) => s.user?.id) ?? 0;
  const { data: userSessionsRaw } = useInterviewSessionsByUser(
    currentUserId,
    directSessionId === 0 && currentUserId > 0
  );

  const matchedSessionFromUser = useMemo(() => {
    if (directSessionId > 0) return null;
    const userSessions = Array.isArray(userSessionsRaw)
      ? userSessionsRaw
      : Array.isArray((userSessionsRaw as any)?.data)
        ? (userSessionsRaw as any).data
        : [];
    if (userSessions.length === 0) return null;
    return (
      userSessions.find(
        (s: any) =>
          s.applicationDetailId === detail?.id ||
          (detail?.applicationId && s.candidateProfile?.applicationId === detail.applicationId)
      ) ?? null
    );
  }, [directSessionId, userSessionsRaw, detail]);

  const effectiveSessionId =
    directSessionId > 0 ? directSessionId : (matchedSessionFromUser?.id ?? 0);

  const { data: fetchedSessionData, isLoading: sessionLoading } = useInterviewSession(
    effectiveSessionId,
    effectiveSessionId > 0
  );

  const sessionData = fetchedSessionData ?? matchedSessionFromUser;

  const aiScoreVal =
    sessionData?.overallScore != null
      ? normalizeAiInterviewScore(sessionData.overallScore, "ten")
      : detail?.aiScore != null
        ? normalizeAiInterviewScore(detail.aiScore, "auto")
        : normalizeAiInterviewScore(
            detail?.finalScore,
            detail?.hrScore != null ? "hundred" : "auto"
          );
  const aiScorePercent = aiScoreVal ?? 0;
  const aiScoreDisplay = aiScoreVal != null ? `${Math.round(aiScoreVal)}/100` : "--";

  const hrScoreVal = detail?.hrScore ?? null;
  const hasHrScore = hrScoreVal != null && hrScoreVal > 0;
  const hrScorePercent = normalizeAiInterviewScore(hrScoreVal, "hundred") ?? 0;
  const hrScoreDisplay =
    hrScoreVal != null
      ? `${Math.round(hrScorePercent)}/100`
      : t("userApplication.aiInterview.notGraded");

  const resultVerdict = sessionData?.result ?? "REJECT";
  const verdictBadge = useMemo(() => {
    switch (resultVerdict) {
      case "STRONG_HIRE":
        return {
          label: t("userApplication.aiInterview.verdictStrongHire"),
          desc: t("userApplication.aiInterview.verdictStrongHireDesc"),
          style:
            "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300",
          icon: <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
        };
      case "HIRE":
        return {
          label: t("userApplication.aiInterview.verdictHire"),
          desc: t("userApplication.aiInterview.verdictHireDesc"),
          style:
            "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800/80 dark:bg-indigo-950/40 dark:text-indigo-300",
          icon: <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
        };
      case "CONSIDER":
        return {
          label: t("userApplication.aiInterview.verdictConsider"),
          desc: t("userApplication.aiInterview.verdictConsiderDesc"),
          style:
            "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300",
          icon: <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        };
      case "REJECT":
      default:
        return {
          label: t("userApplication.aiInterview.verdictReject"),
          desc: t("userApplication.aiInterview.verdictRejectDesc"),
          style:
            "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/80 dark:bg-rose-950/40 dark:text-rose-300",
          icon: <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
        };
    }
  }, [resultVerdict, t]);

  const parsedResultDetail = useMemo(() => {
    const raw = sessionData?.resultDetail;
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  }, [sessionData?.resultDetail]);

  const questions = parsedResultDetail?.history ?? [];
  const candidateProfile = sessionData?.candidateProfile ?? null;

  const completedStart =
    sessionData?.createdAt ?? detail?.sessionInfo?.startTime ?? detail?.startedAt;
  const completedEnd =
    sessionData?.completedAt ?? detail?.sessionInfo?.endTime ?? detail?.completedAt;

  const sessionDurationText = useMemo(() => {
    if (!completedStart || !completedEnd) return null;
    const startMs = new Date(completedStart).getTime();
    const endMs = new Date(completedEnd).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return null;
    const diffSec = Math.round((endMs - startMs) / 1000);
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs}s`;
  }, [completedStart, completedEnd]);

  const allExtractedKeywords = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q: components["schemas"]["QAResult"]) => {
      const parsed = parseSuggestionText(q.suggestion);
      parsed?.keywords.forEach((k) => set.add(k));
    });
    return Array.from(set);
  }, [questions]);

  const competencyMetrics = useMemo(() => {
    if (questions.length === 0) return [];

    const coreQs = questions.filter(
      (q: components["schemas"]["QAResult"]) =>
        !q.questionType || q.questionType.toUpperCase() === "BLUEPRINT"
    );
    const coreAvg =
      coreQs.length > 0
        ? coreQs.reduce(
            (acc: number, q: components["schemas"]["QAResult"]) => acc + (q.score ?? 0),
            0
          ) / coreQs.length
        : (aiScoreVal ?? 0);

    const followQs = questions.filter(
      (q: components["schemas"]["QAResult"]) =>
        q.questionType && q.questionType.toUpperCase() === "FOLLOW_UP"
    );
    const followAvg =
      followQs.length > 0
        ? followQs.reduce(
            (acc: number, q: components["schemas"]["QAResult"]) => acc + (q.score ?? 0),
            0
          ) / followQs.length
        : coreAvg;

    const highScores = questions.filter(
      (q: components["schemas"]["QAResult"]) => (q.score ?? 0) >= 6
    ).length;
    const termAccuracy = Math.round((highScores / questions.length) * 100);

    const hasWarnings = questions.some(
      (q: components["schemas"]["QAResult"]) =>
        q.behavioralWarnings && q.behavioralWarnings.length > 0
    );
    const commScore = Math.min(
      100,
      Math.max(20, Math.round(coreAvg * 10 - (hasWarnings ? 15 : 0)))
    );

    return [
      {
        label: t("userApplication.aiInterview.technicalCore", "Technical Core Skills"),
        score: Math.round(coreAvg * 10),
        color: "bg-indigo-600",
      },
      {
        label: t(
          "userApplication.aiInterview.problemSolving",
          "Critical Thinking & Problem Solving"
        ),
        score: Math.round(followAvg * 10),
        color: "bg-purple-600",
      },
      {
        label: t("userApplication.aiInterview.terminologyAccuracy", "Terminology Accuracy"),
        score: termAccuracy,
        color: "bg-emerald-600",
      },
      {
        label: t("userApplication.aiInterview.communication", "Communication & Presence"),
        score: commScore,
        color: "bg-amber-600",
      },
    ];
  }, [questions, aiScoreVal, t]);

  if (sessionLoading) {
    return (
      <Card className="flex flex-col items-center justify-center rounded-[20px] border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">
          {t("userApplication.aiInterview.loadingSessionData")}
        </p>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        "grid items-start gap-6",
        activeTab === "QUESTIONS"
          ? "grid-cols-1"
          : "xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]"
      )}>
      {/* Main Content Area (Tabs) */}
      <div className="space-y-5">
        {/* Navigation Tab Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all",
              activeTab === "OVERVIEW"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            )}>
            <Sparkles className="h-4 w-4" />
            {t("userApplication.aiInterview.tabOverview")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("QUESTIONS")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all",
              activeTab === "QUESTIONS"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            )}>
            <MessageSquare className="h-4 w-4" />
            {t("userApplication.aiInterview.tabQuestions")} ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PROFILE")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all",
              activeTab === "PROFILE"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            )}>
            <User className="h-4 w-4" />
            {t("userApplication.aiInterview.tabProfile")}
          </button>
        </div>

        {/* Tab 1: OVERVIEW */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-5">
            {/* Quick Session Stats Bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-4 w-4 text-indigo-500" />
                  <span className="text-[11px] font-bold">
                    {t("userApplication.aiInterview.duration", "Duration")}
                  </span>
                </div>
                <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                  {sessionDurationText ||
                    t("userApplication.aiInterview.durationValue", { minutes: 15 })}
                </p>
              </Card>

              <Card className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  <span className="text-[11px] font-bold">
                    {t("userApplication.aiInterview.totalQuestions", "Tổng số câu")}
                  </span>
                </div>
                <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                  {t("userApplication.aiInterview.questionsCount", {
                    count: questions.length,
                  })}
                </p>
              </Card>

              <Card className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <SlidersHorizontal className="h-4 w-4 text-emerald-500" />
                  <span className="text-[11px] font-bold">
                    {t("userApplication.aiInterview.strategy", "Chiến thuật")}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-extrabold text-slate-900 dark:text-white">
                  {sessionData?.mode || "STANDARD_MOCK"}
                </p>
              </Card>

              <Card className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Tag className="h-4 w-4 text-amber-500" />
                  <span className="text-[11px] font-bold">
                    {t("userApplication.aiInterview.coreKeywords", "Từ khóa cốt lõi")}
                  </span>
                </div>
                <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                  {t("userApplication.aiInterview.termsCount", {
                    count: allExtractedKeywords.length,
                  })}
                </p>
              </Card>
            </div>

            {/* Competency Progress Bars (Competency Breakdown) */}
            {competencyMetrics.length > 0 && (
              <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">
                        {t(
                          "userApplication.aiInterview.multidimensionalCompetencyAnalysis",
                          "Multidimensional Competency Analysis"
                        )}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {t(
                          "userApplication.aiInterview.detailedEvaluationBasedOnContentAndResponseStyle",
                          "Detailed evaluation based on answer content & style"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3.5">
                  {competencyMetrics.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span>{item.label}</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {item.score}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            item.color
                          )}
                          style={{ width: `${Math.min(100, Math.max(5, item.score))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Extracted Tech Keywords Cloud */}
            {allExtractedKeywords.length > 0 && (
              <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">
                      {t(
                        "userApplication.aiInterview.extractedTechKeywords",
                        "Extracted Tech Keywords ({{count}})",
                        { count: allExtractedKeywords.length }
                      )}
                    </h4>
                  </div>
                  {allExtractedKeywords.length > 12 && (
                    <button
                      type="button"
                      onClick={() => setShowAllKeywords((prev) => !prev)}
                      className="text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                      {showAllKeywords
                        ? t("userApplication.aiInterview.collapse", "Collapse")
                        : t("userApplication.aiInterview.viewAll", {
                            count: allExtractedKeywords.length,
                          })}
                    </button>
                  )}
                </div>
                <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                  {(showAllKeywords ? allExtractedKeywords : allExtractedKeywords.slice(0, 12)).map(
                    (kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-xl border border-slate-200/90 bg-slate-100/80 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200">
                        #{kw}
                      </span>
                    )
                  )}
                </div>
              </Card>
            )}

            {/* AI Executive Summary Card */}
            <Card className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 p-5 shadow-xs sm:p-6 dark:border-indigo-900/60 dark:from-indigo-950/20 dark:via-slate-900 dark:to-purple-950/10">
              <div className="flex items-center gap-2.5 border-b border-indigo-100/80 pb-3.5 dark:border-indigo-900/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs shadow-indigo-200 dark:shadow-none">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">
                    {t("userApplication.aiInterview.aiOverviewReport")}
                  </h4>
                  <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    {t("userApplication.aiInterview.evaluatorName")}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <FormattedMarkdownText
                  content={
                    parsedResultDetail?.aiOverviewFeedback ||
                    parsedResultDetail?.ai_overview_feedback ||
                    (typeof detail?.aiFeedback === "string"
                      ? detail.aiFeedback
                      : detail?.aiFeedback?.generalComment) ||
                    t("userApplication.aiInterview.noDataYet")
                  }
                />
              </div>
            </Card>

            {/* Improvement Plan Card */}
            {(parsedResultDetail?.improvementPlan || parsedResultDetail?.improvement_plan) && (
              <Card className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5 shadow-xs sm:p-6 dark:border-amber-900/60 dark:bg-amber-950/15">
                <div className="flex items-center gap-2.5 border-b border-amber-200/60 pb-3.5 dark:border-amber-900/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">
                    {t("userApplication.aiInterview.improvementPlan")}
                  </h4>
                </div>
                <div className="mt-4">
                  <FormattedMarkdownText
                    content={
                      parsedResultDetail?.improvementPlan || parsedResultDetail?.improvement_plan
                    }
                  />
                </div>
              </Card>
            )}

            {/* HR Direct Evaluation Card */}
            <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/90">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold tracking-wider text-slate-900 uppercase dark:text-white">
                    {t("userApplication.aiInterview.hrDirectComment")}
                  </h4>
                </div>
              </div>

              {detail?.hrNote ? (
                <div className="rounded-xl border-l-2 border-emerald-500 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
                  <FormattedMarkdownText content={detail.hrNote} />
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  {t("userApplication.cvScreening.noHrNote", "Chưa có ghi chú đánh giá từ HR.")}
                </p>
              )}
            </Card>

            {/* Blueprint Strategy Analysis Card */}
            {sessionData?.blueprint?.strategy_analysis && (
              <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">
                    {t("userApplication.aiInterview.strategyAnalysis")}
                  </h4>
                </div>
                <div className="mt-3">
                  <FormattedMarkdownText content={sessionData.blueprint.strategy_analysis} />
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Tab 2: QUESTIONS */}
        {activeTab === "QUESTIONS" && <AiInterviewQuestionsTab questions={questions} />}

        {/* Tab 3: PROFILE SNAPSHOT */}
        {activeTab === "PROFILE" && <CandidateProfileSnapshotView profile={candidateProfile} />}
      </div>

      {/* Right Sidebar: Scores, Verdict, Metadata (Visible on OVERVIEW and PROFILE tabs) */}
      {activeTab !== "QUESTIONS" && (
        <aside className="space-y-4 xl:sticky xl:top-24">
          {/* Card 1: Dual Scores */}
          <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">
                  {t("userApplication.aiInterview.dualScoresTitle")}
                </h4>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <ModernGaugeClock
                score={aiScorePercent}
                displayScoreText={aiScoreDisplay}
                label={t("userApplication.aiInterview.aiScore")}
                color="indigo"
                hasData={aiScoreVal != null}
              />
              <ModernGaugeClock
                score={hrScorePercent}
                displayScoreText={hrScoreDisplay}
                label={t("userApplication.aiInterview.hrScore")}
                color="emerald"
                hasData={hasHrScore}
              />
            </div>

            {questions.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>
                    {t("userApplication.aiInterview.totalQuestionsLabel", "Total questions:")}
                  </span>
                  <span className="font-extrabold text-slate-950 dark:text-white">
                    {questions.length} {t("userApplication.aiInterview.questionsUnit", "questions")}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Card 2: AI Verdict */}
          <Card className={cn("rounded-2xl border p-5 shadow-xs", verdictBadge.style)}>
            <div className="flex items-center gap-2 text-sm font-black">
              {verdictBadge.icon}
              <span>{verdictBadge.label}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed opacity-90">{verdictBadge.desc}</p>
          </Card>

          {/* Card 3: Session Details */}
          <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
            <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-white">
              <CalendarClock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              {t("userApplication.aiInterview.sessionDetails")}
            </h4>

            <div className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("userApplication.aiInterview.domain")}:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {sessionData?.domain ?? "IT"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("userApplication.aiInterview.interviewMode")}:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {sessionData?.mode ?? "STANDARD_MOCK"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("userApplication.aiInterview.difficulty")}:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {sessionData?.sessionConfig?.difficulty ?? "FRESHER_BASIC"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("userApplication.aiInterview.language")}:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {sessionData?.sessionConfig?.language ?? "VI"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("userApplication.aiInterview.duration")}:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {sessionData?.sessionConfig?.duration_minutes
                    ? t("userApplication.aiInterview.durationValue", {
                        minutes: sessionData.sessionConfig.duration_minutes,
                      })
                    : t("userApplication.aiInterview.durationValue", {
                        minutes: 30,
                      })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("userApplication.aiInterview.start")}:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {completedStart ? formatDateTime(completedStart) : "--"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("userApplication.aiInterview.end")}:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {completedEnd ? formatDateTime(completedEnd) : "--"}
                </span>
              </div>
            </div>
          </Card>
        </aside>
      )}
    </div>
  );
}

/** Staff-only view: shows messaging when AI interview is PENDING or SLOT_PICKED */
function StaffAiInterviewWaitingView({
  detail,
  round,
}: {
  detail?: ApplicationDetail;
  round: JdRound;
}) {
  const { t } = useTranslation();
  const statusStr = detail?.status as string | undefined;
  const isPending = statusStr === "PENDING";

  // Get instruction from roundConfig (staff grader API) or round.configData fallback

  const configData = (round.roundConfig as any) ?? round.configData;
  const instruction = localizeRoundInstruction(
    configData?.instruction ?? round.configData?.instruction,
    round.roundType,
    t
  );
  const timeLimitMinutes = configData?.timeLimitMinutes ?? round.configData?.timeLimitMinutes;
  const maxScore = configData?.maxScore ?? round.configData?.maxScore;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-12">
      {/* Left column: status info */}
      <div className="space-y-5 lg:col-span-8">
        {/* Status Banner */}
        <Card
          className={cn(
            "overflow-hidden rounded-2xl border p-6 shadow-sm",
            isPending
              ? "border-amber-300 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-950/20"
              : "border-indigo-300 bg-indigo-50/70 dark:border-indigo-500/30 dark:bg-indigo-950/20"
          )}>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                isPending
                  ? "border border-amber-300 bg-amber-100 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300"
                  : "border border-indigo-300 bg-indigo-100 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-300"
              )}>
              {isPending ? (
                <Clock3 className="h-6 w-6 animate-pulse" />
              ) : (
                <CalendarClock className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <h3
                className={cn(
                  "text-lg font-black",
                  isPending
                    ? "text-amber-900 dark:text-amber-100"
                    : "text-indigo-900 dark:text-indigo-100"
                )}>
                {isPending ? (
                  <>
                    {t(
                      "staffGrading.aiInterview.pendingTitle",
                      "Ứng viên đang chờ lịch phỏng vấn AI"
                    )}
                  </>
                ) : (
                  <>
                    {t(
                      "staffGrading.aiInterview.slotPickedTitle",
                      "Ứng viên đã đặt lịch phỏng vấn AI"
                    )}
                  </>
                )}
              </h3>
              <p
                className={cn(
                  "mt-1 text-sm leading-relaxed",
                  isPending
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-indigo-700 dark:text-indigo-300"
                )}>
                {isPending ? (
                  <>
                    {t(
                      "staffGrading.aiInterview.pendingDesc",
                      "Ứng viên chưa đặt lịch phỏng vấn AI. Vui lòng chờ ứng viên hoàn tất việc chọn slot trước khi bạn có thể đánh giá."
                    )}
                  </>
                ) : (
                  <>
                    {t(
                      "staffGrading.aiInterview.slotPickedDesc",
                      "Ứng viên đã chọn slot phỏng vấn. Hệ thống AI sẽ tiến hành phỏng vấn. Bạn có thể xem lại kết quả sau khi ứng viên hoàn tất."
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* Round Config Info */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Bot className="h-4 w-4 text-indigo-500" />
            {t("staffGrading.aiInterview.roundConfig")}
          </h4>
          <div className="space-y-3 text-xs">
            {instruction && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <span className="mb-1 block font-bold text-slate-500 uppercase dark:text-slate-400">
                  {t("staffGrading.instruction")}:
                </span>
                <p className="leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                  {instruction}
                </p>
              </div>
            )}
            {timeLimitMinutes != null && (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  {t("staffGrading.timeLimit")}:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {timeLimitMinutes} {t("staffGrading.minutes")}
                </span>
              </div>
            )}
            {maxScore != null && (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  {t("staffGrading.maxScore")}:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{maxScore}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Reminder for staff */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-500 dark:text-blue-400" />
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("staffGrading.aiInterview.reminderTitle", "Lưu ý cho Staff")}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {t(
                  "staffGrading.aiInterview.reminderDesc",
                  "Khi ứng viên hoàn tất phỏng vấn AI, hệ thống sẽ tự động chấm điểm. Kết quả (AI Score, AI Feedback) sẽ hiển thị tại đây. Bạn chỉ cần xác nhận điểm HR và đưa ra nhận xét cuối cùng."
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Right sidebar */}
      <div className="space-y-4 lg:col-span-4">
        <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            {t("staffGrading.currentStatus", "Trạng thái hiện tại")}
          </h4>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("staffGrading.detailStatus", "Status")}:
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 font-bold",
                  isPending
                    ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300"
                    : "border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-300"
                )}>
                {statusStr}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("staffGrading.hrScore", "HR Score")}:
              </span>
              <span className="font-bold text-slate-400">--</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("staffGrading.aiScoreLabel", "AI Score")}:
              </span>
              <span className="font-bold text-slate-400">--</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("staffGrading.finalResult", "Kết quả")}:
              </span>
              <span className="font-bold text-slate-400">--</span>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-center text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/20 dark:text-indigo-300">
            {t("staffGrading.aiInterview.waitingForResult", "Chờ kết quả từ hệ thống AI...")}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function AiInterviewModule({
  round,
  detail,
  jdInfo,
  isCompleted,
  isCurrent,
  isStaffView,
  onSuccess,
}: AiInterviewModuleProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedKioskId, setSelectedKioskId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotCalendarSlot | null>(null);
  const [createdBooking, setCreatedBooking] = useState<KioskBooking | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const statusStr = detail?.status as string | undefined;
  const isCompletedEffective =
    isCompleted ||
    statusStr === "COMPLETED" ||
    statusStr === "AI_EVALUATED" ||
    statusStr === "PASSED" ||
    statusStr === "FAILED";

  // Staff view: the round is "in progress" for staff when the detail status is PENDING or SLOT_PICKED
  // (candidate is scheduling/doing AI interview)
  const isStaffInProgress =
    isStaffView &&
    !isCompletedEffective &&
    (statusStr === "PENDING" ||
      statusStr === "SLOT_PICKED" ||
      statusStr === "IN_PROGRESS" ||
      statusStr === "INTERVIEWING" ||
      statusStr === "SCHEDULED");

  const aiScore = detail?.aiScore;
  const hrScore = detail?.hrScore;
  const finalScore = detail?.finalScore ?? detail?.aiScore;
  const applicationDetailId = detail?.id ?? null;
  const selectedDateString = useMemo(() => toYmd(selectedDate), [selectedDate]);

  // Guard kiosk API calls behind !isStaffView — staff just reads status from detail
  const bookingQuery = useKioskBookingByApplicationDetail(
    applicationDetailId,
    !isCompletedEffective && !isStaffView
  );
  const activeBooking = createdBooking ?? bookingQuery.data ?? null;
  const hasBookedSlot = Boolean(
    activeBooking?.id || activeBooking?.sessionKey || detail?.status === "SLOT_PICKED"
  );

  const {
    data: kiosks = [],
    isLoading: kiosksLoading,
    error: kiosksError,
    refetch: refetchKiosks,
  } = useActiveKiosks(isCurrent && !isCompleted && !isStaffView);

  useEffect(() => {
    if (activeBooking?.kioskId && selectedKioskId !== activeBooking.kioskId) {
      setSelectedKioskId(activeBooking.kioskId);
      return;
    }
    if (!selectedKioskId && kiosks.length > 0) {
      setSelectedKioskId(kiosks[0].id ?? null);
    }
  }, [activeBooking?.kioskId, kiosks, selectedKioskId]);

  useEffect(() => {
    if (!activeBooking?.scheduledStart || !activeBooking?.scheduledEnd) return;
    const bookingDate = new Date(activeBooking.scheduledStart);
    if (!Number.isNaN(bookingDate.getTime())) {
      bookingDate.setHours(0, 0, 0, 0);
      if (bookingDate.getTime() !== selectedDate.getTime()) {
        setSelectedDate(bookingDate);
      }
    }
    setSelectedSlot({
      startTime: activeBooking.scheduledStart,
      endTime: activeBooking.scheduledEnd,
      available: true,
    });
  }, [activeBooking?.scheduledEnd, activeBooking?.scheduledStart, selectedDate]);

  const selectedKiosk = useMemo(
    () => kiosks.find((kiosk) => kiosk.id === selectedKioskId) ?? null,
    [kiosks, selectedKioskId]
  );

  const schedulesQuery = useQuery({
    queryKey: ["kiosks", selectedKioskId, "schedules"],
    queryFn: async () => {
      if (!selectedKioskId) return [];
      const result = await kioskManager.getSchedulesByKiosk(selectedKioskId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: Boolean(selectedKioskId) && isCurrent && !isCompleted && !isStaffView,
    staleTime: 60_000,
  });

  const {
    data: rawSlots = [],
    isLoading: slotsLoading,
    error: slotsError,
  } = useKioskSlots(
    selectedKioskId ?? 0,
    selectedDateString,
    Boolean(selectedKioskId) && !hasBookedSlot && !isStaffView
  );

  const availableSlots = useMemo<SlotCalendarSlot[]>(
    () =>
      rawSlots
        .filter((slot) => typeof slot.startTime === "string" && typeof slot.endTime === "string")
        .map((slot) => ({
          startTime: slot.startTime as string,
          endTime: slot.endTime as string,
          available: slot.available !== false,
        })),
    [rawSlots]
  );

  const pickSlotMutation = usePickKioskSlot();
  const selectedSlotKey = selectedSlot
    ? `${selectedSlot.startTime}__${selectedSlot.endTime}`
    : null;
  const selectedDuration = getDurationMinutes(selectedSlot?.startTime, selectedSlot?.endTime);
  const canBook =
    isCurrent &&
    !isCompleted &&
    !isStaffView &&
    Boolean(applicationDetailId) &&
    Boolean(selectedKioskId) &&
    Boolean(selectedSlot) &&
    !hasBookedSlot &&
    !pickSlotMutation.isPending;

  const handleSelectKiosk = (kioskId?: number) => {
    if (hasBookedSlot) return;
    if (!kioskId) return;
    setSelectedKioskId(kioskId);
    setSelectedSlot(null);
    setCreatedBooking(null);
  };

  const handleBookSlot = async () => {
    if (!applicationDetailId || !selectedKioskId || !selectedSlot) return;

    const booking = await pickSlotMutation.mutateAsync({
      applicationDetailId,
      kioskId: selectedKioskId,
      scheduledStart: selectedSlot.startTime,
      scheduledEnd: selectedSlot.endTime,
    });

    setCreatedBooking(booking ?? null);
    if (booking?.sessionKey) {
      setPinDialogOpen(true);
    }
    toast.success(
      t(
        "userApplication.aiInterview.bookingConfirmed",
        "Đã đặt lịch Kiosk. Mã PIN đã được gửi qua thông báo."
      )
    );
    onSuccess?.();
  };

  const handleCopySessionKey = async () => {
    const sessionKey = activeBooking?.sessionKey;
    if (!sessionKey) return;
    try {
      await navigator.clipboard.writeText(sessionKey);
      toast.success(t("userApplication.aiInterview.pinCopied", "Đã copy mã PIN Kiosk."));
    } catch {
      toast.error(
        t(
          "userApplication.aiInterview.copyFailed",
          "Không thể copy mã PIN. Bạn hãy copy thủ công nhé."
        )
      );
    }
  };

  const rawDetail = detail as any;
  const directSessionId =
    detail?.aiInterviewSessionId ??
    detail?.sessionId ??
    rawDetail?.sessionInfo?.sessionId ??
    rawDetail?.sessionInfo?.id ??
    rawDetail?.submissionData?.aiInterviewSessionId ??
    rawDetail?.submissionData?.sessionId ??
    rawDetail?.submissionData?.id ??
    0;

  const currentUserId = useAuthStore((s) => s.user?.id) ?? 0;
  const { data: userSessionsRaw } = useInterviewSessionsByUser(
    currentUserId,
    directSessionId === 0 && currentUserId > 0
  );

  const matchedSessionFromUser = useMemo(() => {
    if (directSessionId > 0) return null;
    const userSessions = Array.isArray(userSessionsRaw)
      ? userSessionsRaw
      : Array.isArray((userSessionsRaw as any)?.data)
        ? (userSessionsRaw as any).data
        : [];
    if (userSessions.length === 0) return null;
    return (
      userSessions.find(
        (s: any) =>
          s.applicationDetailId === detail?.id ||
          (detail?.applicationId && s.candidateProfile?.applicationId === detail.applicationId)
      ) ?? null
    );
  }, [directSessionId, userSessionsRaw, detail]);

  const effectiveSessionId =
    directSessionId > 0 ? directSessionId : (matchedSessionFromUser?.id ?? 0);

  const { data: fetchedSessionData } = useInterviewSession(
    effectiveSessionId,
    effectiveSessionId > 0
  );

  const sessionData = fetchedSessionData ?? matchedSessionFromUser;
  const sessionResult = sessionData?.result ?? detail?.finalResult ?? null;

  return (
    <div className="space-y-6">
      <AiInterviewSubheader
        round={round}
        aiScore={aiScore}
        hrScore={hrScore}
        finalScore={finalScore}
        isCompleted={isCompletedEffective}
        status={detail?.status}
        finalResult={detail?.finalResult}
        sessionResult={sessionResult}
      />

      {isCompletedEffective ? (
        <AiInterviewResultView
          detail={detail}
          round={round}
          jdInfo={jdInfo}
          onSuccess={onSuccess}
        />
      ) : isStaffInProgress ? (
        <StaffAiInterviewWaitingView detail={detail} round={round} />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="border-b border-slate-200 px-4 pt-3 pb-3.5 sm:px-5 sm:pt-3 sm:pb-4 dark:border-slate-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                      <MapPin className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
                      {t("userApplication.aiInterview.selectKiosk", "Chọn trạm Kiosk")}
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {t(
                        "userApplication.aiInterview.selectKioskHint",
                        "Ưu tiên trạm gần bạn và có lịch hoạt động khớp với thời gian phỏng vấn."
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void refetchKiosks()}
                    className="h-8 gap-1.5 px-3 text-[11px] font-extrabold">
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("userApplication.aiInterview.refreshKiosk", "Làm mới Kiosk")}
                  </Button>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {kiosksLoading ? (
                  <div className="grid gap-2.5 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-[92px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60"
                      />
                    ))}
                  </div>
                ) : kiosksError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                    {t(
                      "userApplication.aiInterview.cannotLoadKiosks",
                      "Không thể tải danh sách Kiosk. Vui lòng làm mới lại."
                    )}
                  </div>
                ) : kiosks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                    <Laptop className="mx-auto h-10 w-10 text-slate-400" />
                    <h4 className="mt-3 text-sm font-extrabold text-slate-900 dark:text-white">
                      {t("userApplication.aiInterview.noKiosksAvailable", "Chưa có Kiosk khả dụng")}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t(
                        "userApplication.aiInterview.kiosksNotConfigured",
                        "Hệ thống chưa mở trạm Kiosk để đặt lịch cho vòng này."
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                    {kiosks.map((kiosk) => (
                      <KioskCard
                        key={kiosk.id ?? kiosk.name}
                        kiosk={kiosk}
                        selected={kiosk.id === selectedKioskId}
                        disabled={hasBookedSlot}
                        onSelect={() => handleSelectKiosk(kiosk.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="border-b border-slate-200 px-4 pt-3 pb-3.5 sm:px-5 sm:pt-3 sm:pb-4 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                  <Clock3 className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
                  {t("userApplication.aiInterview.kioskSchedule", "Lịch hoạt động của trạm")}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t(
                    "userApplication.aiInterview.scheduleHint",
                    "Các khung hoạt động dùng để sinh slot trống theo từng ngày."
                  )}
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <ScheduleList
                  schedules={schedulesQuery.data ?? []}
                  loading={schedulesQuery.isLoading}
                />
              </div>
            </Card>

            <SlotCalendar
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                if (hasBookedSlot) return;
                setSelectedDate(date);
                setSelectedSlot(null);
                setCreatedBooking(null);
              }}
              slots={availableSlots}
              selectedSlotKey={selectedSlotKey}
              onSelectSlot={(slot) => {
                if (hasBookedSlot) return;
                setSelectedSlot(slot);
                setCreatedBooking(null);
              }}
              isLoading={slotsLoading}
              disabled={!selectedKioskId || !isCurrent || hasBookedSlot}
              emptyMessage={
                slotsError
                  ? t(
                      "userApplication.aiInterview.cannotLoadSlots",
                      "Không thể tải slot trống của Kiosk."
                    )
                  : t(
                      "userApplication.aiInterview.selectKioskFirst",
                      "Hãy chọn một trạm Kiosk để xem slot."
                    )
              }
              noSlotsMessage={t(
                "userApplication.aiInterview.noSlotsForDay",
                "Ngày này chưa có slot trống. Bạn thử chọn ngày khác nhé."
              )}
              className="border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40"
            />
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <Card className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-950 dark:text-white">
                  <CalendarClock className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  {t("userApplication.aiInterview.bookingSummary", "Tóm tắt đặt lịch")}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {t(
                    "userApplication.aiInterview.bookingSummaryHint",
                    "Kiểm tra lại thông tin trước khi xác nhận slot Kiosk."
                  )}
                </p>
              </div>

              <div className="p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <SummaryItem
                    icon={<MapPin className="h-4 w-4" />}
                    label={t("userApplication.aiInterview.kiosk", "Kiosk")}
                    value={
                      selectedKiosk?.name ??
                      t("userApplication.aiInterview.notSelected", "Chưa chọn")
                    }
                  />
                  <SummaryItem
                    icon={<MapPin className="h-4 w-4" />}
                    label={t("userApplication.aiInterview.location", "Địa điểm")}
                    value={
                      selectedKiosk?.location ??
                      t("userApplication.aiInterview.locationNotUpdated", "Chưa cập nhật")
                    }
                  />
                  <SummaryItem
                    icon={<CalendarClock className="h-4 w-4" />}
                    label={t("userApplication.aiInterview.time", "Thời gian")}
                    value={
                      selectedSlot
                        ? formatDateTime(selectedSlot.startTime)
                        : t("userApplication.aiInterview.notSelected", "Chưa chọn")
                    }
                  />
                  <SummaryItem
                    icon={<Clock3 className="h-4 w-4" />}
                    label={t("userApplication.aiInterview.duration")}
                    value={
                      selectedDuration
                        ? t("userApplication.aiInterview.durationValue", {
                            minutes: selectedDuration,
                          })
                        : t("userApplication.aiInterview.perSlot")
                    }
                  />
                  <SummaryItem
                    icon={<Cpu className="h-4 w-4" />}
                    label={t("userApplication.aiInterview.position")}
                    value={jdInfo?.title ?? t("common.roundType.AI_INTERVIEW")}
                  />
                </div>

                {activeBooking?.sessionKey ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <KeyRound className="mx-auto h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                    <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {t("userApplication.aiInterview.kioskPinCode")}
                    </p>
                    <p className="mt-1 font-mono text-3xl font-black tracking-[0.24em] text-emerald-800 dark:text-emerald-200">
                      {activeBooking.sessionKey}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-emerald-700/80 dark:text-emerald-300/80">
                      {t("userApplication.aiInterview.keepPinHint")}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopySessionKey}
                        className="h-9 gap-2 border-emerald-300 bg-white/70 text-xs font-extrabold text-emerald-800 hover:bg-white dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <Copy className="h-3.5 w-3.5" />
                        {t("userApplication.aiInterview.copyPin", "Copy PIN")}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setPinDialogOpen(true)}
                        className="h-9 gap-2 bg-emerald-600 text-xs font-extrabold text-white hover:bg-emerald-700">
                        <KeyRound className="h-3.5 w-3.5" />
                        {t("userApplication.aiInterview.viewInstructions", "Xem hướng dẫn")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="leading-6">
                      {t(
                        "userApplication.aiInterview.kioskOnlyNote",
                        "Phòng AI chỉ mở tại Kiosk. Bạn cần đến đúng trạm, đúng giờ và nhập mã PIN để bắt đầu."
                      )}
                    </p>
                  </div>
                )}

                {!hasBookedSlot && (
                  <Button
                    type="button"
                    onClick={() => void handleBookSlot()}
                    disabled={!canBook}
                    className="mt-4 h-11 w-full gap-2 bg-indigo-600 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {pickSlotMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    {pickSlotMutation.isPending
                      ? t("userApplication.aiInterview.booking", "Đang đặt slot...")
                      : t("userApplication.aiInterview.confirmBooking", "Xác nhận đặt slot Kiosk")}
                  </Button>
                )}

                {!applicationDetailId && (
                  <p className="mt-3 text-xs leading-5 text-rose-600 dark:text-rose-300">
                    {t("userApplication.aiInterview.noApplicationDetail")}
                  </p>
                )}
              </div>
            </Card>

            <Card className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-white">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {t(
                  "userApplication.aiInterview.prepareBeforeKiosk",
                  "Prepare Before Coming to Kiosk"
                )}
              </h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <p>
                  {t(
                    "userApplication.aiInterview.prepareTip1",
                    "Arrive about 10-15 minutes before your appointment to check equipment."
                  )}
                </p>
                <p>
                  {t(
                    "userApplication.aiInterview.prepareTip2",
                    "Bring your interview session PIN code and any required documents if the company requires."
                  )}
                </p>
                <p>
                  {t(
                    "userApplication.aiInterview.prepareTip3",
                    "Keep a quiet environment and answer clearly for better AI recording."
                  )}
                </p>
              </div>
            </Card>
          </aside>
        </div>
      )}
      <KioskPinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        booking={activeBooking}
        kiosk={selectedKiosk}
        duration={selectedDuration}
        onCopy={handleCopySessionKey}
      />
    </div>
  );
}
