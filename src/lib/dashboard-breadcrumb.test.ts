import i18n from "@/lib/i18n";
import { describe, expect, it } from "vitest";
import {
  buildDashboardBreadcrumbItems,
  formatBreadcrumbLabelWithPrefix,
  getDashboardNestedRouteLabel,
  getDashboardRouteMatch,
  getDashboardTabFromPath,
} from "./dashboard-breadcrumb";
const t = i18n.t.bind(i18n);
describe("dashboard-breadcrumb", () => {
  it(t("general.createABasicBreadcrumbFor"), () => {
    const items = buildDashboardBreadcrumbItems({
      role: "user",
      pathname: "/user",
      activeTab: "homeFeed",
      availableTabs: [
        {
          type: "homeFeed",
          label: t("common.home"),
        },
      ],
      t,
    });
    expect(items).toEqual([
      {
        label: t("common.user"),
        href: "/user?tab=homeFeed",
        kind: "root",
      },
      {
        label: t("common.home"),
        kind: "tab",
      },
    ]);
  });
  it(t("general.inferTheCorrectTabFrom"), () => {
    const tab = getDashboardTabFromPath({
      role: "mentor",
      pathname: "/mentor/sessions/123/review",
      defaultTab: "overview",
      t,
    });
    expect(tab).toBe("sessions");
  });
  it(t("general.nestedLabelOverrideIsPreferred"), () => {
    const items = buildDashboardBreadcrumbItems({
      role: "mentor",
      pathname: "/mentor/sessions/123",
      activeTab: "sessions",
      availableTabs: [
        {
          type: "sessions",
          label: t("common.interviewSession"),
        },
      ],
      nestedLabelOverride: t("general.sessionSession1776232524937"),
      t,
    });
    expect(items.at(-1)).toEqual({
      label: t("general.sessionSession1776232524937"),
      kind: "detail",
    });
  });
  it(t("general.returnsRouteMetadataWithDynamic"), () => {
    const routeMatch = getDashboardRouteMatch("user", "/user/mentors/42", t);
    expect(routeMatch).toEqual({
      label: t("general.mentorProfile"),
      tabType: "mentors",
      variant: undefined,
      routeParams: {
        mentorId: "42",
      },
      dynamic: {
        resource: "mentor",
        id: 42,
        rawId: "42",
        prefix: "Mentor",
      },
    });
  });
  it(t("general.returnsTheRouteVariantAnd"), () => {
    const routeMatch = getDashboardRouteMatch(
      "user",
      "/user/practice/session/9/1/quiz/11/result",
      t
    );
    expect(routeMatch).toEqual({
      label: t("general.testResults"),
      tabType: "practice",
      variant: "practiceQuizResult",
      routeParams: {
        sessionId: "9",
        practiceSetId: "1",
        quizId: "11",
      },
      dynamic: {
        resource: "quizSet",
        id: 11,
        rawId: "11",
        prefix: t("common.result"),
      },
    });
  });
  it(t("general.prefersTheDetailLabelsString"), () => {
    const items = buildDashboardBreadcrumbItems({
      role: "user",
      pathname: "/user/practice/session/9/1/quiz/11/result",
      activeTab: "practice",
      availableTabs: [
        {
          type: "practice",
          label: t("common.trainingSet"),
        },
      ],
      detailLabelsOverride: [
        {
          label: t("general.roadmapSession9"),
          href: "/user/practice/session/9",
        },
        {
          label: t("general.testDay3"),
        },
        {
          label: t("common.result"),
        },
      ],
      t,
    });
    expect(items).toEqual([
      {
        label: t("common.user"),
        href: "/user?tab=homeFeed",
        kind: "root",
      },
      {
        label: t("common.trainingSet"),
        href: "/user?tab=practice",
        kind: "tab",
      },
      {
        label: t("general.roadmapSession9"),
        href: "/user/practice/session/9",
        kind: "detail",
      },
      {
        label: t("general.testDay3"),
        kind: "detail",
      },
      {
        label: t("common.result"),
        kind: "detail",
      },
    ]);
  });
  it(t("general.sanitizeThePrefixWhenValue"), () => {
    expect(formatBreadcrumbLabelWithPrefix(t("general.test"), t("general.testDay3"))).toBe(
      t("general.testDay3")
    );
    expect(formatBreadcrumbLabelWithPrefix(t("common.route"), "session-1776220472420")).toBe(
      t("general.routeSession1776220472420")
    );
  });
  it(t("general.friendlyFallbackLabelWhenRoute"), () => {
    const nestedLabel = getDashboardNestedRouteLabel("user", "/user/custom-route-name", t);
    expect(nestedLabel).toBe("Custom Route Name");
  });
});
