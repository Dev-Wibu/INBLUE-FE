import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardChromeTabs } from "./DashboardChromeTabs";

const baseTheme = {
  bg: "bg-gray-100",
  tabActiveBorder: "border-gray-300",
  tabActiveBg: "bg-white",
  tabInactiveBg: "bg-gray-200",
  tabInactiveHover: "hover:bg-gray-100",
  closeHover: "hover:bg-gray-300",
  addBtnBg: "bg-gray-200",
  addBtnHover: "hover:bg-gray-300",
  menuHover: "hover:bg-gray-100",
};

const baseProps = {
  tabs: [{ id: "dashboard-1", type: "dashboard", title: "Dashboard" }],
  activeTabId: "dashboard-1",
  onTabSelect: vi.fn(),
  onTabClose: vi.fn(),
  onNewTab: vi.fn(),
  menuGroups: [
    {
      items: [{ type: "users", label: "Quản lý người dùng" }],
    },
  ],
  theme: baseTheme,
};

describe("DashboardChromeTabs", () => {
  it("gọi menu action khi chọn từ menu dấu cộng", () => {
    const onCloseAllTabs = vi.fn();

    render(
      <DashboardChromeTabs
        {...baseProps}
        menuActions={[
          {
            id: "close-all-tabs",
            label: "Đóng tất cả tab",
            onSelect: onCloseAllTabs,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Mở menu tab" }));
    fireEvent.click(screen.getByRole("button", { name: "Đóng tất cả tab" }));

    expect(onCloseAllTabs).toHaveBeenCalledTimes(1);
  });

  it("không gọi menu action khi action bị disable", () => {
    const onCloseAllTabs = vi.fn();

    render(
      <DashboardChromeTabs
        {...baseProps}
        menuActions={[
          {
            id: "close-all-tabs",
            label: "Đóng tất cả tab",
            onSelect: onCloseAllTabs,
            disabled: true,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Mở menu tab" }));
    fireEvent.click(screen.getByRole("button", { name: "Đóng tất cả tab" }));

    expect(onCloseAllTabs).not.toHaveBeenCalled();
  });
});
