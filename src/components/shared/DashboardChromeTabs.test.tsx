import i18n from "@/lib/i18n";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardChromeTabs } from "./DashboardChromeTabs";
const t = i18n.t.bind(i18n);
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
  tabs: [
    {
      id: "dashboard-1",
      type: "dashboard",
      title: "Dashboard",
    },
  ],
  activeTabId: "dashboard-1",
  onTabSelect: vi.fn(),
  onTabClose: vi.fn(),
  onNewTab: vi.fn(),
  menuGroups: [
    {
      items: [
        {
          type: "users",
          label: t("common.userManagement"),
        },
      ],
    },
  ],
  theme: baseTheme,
};
describe("DashboardChromeTabs", () => {
  it(t("compShared.callMenuActionWhenSelecting"), () => {
    const onCloseAllTabs = vi.fn();
    render(
      <DashboardChromeTabs
        {...baseProps}
        menuActions={[
          {
            id: "close-all-tabs",
            label: t("common.closeAllTabs"),
            onSelect: onCloseAllTabs,
          },
        ]}
      />
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: t("compShared.openTheTabMenu"),
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: t("common.closeAllTabs"),
      })
    );
    expect(onCloseAllTabs).toHaveBeenCalledTimes(1);
  });
  it(t("compShared.doNotCallTheAction"), () => {
    const onCloseAllTabs = vi.fn();
    render(
      <DashboardChromeTabs
        {...baseProps}
        menuActions={[
          {
            id: "close-all-tabs",
            label: t("common.closeAllTabs"),
            onSelect: onCloseAllTabs,
            disabled: true,
          },
        ]}
      />
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: t("compShared.openTheTabMenu"),
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: t("common.closeAllTabs"),
      })
    );
    expect(onCloseAllTabs).not.toHaveBeenCalled();
  });
  it(t("compShared.holdTheStickyPlusButton"), () => {
    render(
      <DashboardChromeTabs
        {...baseProps}
        tabs={[
          {
            id: "dashboard-1",
            type: "dashboard",
            title: "Dashboard",
          },
          {
            id: "users-1",
            type: "users",
            title: t("common.userManagement"),
          },
        ]}
        activeTabId="dashboard-1"
      />
    );
    const strip = screen.getByTestId("chrome-tabs-full-strip");
    const plusButton = within(strip).getByRole("button", {
      name: t("compShared.openTheTabMenu"),
    });
    expect(plusButton).toBeTruthy();
    const plusWrapper = screen.getByTestId("chrome-tabs-new-tab");
    expect(plusWrapper.className).toContain("sticky");
    expect(plusWrapper.className).toContain("right-0");
    fireEvent.click(plusButton);
    const menuContainer = screen
      .getByRole("button", {
        name: t("common.userManagement"),
      })
      .closest(".fixed");
    expect(menuContainer).toBeTruthy();
    const dashboardTab = screen.getByText("Dashboard").closest("div");
    expect(dashboardTab?.getAttribute("style") || "").toContain("clamp(");
  });
});
