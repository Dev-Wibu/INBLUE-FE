import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
export type DashboardRole = "user" | "mentor";
export interface DashboardTabDefinition {
  type: string;
  label: string;
}
export type DashboardBreadcrumbItemKind = "root" | "tab" | "detail";
export interface DashboardBreadcrumbItem {
  label: string;
  href?: string;
  kind?: DashboardBreadcrumbItemKind;
}
export interface DashboardBreadcrumbDetailItem {
  label: string;
  href?: string;
}
interface RoleConfig {
  rootPath: string;
  rootLabel: string;
  defaultTab: string;
}
type DashboardRouteVariant = "practiceQuiz" | "practiceQuizResult";
type DynamicResourceType =
  | "session"
  | "mentor"
  | "practiceSet"
  | "quizSet"
  | "mentorReview"
  | "user";
interface RouteDynamicResolver {
  resource: DynamicResourceType;
  idParam: string;
  prefix?: string;
}
interface RouteLabelRule {
  pattern: RegExp;
  label: string;
  tabType?: string;
  dynamic?: RouteDynamicResolver;
  variant?: DashboardRouteVariant;
}
export interface DashboardRouteMatch {
  label: string;
  tabType?: string;
  variant?: DashboardRouteVariant;
  routeParams?: Record<string, string>;
  dynamic?: {
    resource: DynamicResourceType;
    id?: number;
    rawId?: string;
    prefix?: string;
  };
}
const ROLE_CONFIG: Record<DashboardRole, RoleConfig> = {
  user: {
    rootPath: "/user",
    rootLabel: t("common.user"),
    defaultTab: "homeFeed",
  },
  mentor: {
    rootPath: "/mentor",
    rootLabel: "Mentor",
    defaultTab: "overview",
  },
};
const USER_ROUTE_RULES: RouteLabelRule[] = [
  {
    pattern: /^\/user\/ai-interview\/setup$/,
    label: t("general.establish"),
    tabType: "aiInterview",
  },
  {
    pattern: /^\/user\/ai-interview\/session$/,
    label: t("general.aiInterviewSession"),
    tabType: "aiInterview",
  },
  {
    pattern: /^\/user\/ai-interview\/result\/(?<sessionId>[^/]+)$/,
    label: t("general.aiInterviewResults"),
    tabType: "aiInterview",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: t("common.result"),
    },
  },
  {
    pattern: /^\/user\/mock-interview\/select-mentor$/,
    label: t("common.chooseAMentor"),
    tabType: "mockInterview",
  },
  {
    pattern: /^\/user\/mock-interview\/schedule$/,
    label: t("general.schedule"),
    tabType: "mockInterview",
  },
  {
    pattern: /^\/user\/mock-interview\/booking-success$/,
    label: t("general.scheduledSuccessfully"),
    tabType: "mockInterview",
  },
  {
    pattern: /^\/user\/mock-interview\/room\/(?<sessionId>[^/]+)$/,
    label: t("common.interviewRoom"),
    tabType: "mockInterview",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: t("general.room"),
    },
  },
  {
    pattern: /^\/user\/mock-interview\/history\/(?<sessionId>[^/]+)\/feedback$/,
    label: t("common.writeAReview"),
    tabType: "mockInterview",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: t("common.writeAReview"),
    },
  },
  {
    pattern: /^\/user\/mock-interview\/history\/(?<sessionId>[^/]+)$/,
    label: t("general.sessionDetails"),
    tabType: "mockInterview",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: t("common.session"),
    },
  },
  {
    pattern:
      /^\/user\/practice\/session\/(?<sessionId>[^/]+)\/(?<practiceSetId>[^/]+)\/quiz\/(?<quizId>[^/]+)\/result$/,
    label: t("general.testResults"),
    tabType: "practice",
    variant: "practiceQuizResult",
    dynamic: {
      resource: "quizSet",
      idParam: "quizId",
      prefix: t("common.result"),
    },
  },
  {
    pattern:
      /^\/user\/practice\/session\/(?<sessionId>[^/]+)\/(?<practiceSetId>[^/]+)\/quiz\/(?<quizId>[^/]+)$/,
    label: t("general.test"),
    tabType: "practice",
    variant: "practiceQuiz",
    dynamic: {
      resource: "quizSet",
      idParam: "quizId",
      prefix: t("general.test"),
    },
  },
  {
    pattern: /^\/user\/practice\/session\/(?<sessionId>[^/]+)$/,
    label: t("general.sessionTrainingSet"),
    tabType: "practice",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: t("common.route"),
    },
  },
  {
    pattern: /^\/user\/practice\/(?<practiceSetId>[^/]+)$/,
    label: t("common.detailsOfPracticeSet"),
    tabType: "practice",
    dynamic: {
      resource: "practiceSet",
      idParam: "practiceSetId",
      prefix: t("general.set"),
    },
  },
  {
    pattern: /^\/user\/feedback\/(?<reviewId>[^/]+)$/,
    label: t("general.reviewDetails"),
    tabType: "feedback",
    dynamic: {
      resource: "mentorReview",
      idParam: "reviewId",
      prefix: t("common.evaluate"),
    },
  },
  {
    pattern: /^\/user\/mentors\/(?<mentorId>[^/]+)$/,
    label: t("general.mentorProfile"),
    tabType: "mentors",
    dynamic: {
      resource: "mentor",
      idParam: "mentorId",
      prefix: "Mentor",
    },
  },
];
const MENTOR_ROUTE_RULES: RouteLabelRule[] = [
  {
    pattern: /^\/mentor\/sessions\/room\/(?<sessionId>[^/]+)$/,
    label: t("common.interviewRoom"),
    tabType: "sessions",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: t("general.room"),
    },
  },
  {
    pattern: /^\/mentor\/sessions\/(?<sessionId>[^/]+)\/review$/,
    label: t("common.writeFeedback"),
    tabType: "sessions",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: t("common.writeFeedback"),
    },
  },
  {
    pattern: /^\/mentor\/sessions\/(?<sessionId>[^/]+)$/,
    label: t("general.sessionDetails"),
    tabType: "sessions",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: t("common.session"),
    },
  },
  {
    pattern: /^\/mentor\/reviews\/(?<reviewId>[^/]+)$/,
    label: t("general.reviewDetails"),
    tabType: "reviews",
    dynamic: {
      resource: "mentorReview",
      idParam: "reviewId",
      prefix: t("common.evaluate"),
    },
  },
  {
    pattern: /^\/mentor\/students\/(?<userId>[^/]+)$/,
    label: t("general.studentDetails"),
    tabType: "students",
    dynamic: {
      resource: "user",
      idParam: "userId",
      prefix: t("common.students"),
    },
  },
];
const USER_SEGMENT_TO_TAB: Record<string, string> = {
  mentors: "mentors",
  "ai-interview": "aiInterview",
  "mock-interview": "mockInterview",
  practice: "practice",
  feedback: "feedback",
  messenger: "messenger",
};
const MENTOR_SEGMENT_TO_TAB: Record<string, string> = {
  sessions: "sessions",
  reviews: "reviews",
  students: "students",
  messenger: "messenger",
};
function toPositiveInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function formatBreadcrumbLabelWithPrefix(prefix: string | undefined, value: string): string {
  const normalizedValue = value.trim();
  if (!prefix) {
    return normalizedValue;
  }
  const normalizedPrefix = prefix.trim();
  if (!normalizedPrefix) {
    return normalizedValue;
  }
  if (!normalizedValue) {
    return normalizedPrefix;
  }
  const dedupedValue = normalizedValue
    .replace(new RegExp(`^${escapeRegExp(normalizedPrefix)}\\s*:\\s*`, "i"), "")
    .trim();
  if (!dedupedValue) {
    return normalizedPrefix;
  }
  return `${normalizedPrefix}: ${dedupedValue}`;
}
export function normalizeDashboardPath(pathname: string): string {
  if (!pathname) {
    return "/";
  }
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}
function getTabLabel(tabType: string, availableTabs: DashboardTabDefinition[]): string {
  const matchedTab = availableTabs.find((tab) => tab.type === tabType);
  return matchedTab?.label ?? "Trang";
}
function getRouteRules(role: DashboardRole): RouteLabelRule[] {
  return role === "user" ? USER_ROUTE_RULES : MENTOR_ROUTE_RULES;
}
export function getDashboardRouteMatch(
  role: DashboardRole,
  pathname: string
): DashboardRouteMatch | null {
  const normalizedPath = normalizeDashboardPath(pathname);
  const matchedRule = getRouteRules(role).find((rule) => rule.pattern.test(normalizedPath));
  if (!matchedRule) {
    return null;
  }
  const match = normalizedPath.match(matchedRule.pattern);
  const routeParams = match?.groups ?? undefined;
  const rawId = matchedRule.dynamic?.idParam
    ? routeParams?.[matchedRule.dynamic.idParam]
    : undefined;
  return {
    label: matchedRule.label,
    tabType: matchedRule.tabType,
    variant: matchedRule.variant,
    routeParams,
    dynamic: matchedRule.dynamic
      ? {
          resource: matchedRule.dynamic.resource,
          id: toPositiveInteger(rawId),
          rawId,
          prefix: matchedRule.dynamic.prefix,
        }
      : undefined,
  };
}
export function getDashboardTabFromPath<T extends string>({
  role,
  pathname,
  defaultTab,
}: {
  role: DashboardRole;
  pathname: string;
  defaultTab: T;
}): string {
  const normalizedPath = normalizeDashboardPath(pathname);
  const roleConfig = ROLE_CONFIG[role];
  const routeMatch = getDashboardRouteMatch(role, normalizedPath);
  if (routeMatch?.tabType) {
    return routeMatch.tabType;
  }
  if (normalizedPath === roleConfig.rootPath) {
    return defaultTab;
  }
  const segment = normalizedPath.replace(new RegExp(`^${roleConfig.rootPath}/`), "").split("/")[0];
  const segmentToTab = role === "user" ? USER_SEGMENT_TO_TAB : MENTOR_SEGMENT_TO_TAB;
  return segmentToTab[segment] ?? defaultTab;
}
function isDynamicSegment(segment: string): boolean {
  if (!segment) {
    return false;
  }
  if (/^\d+$/.test(segment)) {
    return true;
  }
  return /^[a-f0-9-]{8,}$/i.test(segment);
}
function toReadableLabel(segment: string): string {
  if (!segment) {
    return t("common.detail");
  }
  if (isDynamicSegment(segment)) {
    return t("common.detail");
  }
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
export function getDashboardNestedRouteLabel(role: DashboardRole, pathname: string): string {
  const normalizedPath = normalizeDashboardPath(pathname);
  const routeMatch = getDashboardRouteMatch(role, normalizedPath);
  if (routeMatch) {
    return routeMatch.label;
  }
  const segments = normalizedPath.split("/").filter(Boolean);
  const lastSegment = segments.at(-1);
  return toReadableLabel(lastSegment ?? "");
}
export function buildDashboardBreadcrumbItems({
  role,
  pathname,
  activeTab,
  availableTabs,
  nestedLabelOverride,
  detailLabelsOverride,
}: {
  role: DashboardRole;
  pathname: string;
  activeTab: string;
  availableTabs: DashboardTabDefinition[];
  nestedLabelOverride?: string;
  detailLabelsOverride?: Array<string | DashboardBreadcrumbDetailItem>;
}): DashboardBreadcrumbItem[] {
  const roleConfig = ROLE_CONFIG[role];
  const normalizedPath = normalizeDashboardPath(pathname);
  const activeTabLabel = getTabLabel(activeTab, availableTabs);
  const rootHref = `${roleConfig.rootPath}?tab=${roleConfig.defaultTab}`;
  const breadcrumbs: DashboardBreadcrumbItem[] = [
    {
      label: roleConfig.rootLabel,
      href: rootHref,
      kind: "root",
    },
  ];
  if (normalizedPath === roleConfig.rootPath) {
    breadcrumbs.push({
      label: activeTabLabel,
      kind: "tab",
    });
    return breadcrumbs;
  }
  breadcrumbs.push({
    label: activeTabLabel,
    href: `${roleConfig.rootPath}?tab=${activeTab}`,
    kind: "tab",
  });
  if (detailLabelsOverride?.length) {
    const appendedEntries = new Set<string>();
    for (const detailItem of detailLabelsOverride) {
      const normalizedLabel =
        typeof detailItem === "string" ? detailItem.trim() : detailItem.label.trim();
      const detailHref = typeof detailItem === "string" ? undefined : detailItem.href;
      if (
        !normalizedLabel ||
        normalizedLabel === activeTabLabel ||
        appendedEntries.has(`${normalizedLabel}::${detailHref ?? ""}`)
      ) {
        continue;
      }
      appendedEntries.add(`${normalizedLabel}::${detailHref ?? ""}`);
      breadcrumbs.push({
        label: normalizedLabel,
        href: detailHref,
        kind: "detail",
      });
    }
    return breadcrumbs;
  }
  const nestedLabel = nestedLabelOverride ?? getDashboardNestedRouteLabel(role, normalizedPath);
  if (nestedLabel && nestedLabel !== activeTabLabel) {
    breadcrumbs.push({
      label: nestedLabel,
      kind: "detail",
    });
  }
  return breadcrumbs;
}
