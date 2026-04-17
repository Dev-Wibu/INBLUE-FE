import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

interface UseDashboardScrollRestorationOptions {
  enabled?: boolean;
  maxEntries?: number;
}

export function useDashboardScrollRestoration(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseDashboardScrollRestorationOptions = {}
) {
  const { enabled = true, maxEntries = 100 } = options;
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef<Map<string, number>>(new Map());
  const entryKey = location.key || `${location.pathname}${location.search}`;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const positions = positionsRef.current;

    if (!container || !enabled) {
      return;
    }

    if (navigationType === "POP") {
      container.scrollTop = positions.get(entryKey) ?? 0;
    } else {
      container.scrollTop = 0;
    }

    return () => {
      positions.set(entryKey, container.scrollTop);

      if (positions.size > maxEntries) {
        const oldestKey = positions.keys().next().value;
        if (oldestKey) {
          positions.delete(oldestKey);
        }
      }
    };
  }, [containerRef, enabled, entryKey, maxEntries, navigationType]);
}
