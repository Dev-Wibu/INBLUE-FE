/**
 * Cross-component signal for the home feed scroll position.
 *
 * PostFeedCard captures `scrollTop` synchronously at the moment the user
 * clicks a post ("I want to read this"). The dashboard's
 * useDashboardScrollRestoration hook reads this on the way back from the
 * detail page and restores the feed to where the user left off.
 *
 * Why this exists in addition to the hook's own cleanup-time save:
 * the hook's cleanup runs as part of the React effect lifecycle, which
 * can race with the route change. By capturing the position at the
 * click handler we have an explicit, synchronous signal that the user
 * has committed to navigating away — and the value is provably the
 * scrollTop at that exact instant, not whatever the hook's last
 * debounced save recorded.
 *
 * The value is intentionally per-session and module-level — we only ever
 * need the most recent feed position, and the next PUSH to the feed
 * route will consume it.
 */
let capturedFeedScrollTop: number | null = null;

export function captureFeedScrollPosition(scrollTop: number): void {
  capturedFeedScrollTop = Math.max(0, scrollTop);
}

export function consumeFeedScrollPosition(): number | null {
  const value = capturedFeedScrollTop;
  capturedFeedScrollTop = null;
  return value;
}
