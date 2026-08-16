export function isFutureKioskSlot(startTime: string, now: Date = new Date()): boolean {
  const start = new Date(startTime);
  return Number.isFinite(start.getTime()) && start.getTime() > now.getTime();
}
