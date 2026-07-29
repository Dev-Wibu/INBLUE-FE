import { useEffect, useState } from "react";

/**
 * Returns a debounced version of `value` that only updates after
 * `delay` ms have elapsed since the last change.
 *
 * Used to throttle expensive effects (e.g. search queries) without
 * firing on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
