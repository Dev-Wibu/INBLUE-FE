import { useEffect, useRef, useState } from "react";

export const getRemainingMs = (deadlineEpochMs: number, now = Date.now()) =>
  Math.max(0, deadlineEpochMs - now);

export function useEntryTestTimer(deadlineEpochMs: number, onExpire: () => void) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(deadlineEpochMs));
  const onExpireRef = useRef(onExpire);
  const didExpireRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    didExpireRef.current = false;
    const update = () => {
      const next = getRemainingMs(deadlineEpochMs);
      setRemainingMs(next);
      if (next === 0 && !didExpireRef.current) {
        didExpireRef.current = true;
        onExpireRef.current();
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [deadlineEpochMs]);

  return remainingMs;
}

export function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
