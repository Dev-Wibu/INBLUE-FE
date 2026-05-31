import i18n from "@/lib/i18n";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTabsState } from "./useTabsState";
const t = i18n.t.bind(i18n);
const AVAILABLE_TABS = [
  {
    type: "dashboard",
    label: "Dashboard",
  },
  {
    type: "users",
    label: t("common.userManagement"),
  },
  {
    type: "mentors",
    label: t("common.mentorManagement"),
  },
];
const createWrapper = (initialEntry = "/admin?tab=dashboard") => {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );
};
describe("useTabsState", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it(t("general.resettabstoRetainsExactlyOneTarget"), async () => {
    const { result } = renderHook(
      () =>
        useTabsState({
          storageKey: "admin_reset_tabs_test",
          defaultTab: "dashboard",
          availableTabs: AVAILABLE_TABS,
        }),
      {
        wrapper: createWrapper("/admin?tab=users"),
      }
    );
    await waitFor(() => {
      expect(result.current.activeTab).toBe("users");
    });
    act(() => {
      result.current.openTab("mentors");
    });
    await waitFor(() => {
      expect(result.current.openTabs.length).toBeGreaterThan(1);
    });
    act(() => {
      result.current.resetTabsTo("dashboard");
    });
    await waitFor(() => {
      expect(result.current.activeTab).toBe("dashboard");
      expect(result.current.openTabs).toHaveLength(1);
      expect(result.current.openTabs[0]?.type).toBe("dashboard");
    });
  });
  it(t("general.ignoreResettabstoWhenTabIs"), async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(
      () =>
        useTabsState({
          storageKey: "admin_reset_invalid_tab_test",
          defaultTab: "dashboard",
          availableTabs: AVAILABLE_TABS,
        }),
      {
        wrapper: createWrapper("/admin?tab=dashboard"),
      }
    );
    const tabTypesBefore = result.current.openTabs.map((tab) => tab.type);
    act(() => {
      result.current.resetTabsTo("invalid-tab");
    });
    await waitFor(() => {
      expect(result.current.openTabs.map((tab) => tab.type)).toEqual(tabTypesBefore);
      expect(result.current.activeTab).toBe("dashboard");
    });
    warnSpy.mockRestore();
  });
});
