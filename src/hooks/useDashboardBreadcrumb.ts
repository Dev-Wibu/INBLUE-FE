import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  buildDashboardBreadcrumbItems,
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

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const withPrefix = (prefix: string | undefined, value: string): string => {
  if (!prefix) {
    return value;
  }

  return `${prefix}: ${value}`;
};

const getSessionDisplayName = (sessionId: number, roomName?: string): string => {
  return asNonEmptyString(roomName) ?? `Phiên #${sessionId}`;
};

async function resolveDynamicRouteLabel(request: DynamicLabelRequest): Promise<string | null> {
  const { id, prefix, resource } = request;

  switch (resource) {
    case "session": {
      const response = await sessionManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }

      const label = getSessionDisplayName(id, response.data.roomName);
      return withPrefix(prefix, label);
    }

    case "mentor": {
      const response = await mentorManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }

      const mentorName = asNonEmptyString(response.data.name) ?? `Mentor #${id}`;
      return withPrefix(prefix, mentorName);
    }

    case "practiceSet": {
      const response = await practiceSetManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }

      const practiceSetName = asNonEmptyString(response.data.practiceSetName) ?? `Bộ #${id}`;
      return withPrefix(prefix, practiceSetName);
    }

    case "quizSet": {
      const response = await quizSetManager.getById(id);
      if (!response.success || !response.data) {
        return null;
      }

      const quizName = asNonEmptyString(response.data.quizName) ?? `Bài kiểm tra #${id}`;
      return withPrefix(prefix, quizName);
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

      return withPrefix(prefix, reviewedUserName ?? fallbackLabel);
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

      return withPrefix(prefix, userName);
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
    enabled: Boolean(dynamicLabelRequest),
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
      }),
    [activeTab, availableTabs, dynamicLabel, pathname, role, routeMatch?.label]
  );

  return {
    items: breadcrumbItems,
    isResolvingDynamicLabel,
  };
}
