import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Restores the prior scroll position when the user navigates BACK (POP).
 *
 * react-router-dom's built-in <ScrollRestoration> requires a data router
 * (createBrowserRouter) — this project uses the classic <BrowserRouter>
 * + <Routes> pattern, so we re-implement the small bit we need.
 *
 * Forward navigation (PUSH / REPLACE) is handled by the existing
 * <ScrollToTop /> component. We only intervene on POP, where we restore the
 * scroll position previously saved under the destination's history key.
 *
 * Positions are keyed by `location.key` so each history entry has its own
 * slot, giving browser-style back/forward behaviour.
 */
export function ScrollRestorationLegacy() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Map<string, number>>(new Map());

  // Live-track scroll position so back-navigation lands exactly where the
  // user left off (and survives image loading / async layout shifts).
  useEffect(() => {
    const onScroll = () => {
      positions.current.set(location.key, window.scrollY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      // Persist the last known position before navigating away.
      positions.current.set(location.key, window.scrollY);
      window.removeEventListener("scroll", onScroll);
    };
  }, [location.key]);

  // On POP, restore; on PUSH / REPLACE, do nothing (ScrollToTop handles it).
  useEffect(() => {
    if (navigationType !== "POP") return;
    const saved = positions.current.get(location.key);
    // Defer to the next frame so the destination page has a chance to
    // render its layout before we attempt to scroll. Otherwise the
    // browser may snap back to 0 because the target container is still
    // empty.
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: saved ?? 0, left: 0, behavior: "auto" });
    });
  }, [location.key, navigationType]);

  return null;
}
