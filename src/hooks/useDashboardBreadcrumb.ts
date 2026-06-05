import {
  buildDashboardBreadcrumbItems,
  formatBreadcrumbLabelWithPrefix,
  getDashboardRouteMatch,
  normalizeDashboardPath,
  type DashboardBreadcrumbDetailItem,
  type DashboardBreadcrumbItem,
  type DashboardRole,
  type DashboardRouteMatch,
  type DashboardTabDefinition,
} from "@/lib/dashboard-breadcrumb";
import { chatManager } from "@/services/chat.manager";
import { mentorReviewManager } from "@/services/mentor-review.manager";
import { mentorManager } from "@/services/mentor.manager";
import { practiceSetManager } from "@/services/practice-set.manager";
import { quizSetManager } from "@/services/quiz-set.manager";
import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const DYNAMIC_BREADCRUMB_QUERY_KEY = "dashboard-breadcrumb-dynamic-label";
interface DynamicLabelRequest {
  resource: NonNullable<DashboardRouteMatch["dynamic"]>["resource"];
  id: number;
  prefix?: string;
}
interface PracticeQuizDetailRequest {
  sessionId: number;
  practiceSetId: number;
  quizId: number;
  includeResult: boolean;
}
const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const toPositiveInteger = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
};
const getSessionBreadcrumbLabel = (sessionId: number, t: TFunction): string =>
  t("common.sessionVar0", {
    var_0: sessionId,
  });
function resolveRoleSpecificDetailChain({
  role,
  pathname,
  routeParams,
  t,
}: {
  role: DashboardRole;
  pathname: string;
  routeParams?: Record<string, string>;
  t: TFunction;
}): DashboardBreadcrumbDetailItem[] | null {
  const normalizedPath = normalizeDashboardPath(pathname);
  const sessionId = toPositiveInteger(routeParams?.sessionId);
  if (!sessionId) {
    return null;
  }
  if (
    role === "user" &&
    /^\/user\/mock-interview\/history\/[^/]+\/feedback$/.test(normalizedPath)
  ) {
    return [
      {
        label: getSessionBreadcrumbLabel(sessionId, t),
        href: `/user/mock-interview/history/${sessionId}`,
      },
      {
        label: t("common.writeAReview"),
      },
    ];
  }
  if (role === "mentor" && /^\/mentor\/sessions\/[^/]+\/review$/.test(normalizedPath)) {
    return [
      {
        label: getSessionBreadcrumbLabel(sessionId, t),
        href: `/mentor/sessions/${sessionId}`,
      },
      {
        label: t("common.writeFeedback"),
      },
    ];
  }
  return null;
}
async function resolvePracticeQuizDetailLabels(
  request: PracticeQuizDetailRequest,
  t: TFunction
): Promise<DashboardBreadcrumbDetailItem[] | null> {
  const { includeResult, quizId, sessionId } = request;
  const quizResponse = await quizSetManager.getById(quizId);
  if (!quizResponse.success || !quizResponse.data) {
    return null;
  }
  const quizSet = quizResponse.data;
  const detailLabels: DashboardBreadcrumbDetailItem[] = [
    {
      label: formatBreadcrumbLabelWithPrefix(
        t("common.route"),
        getSessionBreadcrumbLabel(sessionId, t)
      ),
      href: `/user/practice/session/${sessionId}`,
    },
  ];
  const quizName =
    asNonEmptyString(quizSet.quizName) ??
    t("common.testVar0", {
      var_0: quizId,
    });
  detailLabels.push({
    label: formatBreadcrumbLabelWithPrefix(t("general.test"), quizName),
  });
  if (includeResult) {
    detailLabels.push({
      label: t("common.result"),
    });
  }
  return detailLabels;
}
async function resolveDynamicRouteLabel(
  request: DynamicLabelRequest,
  t: TFunction
): Promise<string | null> {
  const { id, prefix, resource } = request;
  switch (resource) {
    case "session": {
      const label = getSessionBreadcrumbLabel(id, t);
      return formatBreadcrumbLabelWithPrefix(prefix, label);
    }
    case "mentor": {
      const response = await mentorManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }
      const mentorName = asNonEmptyString(response.data.name) ?? t("common.mentorWithId", { id });
      return formatBreadcrumbLabelWithPrefix(prefix, mentorName);
    }
    case "practiceSet": {
      const response = await practiceSetManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }
      const practiceSetName =
        asNonEmptyString(response.data.practiceSetName) ??
        t("general.set1", {
          var_0: id,
        });
      return formatBreadcrumbLabelWithPrefix(prefix, practiceSetName);
    }
    case "quizSet": {
      const response = await quizSetManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }
      const quizName =
        asNonEmptyString(response.data.quizName) ??
        t("common.testVar0", {
          var_0: id,
        });
      return formatBreadcrumbLabelWithPrefix(prefix, quizName);
    }
    case "mentorReview": {
      const response = await mentorReviewManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }
      const reviewedUserName = asNonEmptyString(response.data.user?.name);
      const reviewedSessionId = response.data.session?.id;
      const fallbackLabel =
        typeof reviewedSessionId === "number" && reviewedSessionId > 0
          ? t("common.sessionVar0", {
              var_0: reviewedSessionId,
            })
          : t("general.review", {
              var_0: id,
            });
      return formatBreadcrumbLabelWithPrefix(prefix, reviewedUserName ?? fallbackLabel);
    }
    case "user": {
      const response = await chatManager.getUserDetail(id);
      if (!response.success || !response.data) {
        return null;
      }
      const userRecord = response.data as {
        name?: string;
        fullName?: string;
      };
      const userName =
        asNonEmptyString(userRecord.name) ??
        asNonEmptyString(userRecord.fullName) ??
        t("common.studentVar0", {
          var_0: id,
        });
      return formatBreadcrumbLabelWithPrefix(prefix, userName);
    }
    default:
      return null;
  }
}
export function useDashboardBreadcrumb({
  role,
  pathname,
  activeTab,
  availableTabs,
}: {
  role: DashboardRole;
  pathname: string;
  activeTab: string;
  availableTabs: DashboardTabDefinition[];
}): {
  items: DashboardBreadcrumbItem[];
  isResolvingDynamicLabel: boolean;
} {
  const { t } = useTranslation();
  const routeMatch = useMemo(() => getDashboardRouteMatch(role, pathname, t), [role, pathname, t]);
  const practiceQuizDetailRequest = useMemo((): PracticeQuizDetailRequest | null => {
    const variant = routeMatch?.variant;
    if (variant !== "practiceQuiz" && variant !== "practiceQuizResult") {
      return null;
    }
    const routeParams = routeMatch?.routeParams;
    if (!routeParams) {
      return null;
    }
    const quizId = toPositiveInteger(routeParams.quizId);
    const practiceSetId = toPositiveInteger(routeParams.practiceSetId);
    const sessionId = toPositiveInteger(routeParams.sessionId);
    if (!quizId || !practiceSetId || !sessionId) {
      return null;
    }
    return {
      sessionId,
      quizId,
      practiceSetId,
      includeResult: variant === "practiceQuizResult",
    };
  }, [routeMatch]);
  const roleSpecificDetailChain = useMemo(
    () =>
      resolveRoleSpecificDetailChain({
        role,
        pathname,
        routeParams: routeMatch?.routeParams,
        t,
      }),
    [pathname, role, routeMatch?.routeParams, t]
  );
  const dynamicLabelRequest = useMemo((): DynamicLabelRequest | null => {
    const dynamic = routeMatch?.dynamic;
    if (!dynamic?.id) {
      return null;
    }
    return {
      resource: dynamic.resource,
      id: dynamic.id,
      prefix: dynamic.prefix,
    };
  }, [routeMatch?.dynamic]);
  const { data: practiceQuizDetailLabels, isFetching: isResolvingPracticeQuizDetailLabels } =
    useQuery({
      queryKey: [
        DYNAMIC_BREADCRUMB_QUERY_KEY,
        role,
        pathname,
        routeMatch?.variant,
        practiceQuizDetailRequest,
      ],
      queryFn: async () => {
        if (!practiceQuizDetailRequest) {
          return null;
        }
        try {
          return await resolvePracticeQuizDetailLabels(practiceQuizDetailRequest, t);
        } catch {
          return null;
        }
      },
      enabled: Boolean(practiceQuizDetailRequest),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    });
  const { data: dynamicLabel, isFetching: isResolvingDynamicLabel } = useQuery({
    queryKey: [
      DYNAMIC_BREADCRUMB_QUERY_KEY,
      role,
      pathname,
      routeMatch?.label,
      dynamicLabelRequest,
    ],
    queryFn: async () => {
      if (!dynamicLabelRequest) {
        return null;
      }
      try {
        return await resolveDynamicRouteLabel(dynamicLabelRequest, t);
      } catch {
        return null;
      }
    },
    enabled: Boolean(dynamicLabelRequest) && !practiceQuizDetailRequest && !roleSpecificDetailChain,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const breadcrumbItems = useMemo(
    () =>
      buildDashboardBreadcrumbItems({
        role,
        pathname,
        activeTab,
        availableTabs,
        nestedLabelOverride: dynamicLabel ?? routeMatch?.label,
        detailLabelsOverride: practiceQuizDetailLabels ?? roleSpecificDetailChain ?? undefined,
        t,
      }),
    [
      activeTab,
      availableTabs,
      dynamicLabel,
      pathname,
      practiceQuizDetailLabels,
      role,
      roleSpecificDetailChain,
      routeMatch?.label,
      t,
    ]
  );
  return {
    items: breadcrumbItems,
    isResolvingDynamicLabel: isResolvingDynamicLabel || isResolvingPracticeQuizDetailLabels,
  };
}
