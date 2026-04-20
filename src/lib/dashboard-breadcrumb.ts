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
    rootLabel: "Người dùng",
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
    label: "Thiết lập",
    tabType: "aiInterview",
  },
  {
    pattern: /^\/user\/ai-interview\/session$/,
    label: "Phiên phỏng vấn AI",
    tabType: "aiInterview",
  },
  {
    pattern: /^\/user\/ai-interview\/result\/(?<sessionId>[^/]+)$/,
    label: "Kết quả phỏng vấn AI",
    tabType: "aiInterview",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: "Kết quả",
    },
  },
  {
    pattern: /^\/user\/mock-interview\/select-mentor$/,
    label: "Chọn mentor",
    tabType: "mockInterview",
  },
  {
    pattern: /^\/user\/mock-interview\/schedule$/,
    label: "Lên lịch",
    tabType: "mockInterview",
  },
  {
    pattern: /^\/user\/mock-interview\/booking-success$/,
    label: "Đặt lịch thành công",
    tabType: "mockInterview",
  },
  {
    pattern: /^\/user\/mock-interview\/room\/(?<sessionId>[^/]+)$/,
    label: "Phòng phỏng vấn",
    tabType: "mockInterview",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: "Phòng",
    },
  },
  {
    pattern: /^\/user\/mock-interview\/history\/(?<sessionId>[^/]+)\/feedback$/,
    label: "Viết đánh giá",
    tabType: "mockInterview",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: "Viết đánh giá",
    },
  },
  {
    pattern: /^\/user\/mock-interview\/history\/(?<sessionId>[^/]+)$/,
    label: "Chi tiết phiên",
    tabType: "mockInterview",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: "Phiên",
    },
  },
  {
    pattern: /^\/user\/practice\/(?<practiceSetId>[^/]+)\/quiz\/(?<quizId>[^/]+)\/result$/,
    label: "Kết quả bài kiểm tra",
    tabType: "practice",
    variant: "practiceQuizResult",
    dynamic: {
      resource: "quizSet",
      idParam: "quizId",
      prefix: "Kết quả",
    },
  },
  {
    pattern: /^\/user\/practice\/(?<practiceSetId>[^/]+)\/quiz\/(?<quizId>[^/]+)$/,
    label: "Bài kiểm tra",
    tabType: "practice",
    variant: "practiceQuiz",
    dynamic: {
      resource: "quizSet",
      idParam: "quizId",
      prefix: "Bài kiểm tra",
    },
  },
  {
    pattern: /^\/user\/practice\/session\/(?<sessionId>[^/]+)$/,
    label: "Bộ luyện tập theo phiên",
    tabType: "practice",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: "Lộ trình",
    },
  },
  {
    pattern: /^\/user\/practice\/(?<practiceSetId>[^/]+)$/,
    label: "Chi tiết bộ luyện tập",
    tabType: "practice",
    dynamic: {
      resource: "practiceSet",
      idParam: "practiceSetId",
      prefix: "Bộ",
    },
  },
  {
    pattern: /^\/user\/feedback\/(?<reviewId>[^/]+)$/,
    label: "Chi tiết đánh giá",
    tabType: "feedback",
    dynamic: {
      resource: "mentorReview",
      idParam: "reviewId",
      prefix: "Đánh giá",
    },
  },
  {
    pattern: /^\/user\/mentors\/(?<mentorId>[^/]+)$/,
    label: "Hồ sơ mentor",
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
    label: "Phòng phỏng vấn",
    tabType: "sessions",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: "Phòng",
    },
  },
  {
    pattern: /^\/mentor\/sessions\/(?<sessionId>[^/]+)\/review$/,
    label: "Viết phản hồi",
    tabType: "sessions",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: "Viết phản hồi",
    },
  },
  {
    pattern: /^\/mentor\/sessions\/(?<sessionId>[^/]+)$/,
    label: "Chi tiết phiên",
    tabType: "sessions",
    dynamic: {
      resource: "session",
      idParam: "sessionId",
      prefix: "Phiên",
    },
  },
  {
    pattern: /^\/mentor\/reviews\/(?<reviewId>[^/]+)$/,
    label: "Chi tiết đánh giá",
    tabType: "reviews",
    dynamic: {
      resource: "mentorReview",
      idParam: "reviewId",
      prefix: "Đánh giá",
    },
  },
  {
    pattern: /^\/mentor\/students\/(?<userId>[^/]+)$/,
    label: "Chi tiết học viên",
    tabType: "students",
    dynamic: {
      resource: "user",
      idParam: "userId",
      prefix: "Học viên",
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
    return "Chi tiết";
  }

  if (isDynamicSegment(segment)) {
    return "Chi tiết";
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
  detailLabelsOverride?: string[];
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
    breadcrumbs.push({ label: activeTabLabel, kind: "tab" });
    return breadcrumbs;
  }

  breadcrumbs.push({
    label: activeTabLabel,
    href: `${roleConfig.rootPath}?tab=${activeTab}`,
    kind: "tab",
  });

  if (detailLabelsOverride?.length) {
    const appendedLabels = new Set<string>();

    for (const label of detailLabelsOverride) {
      const normalizedLabel = label.trim();
      if (
        !normalizedLabel ||
        normalizedLabel === activeTabLabel ||
        appendedLabels.has(normalizedLabel)
      ) {
        continue;
      }

      appendedLabels.add(normalizedLabel);
      breadcrumbs.push({ label: normalizedLabel, kind: "detail" });
    }

    return breadcrumbs;
  }

  const nestedLabel = nestedLabelOverride ?? getDashboardNestedRouteLabel(role, normalizedPath);
  if (nestedLabel && nestedLabel !== activeTabLabel) {
    breadcrumbs.push({ label: nestedLabel, kind: "detail" });
  }

  return breadcrumbs;
}
