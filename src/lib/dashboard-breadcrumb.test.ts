import { describe, expect, it } from "vitest";

import {
  buildDashboardBreadcrumbItems,
  formatBreadcrumbLabelWithPrefix,
  getDashboardNestedRouteLabel,
  getDashboardRouteMatch,
  getDashboardTabFromPath,
} from "./dashboard-breadcrumb";

describe("dashboard-breadcrumb", () => {
  it("tạo breadcrumb cơ bản cho trang gốc theo role", () => {
    const items = buildDashboardBreadcrumbItems({
      role: "user",
      pathname: "/user",
      activeTab: "homeFeed",
      availableTabs: [{ type: "homeFeed", label: "Trang chủ" }],
    });

    expect(items).toEqual([
      { label: "Người dùng", href: "/user?tab=homeFeed", kind: "root" },
      { label: "Trang chủ", kind: "tab" },
    ]);
  });

  it("suy ra đúng tab từ nested route", () => {
    const tab = getDashboardTabFromPath({
      role: "mentor",
      pathname: "/mentor/sessions/123/review",
      defaultTab: "overview",
    });

    expect(tab).toBe("sessions");
  });

  it("ưu tiên nested label override khi có dữ liệu động", () => {
    const items = buildDashboardBreadcrumbItems({
      role: "mentor",
      pathname: "/mentor/sessions/123",
      activeTab: "sessions",
      availableTabs: [{ type: "sessions", label: "Phiên phỏng vấn" }],
      nestedLabelOverride: "Phiên: session-1776232524937",
    });

    expect(items.at(-1)).toEqual({
      label: "Phiên: session-1776232524937",
      kind: "detail",
    });
  });

  it("trả metadata route có dynamic resolver cho đường dẫn chi tiết", () => {
    const routeMatch = getDashboardRouteMatch("user", "/user/mentors/42");

    expect(routeMatch).toEqual({
      label: "Hồ sơ mentor",
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

  it("trả route variant và params cho đường dẫn quiz result", () => {
    const routeMatch = getDashboardRouteMatch("user", "/user/practice/1/quiz/11/result");

    expect(routeMatch).toEqual({
      label: "Kết quả bài kiểm tra",
      tabType: "practice",
      variant: "practiceQuizResult",
      routeParams: {
        practiceSetId: "1",
        quizId: "11",
      },
      dynamic: {
        resource: "quizSet",
        id: 11,
        rawId: "11",
        prefix: "Kết quả",
      },
    });
  });

  it("ưu tiên chuỗi detail labels khi được cung cấp", () => {
    const items = buildDashboardBreadcrumbItems({
      role: "user",
      pathname: "/user/practice/1/quiz/11/result",
      activeTab: "practice",
      availableTabs: [{ type: "practice", label: "Bộ luyện tập" }],
      detailLabelsOverride: ["Lộ trình: session-1776220472420", "Bài kiểm tra: Ngày 3", "Kết quả"],
    });

    expect(items).toEqual([
      { label: "Người dùng", href: "/user?tab=homeFeed", kind: "root" },
      { label: "Bộ luyện tập", href: "/user?tab=practice", kind: "tab" },
      { label: "Lộ trình: session-1776220472420", kind: "detail" },
      { label: "Bài kiểm tra: Ngày 3", kind: "detail" },
      { label: "Kết quả", kind: "detail" },
    ]);
  });

  it("khử trùng tiền tố khi value đã có sẵn prefix", () => {
    expect(formatBreadcrumbLabelWithPrefix("Bài kiểm tra", "Bài kiểm tra: Ngày 3")).toBe(
      "Bài kiểm tra: Ngày 3"
    );
    expect(formatBreadcrumbLabelWithPrefix("Lộ trình", "session-1776220472420")).toBe(
      "Lộ trình: session-1776220472420"
    );
  });

  it("fallback label thân thiện khi route chưa khai báo", () => {
    const nestedLabel = getDashboardNestedRouteLabel("user", "/user/custom-route-name");

    expect(nestedLabel).toBe("Custom Route Name");
  });
});
