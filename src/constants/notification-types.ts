import type { TFunction } from "i18next";
import type { LucideIcon } from "lucide-react";
import { Bell, Calendar, CheckCircle, MessageSquare, Star, User, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export type NotificationType =
  | "INTERVIEW"
  | "FEEDBACK"
  | "REVIEW"
  | "MENTOR"
  | "SUCCESS"
  | "ERROR"
  | "SYSTEM";
interface NotificationTypeConfig {
  type: NotificationType;
  label: string;
  icon: LucideIcon;
  iconColorClassName: string;
  keywords: string[];
}

/**
 * Build notification type configs with live-translated labels/keywords.
 * Pass the `t` function from useTranslation() to get correct translations for the current language.
 */
function buildNotificationTypeConfigs(t: TFunction): NotificationTypeConfig[] {
  return [
    {
      type: "INTERVIEW",
      label: t("common.interview"),
      icon: Calendar,
      iconColorClassName: "text-[#0047AB]",
      keywords: [t("general.interview"), "session", "interview"],
    },
    {
      type: "FEEDBACK",
      label: t("common.feedback1"),
      icon: MessageSquare,
      iconColorClassName: "text-cyan-500",
      keywords: [t("common.feedback"), "feedback"],
    },
    {
      type: "REVIEW",
      label: t("common.evaluate"),
      icon: Star,
      iconColorClassName: "text-yellow-500",
      keywords: [t("compReview.evaluate"), "review"],
    },
    {
      type: "MENTOR",
      label: t("common.mentor"),
      icon: User,
      iconColorClassName: "text-emerald-600",
      keywords: ["mentor", t("general.browseMentors"), t("general.student")],
    },
    {
      type: "SUCCESS",
      label: t("general.success"),
      icon: CheckCircle,
      iconColorClassName: "text-green-500",
      keywords: [t("general.success1"), "success"],
    },
    {
      type: "ERROR",
      label: t("common.error"),
      icon: XCircle,
      iconColorClassName: "text-red-500",
      keywords: [t("general.failed"), t("general.reject"), "error", t("general.error1")],
    },
    {
      type: "SYSTEM",
      label: t("common.system"),
      icon: Bell,
      iconColorClassName: "text-slate-500",
      keywords: [],
    },
  ];
}

/**
 * Hook: returns notification type configs with live-translated labels.
 * Use this in React components for correct language switching.
 */
export function useNotificationTypeConfigs(): NotificationTypeConfig[] {
  const { t } = useTranslation();
  return buildNotificationTypeConfigs(t);
}
const DEFAULT_NOTIFICATION_TYPE: NotificationType = "SYSTEM";
export const NOTIFICATION_GROUP_ORDER: NotificationType[] = [
  "INTERVIEW",
  "FEEDBACK",
  "REVIEW",
  "MENTOR",
  "SUCCESS",
  "ERROR",
  "SYSTEM",
];
export function inferNotificationType(title: string | undefined, t: TFunction): NotificationType {
  const normalizedTitle = title?.trim().toLowerCase() ?? "";
  if (!normalizedTitle) {
    return DEFAULT_NOTIFICATION_TYPE;
  }
  const configs = buildNotificationTypeConfigs(t);
  for (const config of configs) {
    if (config.keywords.some((keyword) => normalizedTitle.includes(keyword))) {
      return config.type;
    }
  }
  return DEFAULT_NOTIFICATION_TYPE;
}
export function getNotificationTypeConfig(
  type: NotificationType,
  t: TFunction
): NotificationTypeConfig {
  const configs = buildNotificationTypeConfigs(t);
  return (
    configs.find((config) => config.type === type) ??
    configs.find((config) => config.type === DEFAULT_NOTIFICATION_TYPE)!
  );
}
export function getNotificationTypeConfigFromTitle(
  title: string | undefined,
  t: TFunction
): NotificationTypeConfig {
  return getNotificationTypeConfig(inferNotificationType(title, t), t);
}
