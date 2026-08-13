/**
 * Persists the dashboard content area's scroll position across a
 * navigate-to-detail / navigate-back-to-feed round-trip.
 *
 * Used by PostFeedCard.openDetailPage (writes) and CommunityFeedPage's
 * restore effect (reads + clears). Survives a hard refresh on the feed
 * route by being keyed on the post id, so the next visit to that feed
 * will not accidentally re-apply a stale position.
 */
const STORAGE_KEY = "homeFeed:scrollByPost";

export type SavedFeedScroll = {
  scrollTop: number;
  postId: number;
};

export function saveFeedScrollPosition(value: SavedFeedScroll): void {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function readFeedScrollPosition(): SavedFeedScroll | null {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.scrollTop === "number" &&
      Number.isFinite(parsed.scrollTop) &&
      typeof parsed.postId === "number"
    ) {
      return parsed as SavedFeedScroll;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearFeedScrollPosition(): void {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
