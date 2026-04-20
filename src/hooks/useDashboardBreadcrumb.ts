import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  buildDashboardBreadcrumbItems,
  formatBreadcrumbLabelWithPrefix,
  getDashboardRouteMatch,
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
import { sessionManager } from "@/services/session.manager";

const DYNAMIC_BREADCRUMB_QUERY_KEY = "dashboard-breadcrumb-dynamic-label";

interface DynamicLabelRequest {
  resource: NonNullable<DashboardRouteMatch["dynamic"]>["resource"];
  id: number;
  prefix?: string;
}

interface PracticeQuizDetailRequest {
  quizId: number;
  practiceSetId?: number;
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

const getSessionDisplayName = (sessionId: number, roomName?: string): string => {
  return asNonEmptyString(roomName) ?? `Phiên #${sessionId}`;
};

async function resolvePracticeQuizDetailLabels(
  request: PracticeQuizDetailRequest
): Promise<string[] | null> {
  const { includeResult, practiceSetId, quizId } = request;
  const quizResponse = await quizSetManager.getById(quizId);
  if (!quizResponse.success || !quizResponse.data) {
    return null;
  }

  const quizSet = quizResponse.data;
  let interviewSessionId = quizSet.practiceSet?.interviewSessionId;

  if ((!interviewSessionId || interviewSessionId <= 0) && practiceSetId) {
    const practiceSetResponse = await practiceSetManager.getById(practiceSetId);
    if (practiceSetResponse.success && practiceSetResponse.data?.interviewSessionId) {
      interviewSessionId = practiceSetResponse.data.interviewSessionId;
    }
  }

  const detailLabels: string[] = [];
  if (typeof interviewSessionId === "number" && interviewSessionId > 0) {
    let sessionLabel = `Phiên #${interviewSessionId}`;
    const sessionResponse = await sessionManager.getById(interviewSessionId);
    if (sessionResponse.success && sessionResponse.data) {
      sessionLabel = getSessionDisplayName(interviewSessionId, sessionResponse.data.roomName);
    }

    detailLabels.push(formatBreadcrumbLabelWithPrefix("Lộ trình", sessionLabel));
  }

  const quizName = asNonEmptyString(quizSet.quizName) ?? `Bài kiểm tra #${quizId}`;
  detailLabels.push(formatBreadcrumbLabelWithPrefix("Bài kiểm tra", quizName));

  if (includeResult) {
    detailLabels.push("Kết quả");
  }

  return detailLabels;
}

async function resolveDynamicRouteLabel(request: DynamicLabelRequest): Promise<string | null> {
  const { id, prefix, resource } = request;

  switch (resource) {
    case "session": {
      const response = await sessionManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }

      const label = getSessionDisplayName(id, response.data.roomName);
      return formatBreadcrumbLabelWithPrefix(prefix, label);
    }

    case "mentor": {
      const response = await mentorManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }

      const mentorName = asNonEmptyString(response.data.name) ?? `Mentor #${id}`;
      return formatBreadcrumbLabelWithPrefix(prefix, mentorName);
    }

    case "practiceSet": {
      const response = await practiceSetManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }

      const practiceSetName = asNonEmptyString(response.data.practiceSetName) ?? `Bộ #${id}`;
      return formatBreadcrumbLabelWithPrefix(prefix, practiceSetName);
    }

    case "quizSet": {
      const response = await quizSetManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }

      const quizName = asNonEmptyString(response.data.quizName) ?? `Bài kiểm tra #${id}`;
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
          ? `Phiên #${reviewedSessionId}`
          : `Đánh giá #${id}`;

      return formatBreadcrumbLabelWithPrefix(prefix, reviewedUserName ?? fallbackLabel);
    }

    case "user": {
      const response = await chatManager.getUserDetail(id);
      if (!response.success || !response.data) {
        return null;
      }

      const userRecord = response.data as { name?: string; fullName?: string };
      const userName =
        asNonEmptyString(userRecord.name) ??
        asNonEmptyString(userRecord.fullName) ??
        `Học viên #${id}`;

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
  const routeMatch = useMemo(() => getDashboardRouteMatch(role, pathname), [role, pathname]);
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
    if (!quizId) {
      return null;
    }

    return {
      quizId,
      practiceSetId: toPositiveInteger(routeParams.practiceSetId),
      includeResult: variant === "practiceQuizResult",
    };
  }, [routeMatch]);

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
          return await resolvePracticeQuizDetailLabels(practiceQuizDetailRequest);
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
        return await resolveDynamicRouteLabel(dynamicLabelRequest);
      } catch {
        return null;
      }
    },
    enabled: Boolean(dynamicLabelRequest) && !practiceQuizDetailRequest,
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
        detailLabelsOverride: practiceQuizDetailLabels ?? undefined,
      }),
    [
      activeTab,
      availableTabs,
      dynamicLabel,
      pathname,
      practiceQuizDetailLabels,
      role,
      routeMatch?.label,
    ]
  );

  return {
    items: breadcrumbItems,
    isResolvingDynamicLabel: isResolvingDynamicLabel || isResolvingPracticeQuizDetailLabels,
  };
}
