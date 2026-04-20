import { describe, expect, it } from "vitest";

import {
  buildDashboardBreadcrumbItems,
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
      dynamic: {
        resource: "mentor",
        id: 42,
        rawId: "42",
        prefix: "Mentor",
      },
    });
  });

  it("fallback label thân thiện khi route chưa khai báo", () => {
    const nestedLabel = getDashboardNestedRouteLabel("user", "/user/custom-route-name");

    expect(nestedLabel).toBe("Custom Route Name");
  });
});
