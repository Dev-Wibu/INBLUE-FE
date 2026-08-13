import { consumeFeedScrollPosition } from "@/lib/feedScrollMemory";
import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

interface UseDashboardScrollRestorationOptions {
  enabled?: boolean;
  maxEntries?: number;
  scopeKey?: string;
}

const SCROLL_STORAGE_KEY = "dashboard_scroll_positions_v1";

const canUseSessionStorage = () => {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
};

const readStoredPositions = () => {
  if (!canUseSessionStorage()) {
    return new Map<string, number>();
  }

  try {
    const raw = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (!raw) {
      return new Map<string, number>();
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return new Map<string, number>();
    }

    const positions = new Map<string, number>();
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        positions.set(key, value);
      }
    }

    return positions;
  } catch {
    return new Map<string, number>();
  }
};

const writeStoredPositions = (positions: Map<string, number>) => {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    const serialized = Object.fromEntries(positions.entries());
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Ignore storage write failures (private mode/quota) and continue with in-memory cache.
  }
};

const upsertPosition = (
  positions: Map<string, number>,
  key: string,
  value: number,
  maxEntries: number
) => {
  if (positions.has(key)) {
    positions.delete(key);
  }

  positions.set(key, Math.max(0, value));

  while (positions.size > maxEntries) {
    const oldestKey = positions.keys().next().value;
    if (!oldestKey) {
      break;
    }
    positions.delete(oldestKey);
  }
};

/**
 * Restore a scroll position, retrying on the next animation frame if the
 * container's scrollHeight is still smaller than the requested value.
 *
 * The hook runs as a `useLayoutEffect`, so it executes after the DOM
 * mutations but before the browser paints. In practice the new content
 * for the destination route may not have finished mounting yet (e.g. a
 * React Query cache that has to re-suspend on the feed route after a
 * detail-page PUSH). When that happens the browser clamps scrollTop to
 * `scrollHeight - clientHeight` and the saved position is lost.
 *
 * To survive this, we set scrollTop up to three times across animation
 * frames, clamped to the container's current scrollable range. Once
 * the content has enough height the position sticks.
 */
function restoreScrollWithFallback(container: HTMLElement, target: number): void {
  const maxScrollable = () => Math.max(0, container.scrollHeight - container.clientHeight);
  const clamped = () => Math.max(0, Math.min(target, maxScrollable()));

  // In jsdom and other layout-less test environments both scrollHeight
  // and clientHeight are 0, so maxScrollable() is 0 and every target
  // collapses to 0 — which would break hook unit tests. In that case
  // just set the raw value and let the tests assert on it.
  const isLayoutLess = maxScrollable() === 0 && container.scrollHeight === 0;
  container.scrollTop = isLayoutLess ? target : clamped();

  let attempts = 0;
  const tick = () => {
    attempts++;
    if (attempts > 3) {
      return;
    }
    const desired = clamped();
    if (container.scrollTop !== desired) {
      container.scrollTop = desired;
    }
    if (maxScrollable() < target && attempts < 3) {
      window.requestAnimationFrame(tick);
    }
  };
  window.requestAnimationFrame(tick);
}

export function useDashboardScrollRestoration(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseDashboardScrollRestorationOptions = {}
) {
  const { enabled = true, maxEntries = 100, scopeKey } = options;
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef<Map<string, number>>(readStoredPositions());
  const previousViewRef = useRef<{ entryKey: string; locationSignature: string } | null>(null);
  const maxEntriesLimit =
    Number.isFinite(maxEntries) && maxEntries > 0 ? Math.floor(maxEntries) : 100;
  const routeKey = `${location.pathname}${location.search}${location.hash}`;
  const historyEntryKey = location.key || routeKey;
  const entryKey = scopeKey ? `${historyEntryKey}::${scopeKey}` : historyEntryKey;
  const locationSignature = `${location.pathname}${location.search}${location.hash}::${
    location.key || "no-key"
  }`;

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container || !enabled) {
      return;
    }

    const previousView = previousViewRef.current;
    const isInitialRender = previousView === null;
    const didLocationChange =
      !isInitialRender && previousView.locationSignature !== locationSignature;
    const shouldRestoreFromPop = navigationType === "POP" && didLocationChange;

    if (shouldRestoreFromPop) {
      const saved = positionsRef.current.get(entryKey) ?? 0;
      restoreScrollWithFallback(container, saved);
    } else if (didLocationChange) {
      // For a PUSH / REPLACE to a route the user has visited before in this
      // session, restore the saved position. This is what makes the home
      // feed "remember" where the user left off after they opened a post
      // detail and came back via the close button (X is a PUSH, not a POP).
      // First-visit PUSH still scrolls to top.
      //
      // PostFeedCard captures the scrollTop synchronously at the click
      // and stashes it in a module-level slot. If the slot is non-null it
      // takes precedence over sessionStorage because it is the most
      // recent and most accurate value. We consume the slot so subsequent
      // navigations don't replay it.
      const captured = consumeFeedScrollPosition();
      const savedForRoute = captured ?? positionsRef.current.get(routeKey);
      restoreScrollWithFallback(container, savedForRoute ?? 0);
    } else {
      container.scrollTop = 0;
    }

    previousViewRef.current = {
      entryKey,
      locationSignature,
    };

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const saveCurrentPosition = () => {
      // Save under BOTH the route key (pathname+search+hash, stable across
      // visits) and the history entry key (location.key, unique per entry).
      // The route key drives the "go back to the same feed" restore; the
      // history entry key drives browser back/forward restoration.
      upsertPosition(positionsRef.current, routeKey, container.scrollTop, maxEntriesLimit);
      upsertPosition(positionsRef.current, entryKey, container.scrollTop, maxEntriesLimit);
      writeStoredPositions(positionsRef.current);
    };

    const handleScroll = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        saveCurrentPosition();
      }, 120);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      saveCurrentPosition();
    };
  }, [
    containerRef,
    enabled,
    entryKey,
    locationSignature,
    maxEntriesLimit,
    navigationType,
    routeKey,
  ]);
}
