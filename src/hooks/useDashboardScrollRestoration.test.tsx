import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDashboardScrollRestoration } from "./useDashboardScrollRestoration";

function ScrollHarness({
  enabled = true,
  scopeKey,
  maxEntries,
}: {
  enabled?: boolean;
  scopeKey?: string;
  maxEntries?: number;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useDashboardScrollRestoration(containerRef, { enabled, scopeKey, maxEntries });

  return (
    <div>
      <button onClick={() => navigate("/dashboard?tab=b")}>Go B</button>
      <button onClick={() => navigate("/dashboard?tab=c")}>Go C</button>
      <button onClick={() => navigate(-1)}>Go Back</button>
      <div
        data-testid="scroll-container"
        ref={containerRef}
        style={{ height: 120, overflowY: "auto" }}>
        <div style={{ height: 1200 }}>Scrollable content</div>
      </div>
    </div>
  );
}

function ScopeSwitchHarness() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scopeKey, setScopeKey] = useState("scope-a");

  useDashboardScrollRestoration(containerRef, { scopeKey });

  return (
    <div>
      <button
        onClick={() => {
          setScopeKey((prev) => (prev === "scope-a" ? "scope-b" : "scope-a"));
        }}>
        Switch Scope
      </button>
      <div
        data-testid="scroll-container"
        ref={containerRef}
        style={{ height: 120, overflowY: "auto" }}>
        <div style={{ height: 1200 }}>Scrollable content</div>
      </div>
    </div>
  );
}

describe("useDashboardScrollRestoration", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("does not reset scroll on first push and restores on pop", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScrollHarness />
      </MemoryRouter>
    );

    const scrollContainer = screen.getByTestId("scroll-container");
    scrollContainer.scrollTop = 320;

    // First visit to /dashboard?tab=b (PUSH). With no saved position
    // for this route the hook deliberately does NOT touch scrollTop,
    // so child components (e.g. CommunityFeedPage reading from
    // sessionStorage) own the restore. The previous behaviour of
    // clobbering to 0 raced with the child restore and was wrong.
    fireEvent.click(screen.getByRole("button", { name: "Go B" }));

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(320);
    });

    scrollContainer.scrollTop = 140;
    fireEvent.click(screen.getByRole("button", { name: "Go Back" }));

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(320);
    });
  });

  it("does not force scroll position when disabled", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScrollHarness enabled={false} />
      </MemoryRouter>
    );

    const scrollContainer = screen.getByTestId("scroll-container");
    scrollContainer.scrollTop = 260;

    fireEvent.click(screen.getByRole("button", { name: "Go B" }));

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(260);
    });
  });

  it("resets scroll when scope changes without route navigation", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScopeSwitchHarness />
      </MemoryRouter>
    );

    const scrollContainer = screen.getByTestId("scroll-container");
    scrollContainer.scrollTop = 310;

    fireEvent.click(screen.getByRole("button", { name: "Switch Scope" }));

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(0);
    });

    scrollContainer.scrollTop = 175;

    fireEvent.click(screen.getByRole("button", { name: "Switch Scope" }));

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(0);
    });
  });

  it("handles null containerRef without errors", async () => {
    function NullRefHarness() {
      const nullRef = useRef<HTMLDivElement>(null);
      // ref.current is null by default
      useDashboardScrollRestoration(nullRef);

      return <div data-testid="noop">No container</div>;
    }

    expect(() => {
      render(
        <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
          <NullRefHarness />
        </MemoryRouter>
      );
    }).not.toThrow();

    expect(screen.getByTestId("noop")).toBeTruthy();
  });

  it("handles corrupt sessionStorage gracefully", async () => {
    window.sessionStorage.setItem("dashboard_scroll_positions_v1", "not-valid-json!!!");

    render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScrollHarness />
      </MemoryRouter>
    );

    const scrollContainer = screen.getByTestId("scroll-container");
    scrollContainer.scrollTop = 100;

    // Corrupt data is ignored; PUSH with no usable saved value leaves
    // scrollTop alone so child components can own restoration.
    fireEvent.click(screen.getByRole("button", { name: "Go B" }));

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(100);
    });
  });

  it("handles non-object JSON in sessionStorage (e.g. string or number)", async () => {
    window.sessionStorage.setItem("dashboard_scroll_positions_v1", JSON.stringify("just a string"));

    render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScrollHarness />
      </MemoryRouter>
    );

    const scrollContainer = screen.getByTestId("scroll-container");
    scrollContainer.scrollTop = 0;

    // Should not crash — valid JSON but not an object → starts fresh
    fireEvent.click(screen.getByRole("button", { name: "Go B" }));

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(0);
    });
  });

  it("evicts oldest entries when maxEntries is exceeded", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScrollHarness enabled={true} maxEntries={4} />
      </MemoryRouter>
    );

    const scrollContainer = screen.getByTestId("scroll-container");

    // Each navigation now stores up to 2 keys per position (the route key
    // /dashboard?tab=X and the history entry key). With maxEntries=4 we
    // can keep one full round of positions before eviction kicks in.
    scrollContainer.scrollTop = 100;

    // Navigate to tab=b → saves tab=a entry (route + entry). PUSH with
    // no saved value leaves scrollTop untouched.
    fireEvent.click(screen.getByRole("button", { name: "Go B" }));
    await waitFor(() => expect(scrollContainer.scrollTop).toBe(100));

    scrollContainer.scrollTop = 200;

    // Navigate to tab=c → saves tab=b entry.
    fireEvent.click(screen.getByRole("button", { name: "Go C" }));
    await waitFor(() => expect(scrollContainer.scrollTop).toBe(200));

    scrollContainer.scrollTop = 300;

    // Navigate back → cleanup saves tab=c entry. Now 6 entries exist in
    // Map, but maxEntries=4 so the oldest two (a route, a entry) should
    // be evicted.
    fireEvent.click(screen.getByRole("button", { name: "Go Back" }));
    // Restored scroll should be tab=b's saved position (200), not tab=c's (300)
    await waitFor(() => expect(scrollContainer.scrollTop).toBe(200));

    const stored = JSON.parse(
      window.sessionStorage.getItem("dashboard_scroll_positions_v1") || "{}"
    );
    const keys = Object.keys(stored);
    // At most maxEntries (4) entries should remain — eviction removed the oldest
    expect(keys.length).toBeLessThanOrEqual(4);
  });

  it("saves scroll position via debounced scroll handler", async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScrollHarness />
      </MemoryRouter>
    );

    const scrollContainer = screen.getByTestId("scroll-container");

    // Fire scroll event — debounce timer starts
    scrollContainer.scrollTop = 150;
    fireEvent.scroll(scrollContainer);

    // Advance less than debounce threshold — should NOT save yet
    vi.advanceTimersByTime(100);
    const earlyStored = JSON.parse(
      window.sessionStorage.getItem("dashboard_scroll_positions_v1") || "{}"
    );
    expect(Object.keys(earlyStored)).toHaveLength(0);

    // Advance past 120ms debounce — should save now
    vi.advanceTimersByTime(30);
    const stored = JSON.parse(
      window.sessionStorage.getItem("dashboard_scroll_positions_v1") || "{}"
    );
    expect(Object.keys(stored).length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("resets debounce timer on rapid scroll events", async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScrollHarness />
      </MemoryRouter>
    );

    const scrollContainer = screen.getByTestId("scroll-container");

    // First scroll event
    scrollContainer.scrollTop = 100;
    fireEvent.scroll(scrollContainer);
    vi.advanceTimersByTime(80);

    // Second scroll event — resets debounce timer
    scrollContainer.scrollTop = 200;
    fireEvent.scroll(scrollContainer);
    vi.advanceTimersByTime(80);

    // Still not saved (only 80ms since last event)
    const earlyStored = JSON.parse(
      window.sessionStorage.getItem("dashboard_scroll_positions_v1") || "{}"
    );
    expect(Object.keys(earlyStored)).toHaveLength(0);

    // Advance past debounce from second event
    vi.advanceTimersByTime(50);
    const stored = JSON.parse(
      window.sessionStorage.getItem("dashboard_scroll_positions_v1") || "{}"
    );
    expect(Object.keys(stored).length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("falls back to default maxEntries (100) for invalid values", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScrollHarness enabled={true} maxEntries={0} />
      </MemoryRouter>
    );

    const scrollContainer = screen.getByTestId("scroll-container");

    // Save position for tab=a
    scrollContainer.scrollTop = 50;
    fireEvent.click(screen.getByRole("button", { name: "Go B" }));
    await waitFor(() => expect(scrollContainer.scrollTop).toBe(50));

    // Save position for tab=b
    scrollContainer.scrollTop = 100;
    fireEvent.click(screen.getByRole("button", { name: "Go C" }));
    await waitFor(() => expect(scrollContainer.scrollTop).toBe(100));

    const stored = JSON.parse(
      window.sessionStorage.getItem("dashboard_scroll_positions_v1") || "{}"
    );
    // With maxEntries=0 → fallback to 100 → all entries should be kept.
    // Each route contributes 2 keys (route key + history entry key), so
    // tab=a + tab+b = 4 entries total.
    expect(Object.keys(stored).length).toBe(4);
  });

  it("restores scroll on push when revisiting a known route", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScrollHarness />
      </MemoryRouter>
    );

    const scrollContainer = screen.getByTestId("scroll-container");
    scrollContainer.scrollTop = 480;

    // First visit to /dashboard?tab=b (PUSH). With no saved position
    // for this route yet the hook leaves scrollTop alone — child
    // components own the restoration. The /a value (480) stays.
    fireEvent.click(screen.getByRole("button", { name: "Go B" }));
    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(480);
    });

    // Scroll the b page, then go back to a.
    scrollContainer.scrollTop = 250;
    fireEvent.click(screen.getByRole("button", { name: "Go Back" }));
    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(480);
    });

    // Now PUSH to b again. The hook should restore the saved position
    // (250) for the route /dashboard?tab=b — that's the whole point of
    // restoring by route key, not just by history entry.
    fireEvent.click(screen.getByRole("button", { name: "Go B" }));
    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(250);
    });
  });

  it("cleans up scroll listener on unmount", async () => {
    const removeSpy = vi.spyOn(HTMLDivElement.prototype, "removeEventListener");

    const { unmount } = render(
      <MemoryRouter initialEntries={["/dashboard?tab=a"]}>
        <ScrollHarness />
      </MemoryRouter>
    );

    unmount();

    // Should have removed at least one scroll listener during cleanup
    const scrollRemoves = removeSpy.mock.calls.filter((c) => c[0] === "scroll");
    expect(scrollRemoves.length).toBeGreaterThan(0);

    removeSpy.mockRestore();
  });
});
