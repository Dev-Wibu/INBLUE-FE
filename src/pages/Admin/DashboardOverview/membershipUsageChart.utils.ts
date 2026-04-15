import type { UserUsageRecord } from "@/interfaces";

export type MembershipPlanBucket = "FREE" | "NEW" | "BASIC" | "PREMIUM";

export interface MembershipUsageChartItem {
  [key: string]: string | number;
  plan: MembershipPlanBucket;
  label: MembershipPlanBucket;
  value: number;
  percentage: number;
  color: string;
}

const TRACKED_PLANS: MembershipPlanBucket[] = ["FREE", "NEW", "BASIC", "PREMIUM"];

const PLAN_COLORS: Record<MembershipPlanBucket, string> = {
  FREE: "#2563eb",
  NEW: "#a855f7",
  BASIC: "#16a34a",
  PREMIUM: "#f97316",
};

const normalizePlanName = (planName?: string | null): MembershipPlanBucket | null => {
  if (!planName) {
    return null;
  }

  const normalized = planName.trim().toUpperCase();
  if (
    normalized === "FREE" ||
    normalized === "NEW" ||
    normalized === "BASIC" ||
    normalized === "PREMIUM"
  ) {
    return normalized;
  }

  return null;
};

const resolvePlanName = (record: UserUsageRecord): string | null => {
  if (typeof record.planName === "string") {
    return record.planName;
  }

  if (typeof record.user?.membershipPlan?.name === "string") {
    return record.user.membershipPlan.name;
  }

  return null;
};

const isRecordActive = (record: UserUsageRecord): boolean => {
  if (typeof record.active === "boolean") {
    return record.active;
  }

  if (typeof record.isActive === "boolean") {
    return record.isActive;
  }

  return record.user?.isActive === true;
};

export const buildMembershipUsageChartData = (
  records: UserUsageRecord[]
): MembershipUsageChartItem[] => {
  const counts: Record<MembershipPlanBucket, number> = {
    FREE: 0,
    NEW: 0,
    BASIC: 0,
    PREMIUM: 0,
  };

  records.forEach((record) => {
    if (!isRecordActive(record)) {
      return;
    }

    const plan = normalizePlanName(resolvePlanName(record));
    if (!plan) {
      return;
    }

    counts[plan] += 1;
  });

  const total = TRACKED_PLANS.reduce((sum, plan) => sum + counts[plan], 0);

  return TRACKED_PLANS.map((plan) => {
    const value = counts[plan];
    return {
      plan,
      label: plan,
      value,
      percentage: total === 0 ? 0 : Number(((value / total) * 100).toFixed(1)),
      color: PLAN_COLORS[plan],
    };
  });
};
